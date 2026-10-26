const fs = require('fs');
const config = require('../config.json');
const BaseCommand = require('./baseCommand.js');

const MUTE_MINUTES = 15;

// discord user id -> linked IGN (from /link)
function getLinks() {
    return JSON.parse(fs.readFileSync('./data/guildLinkUsernames.json'));
}

async function getDiscordMembers(discordClient) {
    const guild = discordClient?.guilds.cache.get(config.discordServer);
    return guild ? await guild.members.fetch().catch(() => guild.members.cache) : null;
}

// Who to mute is { ign, member }: `ign` gets a guild mute in game, `member` a Discord timeout.

// An in-game player: their IGN, plus the Discord member linked to it (if any)
async function resolvePlayer(ign, discordClient) {
    const links = getLinks();
    const members = await getDiscordMembers(discordClient);
    const member = members?.find((m) => links[m.id]?.toLowerCase() === ign.toLowerCase());
    return { ign, member };
}

// A Discord user who sent the command: the member, plus their linked IGN (if any)
function resolveDiscordUser(member) {
    return { ign: member && getLinks()[member.id], member };
}

// A typed name: a linked IGN first, then a Discord username / display name / nickname.
// The typed name is always guild-muted too unless it matched a linked member (whose IGN is used instead).
async function resolveName(name, discordClient) {
    const lower = name.toLowerCase();
    const links = getLinks();
    const members = await getDiscordMembers(discordClient);
    const member =
        members?.find((m) => links[m.id]?.toLowerCase() === lower) ||
        members?.find((m) => [m.user.username, m.displayName, m.nickname].some((n) => n?.toLowerCase() === lower));
    return { ign: (member && links[member.id]) || name, member };
}

class MuteCommand extends BaseCommand {

    constructor() {
        super('mute');
    }

    // "!mute <name>": 20% chance to mute <name>, otherwise the author gets muted.
    // Works for in-game players (/g mute) and Discord members (timeout), from either chat.
    execute = async (message, messageAuthor, { fromDiscord = false, discordClient, discordMember } = {}) => {
        let { username } = this.getArgs(message, messageAuthor);
        if (message.split(' ').length < 2) {
            this.sendReply(`${messageAuthor} put a name in silly >:)`)
            return
        }
        const target = username.replace(/^@/, '');

        let num = Math.floor(Math.random() * 10);
        const won = num <= 1 && target.toLowerCase() != 'everyone';

        let loser;
        if (won) loser = await resolveName(target, discordClient);
        else if (fromDiscord) loser = resolveDiscordUser(discordMember);
        else loser = await resolvePlayer(messageAuthor, discordClient);

        await this.mute(loser);
        await new Promise(resolve => setTimeout(resolve, 1000))
        this.sendReply(won ? `${messageAuthor} rolled a ${num} L ${target}` : `${messageAuthor} rolled a ${num} gn`)
    }

    async mute({ ign, member }) {
        if (ign) this.runCommand(`g mute ${ign} ${MUTE_MINUTES}m`);
        if (member) {
            await member.timeout(MUTE_MINUTES * 60 * 1000, 'Lost a !mute roll').catch((e) => {
                console.error(`[mute] could not time out ${member.user.tag} on Discord: ${e.message}`);
            });
        }
    }
}

module.exports = new MuteCommand();
