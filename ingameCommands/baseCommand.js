const config = require('../config.json');


class BaseCommand {

    constructor(name, aliases = []) {
        this.name = name;
        this.aliases = aliases;
        // Only officers can see/run it (see helper/officers.js)
        this.officerOnly = false;
        // Only usable from game chat, never from the Discord bridge
        this.gameOnly = false;
    }

    // Exact match on the name, a code alias, or an alias from config.ingameCommands.alias
    triggers(key) {
        key = key.trim();
        if (this.name === key)
            return true;
        if (this.aliases.includes(key))
            return true;
        if (config.ingameCommands.alias?.[this.name]?.includes(key))
            return true;
        return false;
    }

    // Pattern match (e.g. prefixes like "pb"), only tried when no command triggers() on the key
    matches(key) {
        return false;
    }

    getArgs(message, author) {
        let parts = message.substring(config.ingameCommands.trigger.length).split(' ')
        return {
            username: parts[1] || author,
            profile: parts[2]
        }
    }

    sendReply(message) {
        console.log(message)
        minecraftClient.chat(`/gc @${message}`);
    }

    runCommand(message) {
        console.log(message)
        minecraftClient.chat(`/${message}`);
    }
}

module.exports = BaseCommand
