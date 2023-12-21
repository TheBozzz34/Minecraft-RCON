"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rcon = void 0;
const net_1 = __importDefault(require("net"));
var crypto = require('crypto');
// RCON protocol constants
const SERVERDATA_AUTH = 3;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_EXECCOMMAND_RESPONSE = 0;
class Rcon {
    constructor(host, port, password) {
        this.host = host;
        this.port = port;
        this.password = password;
        this.callbacks = new Map();
        this.authenticated = false;
        this.socket = new net_1.default.Socket();
        this.id = this.randInt32();
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
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
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.socket.end(() => {
                    resolve();
                });
            });
        });
    }
    send(command) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    auth(password) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const id = this.id++;
                this.callbacks.set(id, (packet) => {
                    if (packet.id === id) {
                        console.log('Authentication successful');
                        this.authenticated = true;
                        resolve();
                    }
                    else if (packet.id === -1) {
                        console.log('Authentication failed: Wrong password');
                        reject('Authentication failed: Wrong password');
                    }
                    else {
                        console.log('Authentication failed: Unexpected response ID');
                        reject('Authentication failed: Unexpected response ID');
                    }
                });
                const buffer = this.createBuffer(id, SERVERDATA_AUTH, password);
                this.socket.write(buffer);
            });
        });
    }
    createBuffer(id, type, body) {
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
    read(packet) {
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
        }
        else {
            throw new Error(`Invalid packet! [${packet}]`);
        }
    }
    randInt32() {
        return Math.floor(Math.random() * 0xFFFFFFFF) | 0; // Use bitwise OR to limit to 32-bit range
    }
}
exports.Rcon = Rcon;
