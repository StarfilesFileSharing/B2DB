import * as crypto from 'crypto';
import * as state from './state.ts';
import Peers from './Peers';
import * as fs from 'fs';
import * as readline from 'readline';

type MessageCallback = (message: Buffer, connection: (message: string) => void) => void;

interface VerifiedInstruction {
    data: string;
    nonce: number;
    hash: string;
}

type Payload = {
    type: 'compareState'|'announce',
    blockNumber: number,
    mempoolTransactions: string[],
    block: VerifiedInstruction,
    tx: VerifiedInstruction
}

const onMessage: MessageCallback = (messageBuffer, callback) => {
    const message = messageBuffer.toString();
    console.log('Received message:', message)
    if(message.startsWith('{')){
        const myState = state.summary();
        const data: Payload = JSON.parse(message);
        console.log(data);
        if(data.type === 'compareState'){
            while(data.blockNumber < myState.blockNumber){
                data.blockNumber++;
                callback(JSON.stringify({ type: 'announce', block: JSON.parse(fs.readFileSync(`blocks/${data.blockNumber}.json`).toString()) }));
            }
            for(let i=0;i<myState.mempoolTransactions.length;i++){
                const tx = myState.mempoolTransactions[i];
                if(!data.mempoolTransactions.includes(tx))
                    callback(JSON.stringify({ type: 'announce', tx: JSON.parse(fs.readFileSync(`mempool/${tx}.json`).toString()) }));
            }
        }else if(data.type === 'announce'){
            if(data.block){
                console.log('Received a block');
                // TODO: Validate block
            }
            if(data.tx) fs.writeFileSync(`mempool/${data.tx.hash}`, JSON.stringify(data.tx));
        }
    }
};

const peers = new Peers(onMessage);

const hash_sha256 = (data: string): string => crypto.createHash('sha256').update(data).digest('hex');

const countLeadingZeros = (str: string): number => {
    const match = str.match(/^0*/);
    return match ? match[0].length : 0;
}
const proofOfWork = (data: string, difficulty: number) => {
    let nonce = 0;
    const target = '0'.repeat(difficulty);

    while (!hash_sha256(data + nonce).startsWith(target)) {
        nonce = Math.random();
    }

    return { data, nonce, hash: hash_sha256(data + nonce) };
};

const hashesForLeadingZeros = (leadingZeros: number): number => {
    const base = 16;
    const probabilityOfSuccess = 1 / Math.pow(base, leadingZeros);
    const probabilityOfFailure = 1 - probabilityOfSuccess;
    const numberOfHashes = Math.log(0.5) / Math.log(probabilityOfFailure);
    return Math.ceil(numberOfHashes);
}

const announceInstruction = (instruction: VerifiedInstruction) => {
    fs.writeFileSync(`mempool/${instruction.hash}.json`, JSON.stringify(instruction));
    peers.sendMessage(JSON.stringify({ type: 'announce', tx: instruction }));
}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

function prompt(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

let blockNumber = -1;
let lastBlockHash = '';
const mainnetTransactions: string[] = [];
const blocks = fs.readdirSync('blocks');
for(let i=0;i<blocks.length;i++){
    const block = blocks[i];
    if(block.startsWith('.')) continue;
    const blockContent = JSON.parse(fs.readFileSync(`blocks/${block}`).toString());
    const transactions = JSON.parse(blockContent.data).transactions;
    for(let j=0;j<transactions.length;j++){
        const transaction = transactions[j];
        mainnetTransactions.push(transaction.hash);
        state.updateState('mainnet', transaction);
    }
    lastBlockHash = blockContent.hash;
    blockNumber++;
}
state.states.mempool = state.states.mainnet;

(async()=>{
    while(true){
        peers.sendMessage(JSON.stringify(state.summary()));

        const successfulTransactions: VerifiedInstruction[] = [];

        console.log('Scanning for valid queries in mempool');
        let cumulativeHashes = 0;
        let transactionsFound = 1;
        while(transactionsFound > 0){
            transactionsFound = 0;
            const mempoolTransactions = fs.readdirSync('mempool')
                .filter(file => !file.startsWith('.'))
                .map(file => file.replace('.json', ''));
            for(let i=0;i<mempoolTransactions.length;i++){
                const transactionHash = mempoolTransactions[i];
                if(mainnetTransactions.includes(transactionHash)){
                    fs.rmSync(`mempool/${transactionHash}.json`);
                    continue;
                }
                const transactionContent = JSON.parse(fs.readFileSync(`mempool/${transactionHash}.json`).toString());
                let transactionAlreadyAccepted = false;
                for(let i=0;i<successfulTransactions.length;i++){
                    if(successfulTransactions[i].hash === transactionContent.hash)
                        transactionAlreadyAccepted = true;
                }
                if(transactionAlreadyAccepted) continue;
                try{
                    state.updateState('mempool', transactionContent);
                    successfulTransactions.push(transactionContent);
                    cumulativeHashes += hashesForLeadingZeros(countLeadingZeros(transactionContent.hash));
                    transactionsFound++;
                }catch(e){
                    continue;
                }
            }
        }

        if(cumulativeHashes > 100000){
            console.log('Building Block');
            const block = proofOfWork(JSON.stringify({transactions: successfulTransactions, prev: lastBlockHash}), 5);
            blockNumber++;
            peers.sendMessage(JSON.stringify({ type: 'announce', block }));
            fs.writeFileSync(`blocks/${blockNumber}.json`, JSON.stringify(block));
            lastBlockHash = block.hash;
            console.log(`Block ${blockNumber} has been built`);
            for(let i=0;i<successfulTransactions.length;i++){
                fs.rmSync(`mempool/${successfulTransactions[i].hash}.json`);
            }

            if(blockNumber === 0) console.log("\nYou have built the first block in the B2DB blockchain. Re-run the script to see the database contents.");
        }else{
            console.log(`Not enough cumulative hashes to create block: ${cumulativeHashes}/100000`);
        }

        // Start Demo
        console.log("Mainnet State:", state.states.mainnet);
        console.log("Files Table:", state.states.mainnet.files?.state);
        console.log('Not sure what to write? Try these:');
        console.log("  INSERT INTO files (name, sha256_hash) VALUES ('app.ipa', 'xxxxxxxx')");

        const input = await prompt('Query: ');
        const startTime = +new Date();
        announceInstruction(proofOfWork(input, 5));
        console.log(`PoW took ${(+new Date() - startTime)/1000} Seconds`)
        // End Demo
    }
})();