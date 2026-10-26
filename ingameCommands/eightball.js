const BaseCommand = require('./baseCommand.js');

// Ported from treeot/hypixel-chat-bridge (MIT)
const ANSWERS = [
    'It is certain.',
    'Without a doubt.',
    'You may rely on it.',
    'Yes, definitely.',
    'It is decidedly so.',
    'As I see it, yes.',
    'Most likely.',
    'Outlook good.',
    'Signs point to yes.',
    'Reply hazy, try again.',
    'Ask again later.',
    'Better not tell you now.',
    'Cannot predict now.',
    'Concentrate and ask again.',
    "Don't count on it.",
    'My reply is no.',
    'My sources say no.',
    'Outlook not so good.',
    'Very doubtful.',
];

class EightBallCommand extends BaseCommand {

    constructor() {
        super('8ball', ['eightball']);
    }

    execute = async (message, messageAuthor) => {
        const question = message.split(' ').slice(1).join(' ').trim();
        if (!question) return this.sendReply(`${messageAuthor} ask a question!`);
        this.sendReply(`${messageAuthor} (8ball) ${ANSWERS[Math.floor(Math.random() * ANSWERS.length)]}`);
    }
}

module.exports = new EightBallCommand();
