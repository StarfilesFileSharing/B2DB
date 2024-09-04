# B2DB - Big Distributed Database
Using the technology behind bitcoin, without financialisation, to power P2P SQL databases.

Built in Typescript using WebRTC.

Standard APIs involve:
```
Client -> API -> Database
```

B2DB proposes:
```
Database(Clients)
```

## Table of Contents
- [Features](#features)
- [Explanation](#explanation)
- [FAQ](#faq)

## Features
- Free database hosting
- SQL compatible queries
- P2P, hosted by your users
- Runs in any environment that supports WebRTC
- Blockchain with 0 fees
- Distributed around the world with redundancy

## Explanation
Instead of a client sending an HTTP request to an API, they complete PoW challenge (of any difficulty), for each database write (e.g insert/update). Once PoW has been complete, the transaction is announced to the mempool.

Once a cumulative PoW difficulty of `n` has been reached, transactions can then be bundled into a block. The cumulative difficulty is simply an estimate of how many hashes are required for a 50% chance of finding a match.

To determine the cumulative Proof of Work (PoW) difficulty `n` needed for bundling transactions into a block, we follow these steps:

1. Each database write (e.g. `INSERT`) requires PoW with a difficulty level chosen by the client.
2. For `N` difficulty (leading 0s in PoW hash), the probability of a single hash meeting this requirement is `1 / 16^N`.
3. The probability of a single hash not meeting the requirement is `1 - (1 / 16^N)`.
4. To estimate the number of hashes needed for a 50% chance of finding a block (`n`), we use the formula: `log(0.5) / log(1 - (1 / 16^N))`.

Each blockchain can have a custom cumulative difficulty set based on how many read/write's per second they get and the computing power of all nodes.

## FAQ

### How does this work?
Using the same settlement/consensus technology as the Bitcoin network, B2DB powers P2P databases.

In order to understand how B2DB works, you must understand that at it's core, Bitcoin is just a spreadsheet of balance changes. The Bitcoin network is a series of nodes & miners that agree to a series of rules about what rows are accepted into the spreadsheet. Thinking in this frame of mind, you can picture Bitcoin as a CSV with 3 columns (from, to, amount).

B2DB extends this concept by allowing for custom table schemas to be added. You can create a table by running the `CREATE TABLE` query. You can then insert into your table and query it the same way you would a normal SQL database. Once enough SQL queries have been submitted, they can then be bundled into a block.

### Is this a cryptocurrency? Are you selling a coin?
NO! This is not a cryptocurrency. B2DB uses the technical innovations behind Bitcoin, removes all financial aspects, and provides a database instead.

### How is the data stored?
Nodes store a copy of blocks, which each contain a history of executed SQL queries. Nodes then build the database structure in-memory. 

### Who stores the data and why?
This ultimately depends on your use-case. Anyone can run a node and host the database history. For large sites, you can host your own dedicated B2DB blockchain and not have to host anything as your users do the heavy lifting. For smaller sites, you would need to pool B2DB blockchains with other sites for higher redundancy. If you need guarunteed availability, the best way to acheive this is by hosting a node yourself too.

### How do we prevent spam?
PoW. Each blockchain can have custom parameters as to the amount of work required to get a query accepted into the chain. If you experience throughput higher than your nodes can handle, you can increase your PoW difficulty.

### How do I know the database hasn't been tampered with?
Using the same cryptography as Bitcoin, we can verify the contents of the database.

### What about sensitive info?
If you need to receive information only trusted parties can access, it is recommended you encrypt data before submitting to the database, using PGP or something similar.

### How fast is it?
Reads are nearly instant as the state is stored in memory. Writes require a variable PoW difficulty which can take anything from milliseconds to minutes depending on the use-case. Some applications may opt for faster PoW challenges, while others may opt for slower ones.

It is also safe to consider a transaction final with 0 confirmations, as-long as it reaches other requirements to eventually settle into the blockchain. This means even with a high block time (defined by cumulative difficulty), transactions can be considered complete once announced.

### How is zero fees possible and what are miner incentives?
It's important to understand why fees are the standard with existing blockchains, before answering this question.

Bitcoin has 2 main stakeholders; users, and miners. To secure Bitcoin, PoW mining is required, it doesn't matter who does it, as long as it's done. Because it's not a good user experience to be forced to mine a block each time you want to submit a transaction, the task of PoW is outsourced to specialised "miners", with bitcoin being paid as the fee.

Because B2DB doesn't have a coin to pay fees in, there is no incentive for anyone to specialise in mining. Also, because of the use-case of 90% of database applications, paying a fee for each write is definitely not the right path. Therefore, we cut out the middle man. B2DB has no specialised miners, instead, users are forced to do PoW before writing to the database. Because of this, mining power is decentralised.

### What is the block limit?
B2DB has no official block limit, although individual blockchains can enable one. Instead B2DB follows a PoW limit, with each blockchain requiring a unique amount of minimum cumulative difficulty (read [Explanation](#explanation)) to assemble a block.

### Who builds the blocks?
Because each transactions is mined independantly, the question arises of how blocks are arranged. When a client mines (not signs) their transaction, they submit it to the mempool. When enough cumulative hashes are in the mempool, the next node to mine a transaction, also attaches the entire mempool to theirs. This transaction is now a block.

### How does ownership/permissions work?
There are none. Anyone can write to anything. If special permissions are required, client side validation must be written.

### What if my blockchain get's bloated?
You can move. Because anyone can write to any database, and nothing can be deleted, it is inevitable that your database will become too big. Because B2DB has financial aspect and just stores information, you can quickly create a new blockchain, copy pruned data over, and start fresh.

### How does table schema and indexes work?
Although B2DB supports SQL queries, the database itself is NoSQL. Tables aren't created manually, instead they're created on the first `INSERT`. There is no table schema and each row can contain any column. If schema is required, validate client side if the column exists and matches your requirements.

### What about DELETE/REPLACE/SELECT/UPDATE/etc
Querying the database (`SELECT`) is instead done by accessing the `state` object. Deleting/overwriting information from the database (`DELETE`/`UPDATE`/`REPLACE`) is not possible as blockchains are write only. A row can't be touched after being created. Instead, to delete, you must set deleted=true, and setup a client-side implementation. And for replace/update, you must set a client side implementation for row preference, such as a priority column.