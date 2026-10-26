const StatCommand = require('./statCommand.js');
const { getJsonFromUrl, getGuildData, getGuildByGuildName, getUsernameFromUUID } = require('../helper/skyblockApi.js');
const { dot, shortenDot } = require('../helper/skyblockStats.js');

const guildExp = new StatCommand(['gexp'], async ({ name }) => {
    const data = await getGuildData(name);
    const member = data.guild.members.find((m) => m.uuid == data.uuid);
    const gexp = Object.values(member?.expHistory || {}).reduce((sum, xp) => sum + xp, 0);
    return `${data.username} has a total of ${dot(gexp)} gexp in the last 7 days`;
});

const guild = new StatCommand(['guild'], async ({ name }) => {
    const data = await getGuildData(name);
    if ('guild' in data && data.guild != null) return `${data.username} is in the guild ${data.guild.name}`;
    return `${data.username} is not in a guild`;
});

// "!membercount <guild name>"
const memberCount = new StatCommand(['membercount', 'mc'], async ({ full }) => {
    const data = await getGuildByGuildName(full);
    return `There are ${data.guild.members.length} members in the guild ${data.guild.name}`;
});

// "!gexplb <guild name> [page]": weekly guild exp leaderboard of a guild, 5 per page
const guildExpLeaderboard = new StatCommand(['gexplb', 'explb', 'xplb'], async ({ full }) => {
    let splits = full.split(' ');
    let page = 1;
    let guildName = full;
    let num = splits.pop();
    if (!isNaN(num)) {
        page = Math.max(1, num);
        guildName = splits.join(' ');
    }
    const data = await getGuildByGuildName(guildName);
    let guildMembers = data.guild.members.map((member) => ({ name: member.uuid, gexp: Object.values(member.expHistory).reduce((a, b) => a + b) }));
    guildMembers.sort((a, b) => b.gexp - a.gexp);
    let output = '';
    for (let index = 0; index <= 4; index++) {
        let i = (page - 1) * 5 + index;
        output += (guildMembers.length > i ? `#${i + 1}: ${await getUsernameFromUUID(guildMembers[i].name)} (${dot(guildMembers[i].gexp)})` : '') + ' ';
    }
    return output;
});

// "!glb [weight|skills|slayer|dungeons] [page]": guild leaderboard from senither
const guildLeaderboard = new StatCommand(['guildlb', 'glb', 'guildleaderboard'], async ({ full }) => {
    let parts = full.split(' ');
    let page = 1;
    let category = 'weight';
    if (parts.length > 0) {
        if (!isNaN(parts[0])) {
            page = Math.max(1, parts[0]);
        } else {
            switch (parts[0]) {
                case 'sa':
                case 'skill':
                case 'skills':
                case 'average':
                case 'avg':
                    category = 'skills';
                    break;
                case 'slayer':
                case 'slayers':
                    category = 'slayer';
                    break;
                case 'catacombs':
                case 'catacombsxp':
                case 'cataxp':
                case 'cata':
                case 'dung':
                case 'dungeons':
                    category = 'dungeon';
                    break;
            }
            if (parts.length > 1 && !isNaN(parts[1])) {
                page = Math.max(parts[1]);
            }
        }
    }
    const data = await getJsonFromUrl('https://hypixel-app-api.senither.com/leaderboard/');
    let getCategory = (data) => {
        switch (category) {
            case 'skills':
                return data.average_skill_progress;
            case 'slayer':
                return data.average_slayer;
            case 'dungeon':
                return data.average_catacomb;
            default:
                return data.weight.total;
        }
    };
    let sorted = data.data.filter((a) => a.members >= 5).sort((a, b) => getCategory(b) - getCategory(a));
    let result = '';
    for (let i = (page - 1) * 5; i < page * 5; i++) {
        if (i < sorted.length) result += `#${i + 1}: ${sorted[i].name} (${shortenDot(getCategory(sorted[i]))}) `;
    }
    return result;
});

// "!games <guild name>": share of guild exp per game
const games = new StatCommand(['games'], async ({ full }) => {
    const data = await getGuildByGuildName(full);
    if (data == null) return;
    const expByGame = data.guild.guildExpByGameType;
    let sorted = Object.keys(expByGame).sort((a, b) => expByGame[b] - expByGame[a]);
    let total = Object.values(expByGame).reduce((a, b) => a + b);
    let fixGameName = (name) => name.toLowerCase().replace('_', ' ').replace('prototype', 'skyblock');
    let result = `Most played games in ${data.guild.name}: `;
    for (let i = 0; i < 5; i++) {
        result += `#${i + 1}: ${fixGameName(sorted[i])} (${parseInt((100 * expByGame[sorted[i]]) / total)}%)`;
        if (i < 4) result += ', ';
    }
    return result;
});

module.exports = [guildExp, guild, memberCount, guildExpLeaderboard, guildLeaderboard, games];
