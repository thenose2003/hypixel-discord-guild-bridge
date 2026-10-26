const fs = require('fs');

module.exports = (discordClient) => {
    fs.readdirSync('./events/discord')
        .filter((file) => file.endsWith('.js'))
        .forEach((file) => {
            const event = require(`../events/discord/${file}`);
            const name = file.split('.')[0];
            // discord.js v14 renamed 'ready' to 'clientReady'; the file keeps its old name because other modules require it
            discordClient.on(name === 'ready' ? 'clientReady' : name, event.execute.bind(null, discordClient));
        });
};
