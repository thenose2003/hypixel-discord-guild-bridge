const BaseCommand = require('./baseCommand.js');

// "!rs": officers restart the bot (relies on Docker/a supervisor to start it again)
class RestartCommand extends BaseCommand {

    constructor() {
        super('rs');
        this.officerOnly = true;
    }

    execute = async (message, messageAuthor) => {
        console.log(`Restart requested by ${messageAuthor}`);
        process.exit(0);
    }
}

module.exports = new RestartCommand();
