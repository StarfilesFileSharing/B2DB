import * as crypto from 'crypto';
import * as fs from 'fs';

interface VerifiedInstruction {
    data: string;
    nonce: number;
    hash: string;
}

interface StateObject {

}

interface Table {
    state: StateObject[];
    actions: string[];
}

interface States {
    [key: string]: {
        [tableName: string]: Table;
    };
}


const hash_sha256 = (data: string): string => crypto.createHash('sha256').update(data).digest('hex');

export const states: States = {
    'mempool': {},
    'mainnet': {}
};

export function getState(of: string){
    return states[of];
}

export function resetState(of: string){
    states[of] = {};
}

export function updateState(of: string, verifiedInstruction: VerifiedInstruction, test: boolean = false){
    const instruction = verifiedInstruction.data;
    const nonce = verifiedInstruction.nonce;
    const hash = verifiedInstruction.hash;

    if(hash_sha256(instruction + nonce) !== hash) throw new Error('Invalid hash')
    // TODO: Validate PoW to ensure difficulty is correct

    let tableName;
    if(instruction.startsWith('INSERT INTO')){
        let unparsedInstruction = instruction.replace('INSERT INTO ', '');
        tableName = unparsedInstruction.split(' ')[0];
        if(typeof states[of][tableName] === "undefined") states[of][tableName] = {state: [], actions: []};
        unparsedInstruction = unparsedInstruction.replace(tableName, '');
        let columns = unparsedInstruction.split('VALUES')[0].trim();
        unparsedInstruction = unparsedInstruction.replace(columns, '');
        let values = unparsedInstruction.replace('VALUES', '').trim();

        const obj = Object.fromEntries(columns.slice(1, -1).split(', ').map((k, i) => [k, values.slice(1, -1).split(', ')[i].slice(1, -1)]));

        if(!test) states[of][tableName]['state'].push(obj);
    }else throw new Error('Unknown instruction');

    if(tableName)
        states[of][tableName]['actions'].push(hash);
    return true;
}

type CompareState = {
    type: 'compareState',
    blockNumber: number,
    mempoolTransactions: string[]
}
export function summary(): CompareState {
    return {
        type: 'compareState',
        blockNumber: Math.max(
            ...fs.readdirSync('blocks')
                .filter(file => !file.startsWith('.') && file.endsWith('.json'))
                .map(file => parseInt(file.replace('.json', ''), 10))
        ),
        mempoolTransactions: fs.readdirSync('mempool')
            .filter(file => !file.startsWith('.'))
            .map(file => file.replace('.json', ''))
    };
}