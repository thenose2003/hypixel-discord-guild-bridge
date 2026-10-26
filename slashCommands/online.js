const { errorEmbed } = require('../helper/embeds');
const { n } = require('../helper/functions');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'online',
    description: 'Check the online members of the bots guild',
    options: [],
    async execute(discordClient, interaction) {
        if (minecraftClient?.player) {
            const onlineCommand = await readGuildOnline(minecraftClient);
            if (!onlineCommand) {
                return interaction.editReply({
                    embeds: [errorEmbed(null, '`/g online` timed out')],
                });
            }

            const totalMembers = onlineCommand.at(-3).split(':')[1].trim();
            const onlineMembers = onlineCommand.at(-2).split(':')[1].trim();
            const offlineMembers = onlineCommand.at(-1).split(':')[1].trim();

            let online = [];
            for (const [index, item] of Object.entries(onlineCommand)) {
                if (item.includes('-- ')) {
                    const nextLine = onlineCommand[parseInt(index) + 1];
                    if (nextLine) {
                        if (nextLine.includes('●')) {
                            online = online.concat(nextLine.split('●').map((item) => item.trim()));
                        }
                    }
                }
            }

            online = online.filter((item) => item);
            for (const item in online) {
                if (online[item].includes('[')) {
                    online[item] = online[item].split(' ')[1];
                }
            }

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Online Members')
                        .setColor('Blurple')
                        .setDescription(
                            n(`
                            Total Members: \`${totalMembers}\` / \`125\`
                            Online Members: \`${onlineMembers}\`
                            Offline Members: \`${offlineMembers}\`

                            **Online**:
                            ${online
                                .map((item) => {
                                    return `\`${item}\``;
                                })
                                .join(', ')}
                        `)
                        ),
                ],
            });
        } else {
            return interaction.editReply({
                embeds: [errorEmbed(null, 'Minecraft bot is currently not online')],
            });
        }
    },
};

// Sends /g online and collects the reply straight from the bot's chat (one line per message) until
// "Offline Members:" arrives, or gives up after `timeoutMs`
function readGuildOnline(bot, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const lines = [];
        const onMessage = (message) => {
            lines.push(...message.toString().split('\n').map((line) => line.trim()).filter(Boolean));
            const block = includesOnlineCommand(lines);
            if (block) finish(block);
        };
        const finish = (result) => {
            clearTimeout(timer);
            bot.removeListener('message', onMessage);
            resolve(result);
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        bot.on('message', onMessage);
        bot.chat('/g online');
    });
}

function includesOnlineCommand(array) {
    let includes = 0;
    for (const item of array) {
        if (
            item.includes('Guild Name:') ||
            item.includes('Total Members:') ||
            item.includes('Online Members:') ||
            item.includes('Offline Members:')
        ) {
            includes++;
        }
    }
    if (includes == 4) {
        const indexGuildName = array.findIndex((item) => item.includes('Guild Name:'));
        const indexOfflineMembers = array.findIndex((item) => item.includes('Offline Members:'));

        return array.slice(indexGuildName, indexOfflineMembers + 1);
    }
    return false;
}
