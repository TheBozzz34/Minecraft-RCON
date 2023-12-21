import net from 'net';
var crypto = require('crypto');

// RCON protocol constants
const SERVERDATA_AUTH = 3;
const SERVERDATA_EXECCOMMAND = 2;




export class Rcon {
    private socket: net.Socket;
    private id: number;
    private callbacks: Map<number, (packet: any) => void> = new Map();
    
    private authenticated: boolean = false;

    constructor(private host: string, private port: number, private password: string) {
        this.socket = new net.Socket();
        this.id = this.randInt32();
    }

    public async connect() {
        return new Promise<void>((resolve, reject) => {
            this.socket.connect(this.port, this.host, () => {
                console.log('Connected to RCON server, authenticating...');
                this.auth(this.password).then(() => resolve()).catch(err => reject(err));
            });
            this.socket.on('error', (err) => {
                reject(err);
            });
            this.socket.on('data', (data) => {
                const packet = this.read(data);
                const callback = this.callbacks.get(packet.id);
                if (callback) {
                    callback(packet);
                    this.callbacks.delete(packet.id);
                }
            });
        });
    }

    public async disconnect() {
        return new Promise<void>((resolve, reject) => {
            this.socket.end(() => {
                resolve();
            });
        });
    }

    public async send(command: string) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                reject('Authentication required before sending commands.');
                return;
            }
            const id = this.id++;
            this.callbacks.set(id, (data) => {
                resolve(data);
            });
            const buffer = this.createBuffer(id, SERVERDATA_EXECCOMMAND, command);
            this.socket.write(buffer);
        });
    }

    private async auth(password: string) {
        return new Promise<void>((resolve, reject) => {
            const id = this.id++;
            this.callbacks.set(id, (packet) => {
                if (packet.id === id) {
                    console.log('Authentication successful');
                    this.authenticated = true;
                    resolve();
                } else if (packet.id === -1) {
                    console.log('Authentication failed: Wrong password');
                    reject('Authentication failed: Wrong password');
                } else {
                    console.log('Authentication failed: Unexpected response ID');
                    reject('Authentication failed: Unexpected response ID');
                }
            });
            const buffer = this.createBuffer(id, SERVERDATA_AUTH, password);
            this.socket.write(buffer);
        });
    }

    private createBuffer(id: number, type: number, body: string) {
        const bodyBuffer = Buffer.from(body, 'utf8');
        const buffer = Buffer.alloc(14 + bodyBuffer.length);
        buffer.writeInt32LE(10 + bodyBuffer.length, 0);
        buffer.writeInt32LE(id, 4);
        buffer.writeInt32LE(type, 8);
        buffer.write(body, 12, 'utf8');
        buffer.writeInt8(0, 12 + bodyBuffer.length);
        buffer.writeInt8(0, 13 + bodyBuffer.length);
        return buffer;
    }

    private read(packet: Buffer) {
        // Length of the rest of the packet
        const length = packet.readInt32LE(0);
        // Check if we have a valid packet with 2 null bytes of padding in the end
        if (packet.length === 4 + length && !packet.readInt16LE(packet.length - 2)) {
            // Offsets are hardcoded for speed
            return {
                length: length,
                id: packet.readInt32LE(4),
                type: packet.readInt32LE(8),
                payload: packet.toString('ascii', 12, packet.length - 2)
            };
        } else {
            throw new Error(`Invalid packet! [${packet}]`);
        }
    }

    private randInt32() {
        return Math.floor(Math.random() * 0xFFFFFFFF) | 0; // Use bitwise OR to limit to 32-bit range
    }
    

}

