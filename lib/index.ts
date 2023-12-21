import net from 'net';
/**
 * Represents a remote console (RCON) connection to interact with a server.
 */
export class Rcon {
    // Private properties
    private socket: net.Socket;
    private id: number;
    private callbacks: Map<number, (packet: any) => void> = new Map();
    private authenticated: boolean = false;

    /**
     * Creates an instance of Rcon.
     * @param host - The host address of the server.
     * @param port - The port number to connect to.
     * @param password - The RCON password for authentication.
     */
    constructor(private host: string, private port: number, private password: string) {
        this.socket = new net.Socket();
        this.id = this.randInt32();
    }

    /**
     * Establishes a connection to the RCON server.
     * @returns A promise that resolves when the connection is established successfully.
     * @throws Rejects with an error if the connection fails.
     */
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

                if (packet.id === -1) {
                    console.log('Authentication failed: Wrong password');
                    reject('Authentication failed: Wrong password');
                    return;
                }
                const callback = this.callbacks.get(packet.id);
                if (callback) {
                    callback(packet);
                    this.callbacks.delete(packet.id);
                }
            });
        });
    }

    /**
     * Closes the connection to the RCON server.
     * @returns A promise that resolves when the connection is closed.
     */
    public async disconnect() {
        return new Promise<void>((resolve, reject) => {
            this.socket.end(() => {
                resolve();
            });
        });
    }

    /**
     * Sends a command to the RCON server.
     * @param command - The command string to be sent.
     * @returns A promise that resolves with the response from the server.
     * @throws Rejects with an error if authentication is required before sending commands.
     */
    public async send(command: string) {
        return new Promise((resolve, reject) => {

            // Check if we are authenticated before sending commands
            if (!this.authenticated) {
                reject('Authentication required before sending commands.');
                return;
            }

            // Generate a unique ID for the command and add a callback to the map
            const id = this.id++;
            this.callbacks.set(id, (data) => {
                resolve(data);
            });

            // Create a buffer with the command and send it to the server
            const buffer = this.createBuffer(id, 2, command);
            this.socket.write(buffer);
        });
    }

    // Private methods

    /**
     * Performs authentication with the RCON server using the provided password.
     * @param password - The RCON password for authentication.
     * @returns A promise that resolves when authentication is successful.
     * @throws Rejects with an error if authentication fails.
     */
    private async auth(password: string) {
        return new Promise<void>((resolve, reject) => {
            const id = this.id++;
            this.callbacks.set(id, (packet) => {
                if (packet.id === id) {
                    console.log('Authentication successful');
                    this.authenticated = true;
                    resolve();
                } else {
                    // Need to fix this, will never happen
                    console.log('Authentication failed: Unexpected response ID');
                    reject('Authentication failed: Unexpected response ID');
                }
            });

            // Create a buffer with the password and send it to the server
            const buffer = this.createBuffer(id, 3, password);
            this.socket.write(buffer);
        });
    }

    /**
     * Creates a buffer to be sent over the socket.
     * @param id - The packet ID.
     * @param type - The packet type.
     * @param body - The content/body of the packet.
     * @returns A buffer containing the formatted packet.
     */
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

    /** 
     * Reads a packet received from the server.
     * @param packet - The packet buffer received from the server.
     * @returns An object representing the parsed packet.
     * @throws Error if the packet is invalid.
     * @author github.com/tehbeard
     */
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

    /**
     * Generates a random 32-bit integer for use as the initial packet ID.
     * @returns A random 32-bit integer.
     */
    private randInt32() {
        return Math.floor(Math.random() * 0xFFFFFFFF) | 0; // Use bitwise OR to limit to 32-bit range
    }
}

