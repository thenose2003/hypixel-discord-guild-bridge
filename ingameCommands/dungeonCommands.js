const StatCommand = require('./statCommand.js');
const { getPlayerHypixel, getPlayerStatsHypixel, getUsernameFromUUID } = require('../helper/skyblockApi.js');
const { findCataLvl, findCompletedRuns, findTotalRuns, dungeonTime, getDungeonWeight, dot, shortenDot } = require('../helper/skyblockStats.js');

// "pb", "pbf7", "pbm5", "pbe": fastest S/S+ time on a floor (defaults to master floor 7)
const personalBest = new StatCommand(
    ['pb'],
    async ({ stat, name }) => {
        let player = await getPlayerHypixel(name);
        if (player == null) return;
        let floor = 7;
        if (/(pb\d)|(pbf\d)|(pbm\d)/.test(stat)) floor = Math.min(7, parseInt(stat.substring(stat.length - 1)));
        else if (stat == 'pbentrance' || stat == 'pbe') floor = 0;
        let score = 'fastest_time_s';
        if (floor > 4) score = 'fastest_time_s_plus';
        let mode = 'master_catacombs';
        if (stat.includes('m')) {
            mode = 'master_catacombs';
            floor = Math.min(7, floor);
            floor = Math.max(1, floor);
            if (floor < 5) score = 'fastest_time_s';
        }
        if (/(pb\d)|(pbf\d)|(pbm\d)/.test(stat) && !stat.includes('m')) mode = 'catacombs';
        try {
            if (score in player.dungeons.dungeon_types[mode] && floor in player.dungeons.dungeon_types[mode][score]) {
                return `Fastest ${mode == 'catacombs' ? 'f' : 'm'}${floor} S${(floor > 4 && mode == 'catacombs') || floor > 5 ? '+' : ''} for ${
                    player.username
                }: ${dungeonTime(player.dungeons.dungeon_types[mode][score][floor])}`;
            } else if ('tier_completions' in player.dungeons.dungeon_types[mode] && floor in player.dungeons.dungeon_types[mode].tier_completions) {
                return `${player.username} never got S${floor > 4 ? '+' : ''} on ${mode == 'catacombs' ? 'f' : 'm'}${floor}. Highest score: ${
                    player.dungeons.dungeon_types[mode].best_score[floor]
                }, Best time: ${dungeonTime(player.dungeons.dungeon_types[mode].fastest_time[floor])}`;
            } else
                return (
                    `${player.username} did not complete ${mode == 'catacombs' ? 'f' : 'm'}${floor}` +
                    (mode == 'catacombs' ? ` but tried ${player.dungeons.dungeon_types[mode].times_played[floor]} times` : '')
                );
        } catch (e) {
            console.log(e.stack);
        }
        return `${player.username} never played ${mode == 'catacombs' ? 'f' : 'm'}${floor} `;
    },
    { match: (stat) => stat.startsWith('pb'), matchPriority: 2 }
);

// "runs", "runs7", "runsm5", "runse": completions vs. runs started on a floor
const runs = new StatCommand(
    ['runs'],
    async ({ stat, name }) => {
        let player = await getPlayerHypixel(name);
        if (player == null) return;
        let floor = 7;
        if (/(runs\d)|(runsf\d)|(runsm\d)/.test(stat)) {
            floor = Math.min(7, parseInt(stat.substring(stat.length - 1)));
        } else if (stat == 'runsentrance' || stat == 'runse') {
            floor = 0;
        }
        let normal_completions = 0;
        let master_completions = 0;
        let runs_started = 0;
        try {
            if (floor in player.dungeons.dungeon_types.catacombs.times_played) runs_started = player.dungeons.dungeon_types.catacombs.times_played[floor];
            if (floor in player.dungeons.dungeon_types.catacombs.tier_completions)
                normal_completions = player.dungeons.dungeon_types.catacombs.tier_completions[floor];
            if (floor in player.dungeons.dungeon_types.master_catacombs.tier_completions)
                master_completions = player.dungeons.dungeon_types.master_catacombs.tier_completions[floor];
        } catch (e) {}
        return `${player.username} completed ${
            normal_completions + master_completions
        } / ${runs_started} floor ${floor} runs (${normal_completions} normal, ${master_completions} master)`;
    },
    { match: (stat) => stat.startsWith('runs'), matchPriority: 3 }
);

