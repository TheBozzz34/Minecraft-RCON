# Yet another RCON (Remote Console) Connection Library

The RCON protocol facilitates remote interaction with a server via its console interface. This Node.js library establishes a connection to an RCON server, authenticates using a password, and sends commands to the server.

## Installation

To install the RCON library, follow these steps:

Clone the Repository:

```bash

git clone https://github.com/TheBozzz34/minecraft-rcon.git
```
Install Dependencies:

```bash
npm install yamrc
```
Usage Example

```javascript
const Rcon = require('yamrc').Rcon;

// Initialize RCON connection
const rconClient = new Rcon('server_address', rcon_port, rcon_password);

// Connect to the server and run the "list" command
async function main() {
    await rconClient.connect()
    console.log(await rconClient.send('list'))
    await rconClient.disconnect()
}
main()
```
## API Reference
`Rcon(host: string, port: number, password: string)`

Parameters:
- host: The host address of the RCON server.
- port: The port number for the RCON connection.
- password: The password required for RCON authentication.

Methods
```
connect(): Promise<void>
    Establishes a connection to the RCON server.

disconnect(): Promise<void>
    Closes the connection to the RCON server.

send(command: string): Promise<any>
    Sends a command to the RCON server.
    command: The command string to be sent.

isAuthenticated()
    Returns the auth status of the rcon connection

isConnected()
    Returns whether the socket is connected or not
```

Notes
- Ensure the server address, port, and RCON password are correctly provided.
- This library uses promises for asynchronous operations.
- Commands can be sent only after successful authentication.
