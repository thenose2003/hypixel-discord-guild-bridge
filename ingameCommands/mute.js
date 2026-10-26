const BaseCommand = require('./baseCommand.js');

const MUTE_MINUTES = 15;

class MuteCommand extends BaseCommand {

    constructor() {
        super('mute');
        this.gameOnly = true;
    }

    // "!mute <name>": 20% chance to guild-mute <name>, otherwise the author gets muted. Game chat only.
    execute = async (message, messageAuthor) => {
        let { username } = this.getArgs(message, messageAuthor);
        if (message.split(' ').length < 2) {
            this.sendReply(`${messageAuthor} put a name in silly >:)`)
            return
        }

        let num = Math.floor(Math.random() * 10);
        if (num <= 1 && username != 'everyone') {
            this.runCommand(`g mute ${username} ${MUTE_MINUTES}m`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.sendReply(`${messageAuthor} rolled a ${num} L ${username}`)
        } else {
            this.runCommand(`g mute ${messageAuthor} ${MUTE_MINUTES}m`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.sendReply(`${messageAuthor} rolled a ${num} gn`)
        }
    }
}

module.exports = new MuteCommand();