// "team", "teamf7", "teammm5": most frequent teammates in the player's best runs
const team = new StatCommand(
    ['team'],
    async ({ stat, name }) => {
        const player = await getPlayerHypixel(name);
        if (!('dungeons' in player)) return `${player.username} never played dungeons`;
        let floor = -1;
        let master = false;
        let all = true;
        if (/(team\d)|(teamf\d)|(teamm\d)/.test(stat)) {
            floor = Math.min(7, parseInt(stat.substring(stat.length - 1)));
            all = false;
        }
        if (stat.includes('mm')) {
            master = true;
            all = false;
            if (floor === 0) floor = 1;
        } else if (stat.includes('f')) {
            master = false;
            all = false;
        }
        let teamObj = {};
        for (let mode in player.dungeons.dungeon_types) {
            if (!all && mode === 'catacombs' && master) continue;
            if (!all && mode === 'master_catacombs' && !master) continue;
            for (let i in player.dungeons.dungeon_types[mode].best_runs) {
                if (floor > -1 && i != floor) continue;
                for (let j in player.dungeons.dungeon_types[mode].best_runs[i]) {
                    for (let k in player.dungeons.dungeon_types[mode].best_runs[i][j].teammates) {
                        let teammateUuid = player.dungeons.dungeon_types[mode].best_runs[i][j].teammates[k];
                        teamObj[teammateUuid] = (teamObj[teammateUuid] || 0) + 1;
                    }
                }
            }
        }
        //sort object according to occurences
        let sortedKeys = Object.keys(teamObj).sort((a, b) => teamObj[b] - teamObj[a]);
        if (sortedKeys.length < 4) return `${player.username} never played ${all ? 'dungeons' : !master ? 'f' + floor : 'm' + floor}`;
        return `${player.username} achieved their best ${all ? ' overall' : (master ? 'm' : 'f') + floor} results with ${await getUsernameFromUUID(
            sortedKeys[0]
        )}, ${await getUsernameFromUUID(sortedKeys[1])}, ${await getUsernameFromUUID(sortedKeys[2])} and ${await getUsernameFromUUID(sortedKeys[3])} `;
    },
    { match: (stat) => stat.startsWith('team'), matchPriority: 4 }
);

