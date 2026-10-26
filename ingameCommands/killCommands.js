const { addCommas, getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');
const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot, shortenDot } = require('../helper/skyblockStats.js');

class KillCommand extends BaseCommand {

    constructor(mob, { key, display_name } = {}) {
        super(mob);
        this.key = key || mob;
        this.display_name = display_name || mob;
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const amount = playerProfile?.player_stats?.kills[this.key] || 0;

        return this.sendReply(`${username} killed ${addCommas(amount)} ${this.display_name}`);
    }
}

// [names, player_stats.kills key, what was killed]
const KILL_STATS = [
    [['mytho', 'mythokills', 'diana', 'dianakills'], null, 'mythological creatures'],
    [['inquisitors', 'inq', 'inquis', 'inquisitorkills', 'inquiskills'], 'minos_inquisitor', 'minos inquisitors'],
    [['champions', 'champs', 'champkills', 'championkills'], 'minos_champion', 'minos champions'],
    [['yetis', 'yetikills'], 'yeti', 'yetis'],
    [['ghosts', 'ghost', 'ghostkills', 'dalosen', 'dalo'], 'caverns_ghost', 'ghosts'],
    [['dolphin', 'seacreatures'], null, 'sea creatures'],
];
const killStatCommands = KILL_STATS.map(
    ([names, key, what]) =>
        new StatCommand(names, async ({ name }) => {
            const player = await getPlayerHypixel(name);
            let kills;
            if (names[0] === 'mytho') kills = player.player_stats.mythos.kills;
            else if (names[0] === 'dolphin') kills = player.player_stats.pets.milestone.sea_creatures_killed;
            else kills = player.player_stats.kills[key];
            return `${player.username} killed ${dot(kills)} ${what}`;
        })
);

const highestDamage = new StatCommand(['highestdamage', 'highestcrit', 'maxdamage'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const crit = player.player_stats?.highest_critical_damage ?? 0;
    const hit = player.player_stats?.highest_damage ?? 0;
    return `${player.username}'s highest hit is ${numberformatter(Math.max(crit, hit), 2)} damage` + (crit > 0 && crit >= hit ? ' (crit)' : '');
});

const totalKills = new StatCommand(['kills'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} killed a total of ${dot(player.player_stats.kills.total)} creatures`;
});

const deaths = new StatCommand(['deaths'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} died ${dot(player.player_stats.deaths.total)} times in total`;
});

// Share of mythological fights won, overall and per mob
const MYTHOLOGICAL_MOBS = [
    ['minos_inquisitor', 'inq'],
    ['minos_champion', 'champ'],
    ['gaia_construct', 'gaia'],
    ['minotaur', 'minotaur'],
    ['siamese_lynx', 'cats'],
    ['minos_hunter', 'hunter'],
];
const mythologicalKd = new StatCommand(['mythoskd', 'mythosk/d', 'dianakd', 'dianak/d', 'k/d', 'kd'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const stats = player.player_stats;
    const mobs = MYTHOLOGICAL_MOBS.map(([key, label]) => ({
        label,
        kills: key in stats.kills ? stats.kills[key] : 0,
        deaths: key in stats.deaths ? stats.deaths[key] : 0,
    }));
    const dianaDeaths = mobs.reduce((sum, mob) => sum + mob.deaths, 0);
    const dianaKills = 'kills' in stats.mythos ? stats.mythos.kills : 0;
    if (dianaKills == 0 && dianaDeaths == 0) return `${player.username} never played a mythological event`;
    if (dianaKills == 0) return `${player.username} did not kill any mythological creatures but died ${dianaDeaths} times trying`;

    const perMob = mobs
        .filter((mob) => mob.deaths != 0 || mob.kills != 0)
        .map((mob) => `${parseInt((100 * mob.kills) / (mob.kills + mob.deaths))}% ${mob.label}`);
    return `${player.username} managed to kill ${shortenDot((100 * dianaKills) / (dianaDeaths + dianaKills))}% of all mythological creatures (${perMob.join(', ')})`;
});

const dragons = new StatCommand(['dragons', 'dragon'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let dragons = player?.stats?.kills_superior_dragon ?? 0;
    dragons += player?.player_stats?.kills?.protector_dragon ?? 0;
    dragons += player?.player_stats?.kills?.unstable_dragon ?? 0;
    dragons += player?.player_stats?.kills?.old_dragon ?? 0;
    dragons += player?.player_stats?.kills?.strong_dragon ?? 0;
    dragons += player?.player_stats?.kills?.young_dragon ?? 0;
    dragons += player?.player_stats?.kills?.wise_dragon ?? 0;
    let superior = player?.player_stats?.kills?.superior_dragon ?? 0;
    return (
        `${player.username} fought ${dot(dragons)} dragons, ${superior} of those being superior dragons ` +
        (dragons ? '(' + shortenDot((100 * superior) / dragons) + '%)' : '')
    );
});

module.exports = [
    //new KillCommand('yetis', { key: 'kills_yeti' }),
    //new KillCommand('ghosts', { key: 'kills_caverns_ghost' }),
   /* new KillCommand('inquisitors', {
        key: 'kills_minos_inquisitor',
        display_name: 'minos inquisitors'
    }),*/
    /*new KillCommand('kills', {
        key: 'kills',
        display_name: 'creatures'
    }),*/
    new KillCommand('flares', { key: 'flare', }),
    new KillCommand('vanquishers', { key: 'vanquisher', }),
    ...killStatCommands,
    totalKills,
    highestDamage,
    deaths,
    mythologicalKd,
    dragons,
]
