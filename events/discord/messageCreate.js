const { MessageType } = require('discord.js');
const config = require('../../config.json');
const { formatMentions } = require('../../helper/functions.js');
const messagesReactionCache = new Map();
const fs = require('fs');
const { dispatchCommand } = require('../../helper/commandDispatcher.js');
const { isOfficerDiscordId } = require('../../helper/officers.js');
const { sendBridgeMessage, REASON_TEXT, MAX_PARTS } = require('../../helper/outgoingChat.js');

// Short-lived reply under a Discord message
async function notice(message, text) {
    const reply = await message.reply({ content: text, allowedMentions: { repliedUser: false } }).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
}

const webhooks = [
    "1196140442190876803",
    "1260658904858366053",
    "1260658907127353528"
]
const otherBridge = [
   "1196140442190876803"
]

module.exports = {
    execute: async (discordClient, message) => {
        if (otherBridge.includes(message.author.id)) {
            let splitMessage = message.attachments.first().description.split(' ') ?? ''
            let index = message.attachments.first().description.indexOf(':') ?? 0
            let sentMsg = message.attachments.first().description.substring(index + 2) ?? ''
            let messageAuthor = splitMessage[2]?.includes('[') ? splitMessage[3]?.replace(':', '') : splitMessage[2]?.replace(':', '');
            //let authorRank = splitMessage[2]?.includes('[') ? splitMessage[4]?.replace(':', '') : splitMessage[3]?.replace(':', '');
            //console.log(`/gc ${JSON.stringify(JSON.stringify(message.attachments.first()))}`)
            sendBridgeMessage('/gc', messageAuthor, sentMsg);
            return
        }

        if ((message.author.bot && !webhooks.includes(message.author.id)) || message.content === '') return;


        if (message.content.startsWith('\\')) {
            message.content = message.content.substring(1);
        }

        if (message.channelId === config.channels.ingameChatLog) {
            return minecraftClient.chat(message.content);
        } else if (message.channelId === config.channels.guildIngameChat || message.channelId === config.channels.officerIngameChat) {
            const command = message.channelId === config.channels.officerIngameChat ? '/oc' : '/gc';
            const linkedPlayers = JSON.parse(fs.readFileSync('./data/guildLinks.json'));
            let playerRank;
            if (linkedPlayers[message.author.id]) {
                const linkUsernames = JSON.parse(fs.readFileSync('./data/guildLinkUsernames.json'));
                const allRanks = JSON.parse(fs.readFileSync('./data/guildRanks.json'));
                playerRank = allRanks[linkedPlayers[message.author.id]];

                if (linkUsernames[message.author.id]) {
                    message.author.username = linkUsernames[message.author.id];
                }
            }
            /*if (playerRank) {
                if (message.member.nickname) {
                    message.member.nickname += ` [${playerRank}]`;
                } else {
                    message.author.username += ` [${playerRank}]`;
                }
            }*/
            let messagePrefix = `${command} ${message.member?.nickname ?? message.author.username}: `;
            if (message.type === MessageType.Reply) {
                const repliedUser = message.mentions.repliedUser;
                if (repliedUser.id === discordClient.user.id) {
                    const mentionedChannel = discordClient.channels.cache.get(message.reference.channelId);
                    if (mentionedChannel) {
                        const mentionedMessage = await mentionedChannel.messages.fetch(message.reference.messageId);
                        const [attachment] = mentionedMessage.attachments.values();
                        if (attachment?.name) {
                            messagePrefix = `${command} ${message.member?.nickname ?? message.author.username} replied to ${attachment.name.slice(0, -4)}: `;
                            messagesReactionCache.set(mentionedMessage);
                        }
                    }
                } else {
                    messagePrefix = `${command} ${message.member?.nickname ?? message.author.username} replied to ${message.mentions.members.first()?.nickname ?? repliedUser.username}: `;
                }
            }

            message.content = await formatMentions(discordClient, message.content);
            message.content = message.content.replace(/\n/g, ' ');

            // Send bridge message in game: safety-filtered, split over up to 4 lines
            const author = messagePrefix.slice(command.length + 1, -2);
            const sent = sendBridgeMessage(command, author, message.content);
            if (!sent.ok) {
                message.react('🚫').catch(() => {});
                notice(message, `Not sent to Minecraft: ${REASON_TEXT[sent.reason] || sent.reason}.`);
            } else {
                if (sent.truncated) notice(message, `This message was too long. Sending only the first ${MAX_PARTS} lines.`);
                // The echo of the first line confirms delivery (see react() and events/minecraft/message.js)
                const echo = sent.lines[0].substring(command.length + 1);
                if (config.options.messageSentConfirmation.failedReactions) {
                    messagesReactionCache.set(echo, message);
                    setTimeout(() => {
                        if (messagesReactionCache.get(echo)) {
                            react(echo, '⛔');
                        }
                    }, 1000 * 3);
                }
            }

            // Bot commands work the same as in game; the author is the linked IGN when linked
            dispatchCommand(message.content, message.author.username, {
                fromDiscord: true,
                isOfficer: isOfficerDiscordId(message.author.id),
                discordClient,
                discordMember: message.member,
            });
        }

        async function react(messageSent, reaction) {
            if (config.options.messageSentConfirmation.checkmarkReactions || config.options.messageSentConfirmation.failedReactions) {
                let message = messagesReactionCache.get(messageSent);
                if (!messageSent) {
                    message = Array.from(messagesReactionCache)?.[(messagesReactionCache?.size || 0) - 1]?.[1];
                }
                if (message) {
                    if (
                        (config.options.messageSentConfirmation.checkmarkReactions && reaction === '✅') ||
                        (config.options.messageSentConfirmation.failedReactions && reaction === '⛔')
                    ) {
                        message.react(reaction);
                    }
                    messagesReactionCache.delete(messageSent);
                }
            }
        }

        module.exports = {
            react,
        };
    },
};