const catacombs = new StatCommand(['cata', 'catacombs', 'catacombsxp', 'cataxp'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} is cata ${parseFloat(findCataLvl(player?.dungeons?.dungeon_types?.catacombs?.experience)).toFixed(2)} with ${dot(
        player?.dungeons?.dungeon_types?.catacombs?.experience
    )} cata xp`;
});

// Class level commands: [class key in the API, extra aliases]
const CLASSES = [
    ['tank', ['tankxp']],
    ['healer', ['healerxp']],
    ['berserk', ['berserkerxp', 'berserker', 'bers']],
    ['mage', ['nosethe', 'magexp']],
    ['archer', ['archerxp']],
];
const classCommands = CLASSES.map(
    ([dungeonClass, aliases]) =>
        new StatCommand([dungeonClass, ...aliases], async ({ name }) => {
            const player = await getPlayerHypixel(name);
            const xp = player?.dungeons?.player_classes?.[dungeonClass]?.experience;
            return `${player.username} is ${dungeonClass} ${parseFloat(findCataLvl(xp)).toFixed(2)} with ${dot(parseInt(xp))} ${dungeonClass} xp`;
        })
);

const classAverage = new StatCommand(['classaverage', 'classes', 'ca'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const classes = player.dungeons.player_classes;
    const average = (past50) =>
        (findCataLvl(classes.mage.experience, past50) +
            findCataLvl(classes.archer.experience, past50) +
            findCataLvl(classes.berserk.experience, past50) +
            findCataLvl(classes.healer.experience, past50) +
            findCataLvl(classes.tank.experience, past50)) /
        5;
    return `${player.username} has a dungeon class average of ${parseFloat(average(false)).toFixed(2)} (${parseFloat(average(true)).toFixed(2)})`;
});

const secrets = new StatCommand(['secrets'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const p2 = await getPlayerStatsHypixel(name);
    return `${player.username} found ${dot(p2.achievements.skyblock_treasure_hunter)} secrets`;
});

const secretRatio = new StatCommand(['secretratio', 'ratio'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const p2 = await getPlayerStatsHypixel(name);
    const found = p2.achievements.skyblock_treasure_hunter;
    return `On average, ${player.username} found ${shortenDot(found / findCompletedRuns(player.dungeons))} (${dot(found)}/${dot(
        findCompletedRuns(player.dungeons)
    )}) secrets per completed run / ${shortenDot(found / findTotalRuns(player.dungeons))} overall (${dot(found)}/${dot(findTotalRuns(player.dungeons))})`;
});

const bloodMobs = new StatCommand(['blood', 'watcher', 'bloodkills', 'watcherkills'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let watcher_kills = 0;
    let master_watcher_kills = 0;
    if ('watcher_summon_undead' in player.player_stats.kills) watcher_kills = player.player_stats.kills.watcher_summon_undead;
    if ('master_watcher_summon_undead' in player.player_stats.kills) master_watcher_kills = player.player_stats.kills.master_watcher_summon_undead;
    let total_kills = watcher_kills + master_watcher_kills;
    return (
        `${player.username} killed ${dot(total_kills)} blood mobs` +
        (total_kills > 0 ? ` (${parseInt((master_watcher_kills / total_kills) * 100)}% mastermode)` : '')
    );
});

const dungeonWeight = new StatCommand(['dungeonweight', 'catawe', 'catacombsweight', 'dungwe', 'dungeonwe'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let allWeight = getDungeonWeight(player);
    let weight = allWeight.reduce((prev, [we, ov]) => prev + we, 0);
    let ov = allWeight.reduce((prev, [we, ov]) => prev + ov, 0);
    return `${player.username} has ${shortenDot(weight + ov)} dungeon weight (${shortenDot(weight)} we / ${shortenDot(ov)} ov)`;
});

// "!floor <0-7|m1-m7> [ign]": completions, best score and best time on one floor (ported from treeot/hypixel-chat-bridge, MIT)
const floorStats = new StatCommand(['floor'], async ({ parts, author }) => {
    const floorArg = parts[1];
    if (!floorArg) return 'Usage: !floor <floor> [ign], e.g. !floor m7';
    const master = floorArg.startsWith('m');
    const floor = parseInt(floorArg.replace(/^[mf]/, ''), 10);
    if (Number.isNaN(floor) || floor < 0 || floor > 7 || (master && floor < 1)) return 'Invalid floor. Use 0-7, or m1-m7 for Master Mode';

    const player = await getPlayerHypixel(parts[2] || author);
    const label = `${master ? 'm' : 'f'}${floor}`;
    const data = player?.dungeons?.dungeon_types?.[master ? 'master_catacombs' : 'catacombs'];
    if (!data) return `${player.username} has no ${master ? 'Master Mode ' : ''}dungeons data`;
    const completions = data.tier_completions?.[floor] ?? 0;
    if (!completions) return `${player.username} has not completed ${label}`;
    // fastest_time is the overall record; best_runs (ranked by score) is only a fallback
    const bestTimes = [data.fastest_time?.[floor], ...(data.best_runs?.[floor] ?? []).map((run) => run.elapsed_time)].filter(Number.isFinite);
    return `${player.username} completed ${label} ${dot(completions)} times. Best score: ${data.best_score?.[floor] ?? 'N/A'}, best time: ${
        bestTimes.length ? dungeonTime(Math.min(...bestTimes)) : 'N/A'
    }`;
});

const FLOOR_NUMBERS = { ENTRANCE: 0, ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7 };

// "MASTER_CATACOMBS_FLOOR_SEVEN" -> "m7"
const lastRun = new StatCommand(['lastrun'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const run = player.dungeons?.last_dungeon_run;
    if (!run) return `${player.username} has not run a dungeon yet`;
    const match = /^(MASTER_)?CATACOMBS_(?:FLOOR_)?(\w+)$/.exec(run);
    const floor = match && FLOOR_NUMBERS[match[2]] !== undefined ? `${match[1] ? 'm' : 'f'}${FLOOR_NUMBERS[match[2]]}` : run.toLowerCase();
    return `${player.username}'s last dungeon run was ${floor}`;
});

const selectedClass = new StatCommand(['class', 'selectedclass'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const dungeonClass = player.dungeons?.selected_dungeon_class;
    if (!dungeonClass) return `${player.username} has no dungeon class selected`;
    const xp = player.dungeons.player_classes?.[dungeonClass]?.experience;
    return `${player.username} is playing ${dungeonClass} (level ${parseFloat(findCataLvl(xp)).toFixed(2)})`;
});

// daily_runs counts runs for one day number (days since 1970); Hypixel's day resets at midnight US Eastern
function hypixelDayNumber(now = new Date()) {
    const [month, day, year] = now.toLocaleDateString('en-US', { timeZone: 'America/New_York' }).split('/').map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
}

const dailyRuns = new StatCommand(['dailyruns', 'runstoday'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const daily = player.dungeons?.daily_runs ?? {};
    const today = hypixelDayNumber();
    const count = daily.current_day_stamp === today ? daily.completed_runs_count ?? 0 : 0;
    return `${player.username} completed ${dot(count)} dungeon runs today`;
});

module.exports = [lastRun, selectedClass, dailyRuns, floorStats, personalBest, runs, team, catacombs, ...classCommands, classAverage, secrets, secretRatio, bloodMobs, dungeonWeight];
