const StatCommand = require('./statCommand.js');
const { getJsonFromUrl, getGuildData } = require('../helper/skyblockApi.js');
const { shortenDot } = require('../helper/skyblockStats.js');

// Finds the SkyCrypt leaderboard whose key or name contains every dash-separated part of `word`
async function getKeyword(word) {
    let response = await fetch('https://sky.shiiyu.moe/api/v2/leaderboards');
    const jsondata = await response.json();
    let bestMatch = null;
    // fix for guild members being unable to understand how stuff works
    if (word.toLowerCase() == 'eman') word = 'ender-xp';
    let words = word.split('-');
    const containsAll = (text) => words.every((w) => text.toLowerCase().includes(w.toLowerCase()));
    for (const lbkey in jsondata) {
        let stat = jsondata[lbkey];
        if (containsAll(stat.key) || containsAll(stat.name)) {
            if (bestMatch == null || bestMatch.key.length > stat.key.length) bestMatch = { key: stat.key, name: stat.name };
        }
    }
    return bestMatch;
}

function getPos(object, i, n) {
    return i in object.positions ? `#${5 * n + i + 1}: ${object.positions[i].username} (${object.positions[i].amount})` : '';
}

// "!lb <leaderboard> [guild] [page]" (also "!leaderboard ..."). Weight comes from senither, everything else from SkyCrypt.
async function getLeaderboard(args) {
    if (args.length < 3) return;
    let lb = args[2];
    //weight leaderboard comes from a different source
    if (/(weight)|(we)/.test(lb)) {
        let page = 1;
        let guildId = '';
        if (args.length > 3) {
            if (!isNaN(args[3])) {
                page = args[3];
            } else {
                if (args.length > 4 && !isNaN(args[4])) {
                    page = Math.max(args[4]);
                }
                let guildData = await getGuildData(args[3]);
                if (guildData == null) return;
                guildId = guildData.guild._id;
            }
        }
        let lbData = await getJsonFromUrl(`https://hypixel-app-api.senither.com/leaderboard/players/${guildId}`);
        let sorted = lbData.data.sort((a, b) => b.weight - a.weight);
        let result = '';
        for (let i = (page - 1) * 5; i < page * 5; i++) {
            if (i < sorted.length) result += `#${i + 1}: ${sorted[i].username} (${shortenDot(sorted[i].weight)}) `;
        }
        return result;
    }
    const rs = await getKeyword(lb);
    if (rs == null) {
        console.log('no leaderboard found');
        return;
    }
    let url = `https://sky.shiiyu.moe/api/v2/leaderboard/${rs.key}?count=5`;
    let n = 0;
    if (args.length > 3) {
        if (!isNaN(args[3])) {
            url += `&page=${args[3]}`;
            n = args[3] - 1;
        } else {
            url += `&guild=${args[3]}`;
            if (args.length > 4 && !isNaN(args[4])) {
                url += `&page=${args[4]}`;
                n = args[4] - 1;
            } else {
                url += '&page=1';
            }
        }
    }
    let response = await fetch(url);
    if (response.status != 200) {
        console.log('error fetching leaderboard');
        return;
    }
    const jsondata = await response.json();
    if ('error' in jsondata) {
        console.log(jsondata.error);
        return;
    }
    return `${rs.name}: ${[0, 1, 2, 3, 4].map((i) => getPos(jsondata, i, n)).join(' ')}`;
}

class LeaderboardCommand extends StatCommand {
    constructor() {
        // args are laid out as "!s lb <leaderboard> [guild] [page]", which is what getLeaderboard indexes into
        super(['leaderboard', 'lb'], async ({ words }) => getLeaderboard(['!s', 'lb', ...words.slice(1)]), {
            match: (stat) => stat.startsWith('lb') || stat.startsWith('leaderboard'),
            matchPriority: 1,
        });
    }

    sendReply(message) {
        minecraftClient.chat(`/gc @${message}`);
    }
}

module.exports = new LeaderboardCommand();
