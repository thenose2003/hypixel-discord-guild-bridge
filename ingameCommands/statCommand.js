const config = require('../config.json');
const BaseCommand = require('./baseCommand.js');

// Parses "!stat [player] [rest...]" the way the old StatChecker did:
// everything lowercased, all dashes removed from the stat, player defaults to the author.
function parseStatArgs(message, author) {
    const parts = message.toLowerCase().split(' ');
    let stat = parts[0];
    if (stat.startsWith(config.ingameCommands.trigger)) stat = stat.substring(config.ingameCommands.trigger.length);
    stat = stat.replace(/-/g, '');

    let name = (parts.length > 1 ? parts[1] : author).toLowerCase();
    if (name == 'greg') name = 'DragonBoii';
    const full = parts.length > 1 ? parts.slice(1).join(' ') : '';

    // `words` keeps the original casing
    return { stat, name, full, parts, words: message.split(' '), author: author.toLowerCase() };
}

/**
 * A stat lookup command. `run` receives { stat, name, full, parts, words, author } and returns the
 * reply text, or null/undefined for no reply. Lookup failures are logged, never sent to chat.
 *
 * new StatCommand(['cata', 'catacombs'], async ({ name }) => ..., { match: (stat) => ..., matchPriority: 1 })
 * The first entry of `names` is the command name (and its config alias key), the rest are aliases.
 */
class StatCommand extends BaseCommand {
    constructor(names, run, { match, matchPriority = 100 } = {}) {
        const [name, ...aliases] = names;
        super(name, aliases);
        this.run = run;
        this.match = match;
        this.matchPriority = matchPriority;
    }

    matches(key) {
        return this.match ? this.match(key) : false;
    }

    async execute(message, messageAuthor) {
        try {
            const reply = await this.run(parseStatArgs(message, messageAuthor));
            if (reply != null) this.sendReply(reply);
        } catch (e) {
            console.error(`[${this.name}] ${e?.stack || e}`);
        }
    }

    sendReply(message) {
        minecraftClient.chat(`/gc @Stats: ${message}`);
    }
}

module.exports = StatCommand;
