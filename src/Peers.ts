import Hyperswarm from 'hyperswarm';
import { Buffer } from 'buffer';
import * as state from './state';

type MessageCallback = (message: Buffer, connection: (message: string) => void) => void;

export default class Peers {
  private swarm: Hyperswarm;
  private discoveryKey: Buffer;
  private onMessage: MessageCallback;
  private startTime: number;

  constructor(onMessage: MessageCallback) {
    this.swarm = new Hyperswarm();
    this.discoveryKey = Buffer.from("b2db0000000000000000000000000000000000000000000000000000ffff0001", 'hex');
    this.onMessage = onMessage;
    this.startTime = Date.now();
    this.setup();
  }

  private setup() {
    console.log('Announcing to B2DB Shard:', this.discoveryKey.toString('hex'));
    this.swarm.join(this.discoveryKey);
    
    this.swarm.on('connection', (connection) => {
      console.log(`New connection established after ${((Date.now() - this.startTime) / 1000).toFixed(2)} seconds`);

      this.sendMessage(JSON.stringify(state.summary()));
      
      const respond = (message: string) => {
        connection.write(Buffer.from('Acknowledged: ' + message.toString()));
      }
      connection.on('data', (data) => this.onMessage(data, respond));
    });

    this.swarm.on('error', (err) => console.error('Swarm error:', err));
  }

  public sendMessage(message: string) {
    this.swarm.connections.forEach((conn) => conn.write(Buffer.from(message)));
    console.log(`Message sent to ${this.swarm.connections.length} nodes`);
  }
}
