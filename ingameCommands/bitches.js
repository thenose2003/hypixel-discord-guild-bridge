const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class BitchesCommand extends BaseCommand {

    constructor() {
        super('bitches');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        let bitches = 0;
        this.sendReply(`${username} has ${Math.floor(Math.random() * 10000)} bitches`)
    }
}

module.exports = new BitchesCommand();
