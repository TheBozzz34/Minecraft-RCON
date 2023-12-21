const Rcon = require("../lib/index").Rcon;

async function main() {
    try {
        const rconClient = new Rcon('10.0.0.150', 25575, 'blah');
        await rconClient.connect();
        const response = await rconClient.send('list');
        console.log(response);
        await rconClient.disconnect();
    } catch (err) {
        console.error(err);
    }
}

main();