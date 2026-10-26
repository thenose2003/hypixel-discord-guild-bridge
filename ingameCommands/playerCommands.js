const StatCommand = require('./statCommand.js');
const { getJsonFromUrl, getPlayerStatsHypixel, getPlayerStatus } = require('../helper/skyblockApi.js');
const { getRandomElement, getTimeString, dot } = require('../helper/skyblockStats.js');
const { hypixelLevel } = require('../helper/functions.js');

const discord = new StatCommand(['discord'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    if ('DISCORD' in player.socialMedia.links) return `Discord name for ${player.playername}: ${player.socialMedia.links.DISCORD}`;
    return `${player.playername} did not connect their discord account`;
});

const activity = new StatCommand(['activity'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    if (player.lastLogin > player.lastLogout) return `${player.playername} is currently online`;
    const lastUpdate = parseInt((Date.now() - player.lastLogout) / 1000);
    if (isNaN(lastUpdate)) return `No activity information found for ${player.playername}`;
    if (lastUpdate < 300) return `${player.playername} was online in the last 5 minutes`;
    if (lastUpdate < 3600) return `${player.playername} was online ${parseInt(lastUpdate / 60)} minutes ago`;
    if (lastUpdate < 3600 * 24) return `${player.playername} was online ${parseInt(lastUpdate / 60 / 60)} hours ago`;
    return `${player.playername} was online ${getTimeString(Date.now() - player.lastLogout)}ago`;
});

const achievementPoints = new StatCommand(['ap'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    return `${player.playername} collected ${dot(player.achievementPoints)} achievement points`;
});

const achievements = new StatCommand(['achievements'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    const all = await getJsonFromUrl('https://api.hypixel.net/resources/achievements');
    const skyblock = all.achievements.skyblock;
    let achievementsOnce = Object.keys(skyblock.one_time);
    let playerAchievementsOnce = Object.values(player.achievementsOneTime ?? []).filter((achievement) => achievement.startsWith('skyblock_'));
    let playerTieredAchievements = 0;
    let totalTieredAchievements = 0;
    for (let i in skyblock.tiered) {
        let tieredAchievement = skyblock.tiered[i];
        let playerValue = player.achievements[`skyblock_${i.toLowerCase()}`];
        totalTieredAchievements += Object.keys(tieredAchievement.tiers).length;
        for (let tier in tieredAchievement.tiers) {
            if (playerValue >= tieredAchievement.tiers[tier].amount) playerTieredAchievements += 1;
        }
    }
    return `${player.playername} completed ${playerTieredAchievements + playerAchievementsOnce.length}/${
        totalTieredAchievements + achievementsOnce.length
    } skyblock achievement (${playerAchievementsOnce.length}/${achievementsOnce.length} one time, ${playerTieredAchievements} /${totalTieredAchievements} tiered)`;
});

// What a player is "doing" per SkyBlock island (session mode); a string is used as-is
const LOCATION_LINES = {
    hub: [
        'is currently begging for coins in a skyblock hub',
        'is checking if the wizard portal is fixed',
        'is crashing hub 2',
        'is at the hub selector, trying to find a splash',
        'is fishing for an update in the hub portal',
        'is filling their inventory with gold blocks at the bazaar',
        'is grinding a wolf talisman in the ruins',
        'is oak foraging with baritone',
        'is looking for a dragon party in hub 1',
        'is buying their daily npc limit for 40k profit in the hub',
        'is partying random players in the hub to invite them to their irl trading discord',
        'is voting for 2nfg through freecam',
        'is checking random hubs for hacked youtubers',
        'is in the hub and tried to get into the dark auction but was too poor',
        'is in the hub, scanning the crowd for exotics',
        'is running around useless circles in the hub and jumping from building to building for no reason',
        'is spam dropping their spirit bow in a hub',
        'is three-hitting revenant horrors in the hub',
        'is trying to find the carpenter in the hub',
        'is wasting their time doing diana',
    ],
    dynamic: [
        'is f11 foraging on their island',
        'is afking their melon minions',
        'is scripting cane on their island',
        'is nuking wart on their island',
        'is experimenting with the experimentation table',
        'is building a huge dick on their island',
        'is trying to find that chest they put that one thing in a while back',
        'is voiding duped handles on their island',
        'is hiding their dupe stash on their island',
        'is visiting private islands of youtubers and begging for a screenie',
        'is visiting SirDeadlys island with a rabbit for a friend request',
        'is getting banned for gardening on their island',
        'is visiting glitched item museums',
        'is grinding #1 social on technoblades island',
        'is on TimeDeos island, waiting for Hasco to show up so they can report a scammer',
    ],
    combat_3: [
        'is nuking endstone',
        'is grinding endstone golems',
        'is leaching dragons',
        'is trying to get an enderman pet',
        'is at 1082 zealots no eye',
        'can`t find the beacon',
        'is trying to hit their enderman boss between 9 souls',
        'is trying to figure out where their enderman boss spawned',
        'is autoclicking the shield phase of their enderman boss',
        'is fighting endermans with mob aura',
        'is trying to reach the beacon in the wall',
        'is at 12% RNG meter no drop',
        'is getting an ender slayer 7 book instead of a core',
    ],
    combat_2: [
        'is in the blazing fortress because they heard farming wart is good for money',
        'is waiting for the magma boss to spawn',
        'grinding bestiary in the blazing fortress',
    ],
    combat_1: [
        'is trying to find the last relic in the spiders den',
        'is losing all their money doing spider slayer',
        'is camping the peak of the mountain for a spider talisman',
        'is begging the grandma wolf to take back their candied grandma wolf',
    ],
    foraging_1: [
        'is scripting the harp',
        'had their script desync in the park and is breaking trees with a fishing rod',
        'is trying to find romero in the park',
        'is rain fishing in the park',
        'is hoping to drop an overflux in the wolf cave',
        'is trying to mine unbreakable logs in the park with baritone',
        'is in the park, checking if foraging got fixed yet',
    ],
    farming_1: 'is in the farming islands for some reason',
    dungeon_hub: [
        'is salvaging their hyperion in the dungeon hub',
        'is scamming kids in the dungeon hub instead of selling essence',
        'is trying to join a dungeon in the dungeon hub but it breaks every time',
        'is complaining about downtime in the dungeon hub',
    ],
    dark_auction: [
        'is spending their duped coins on a midas sword',
        'is trying to flip a flower minions',
        'is flexing their wealth in the dark auction',
    ],
    mining_1: [
        'is in the gold mines like the non that they truly are',
        'is barn fishing in the gold mines',
        'is getting telekinesis from rusty',
    ],
    mining_2: [
        'is grinding for a set of lapis armor',
        'is grinding miner armor for coins',
        'is grinding invisible creepers for bestiary kills',
        'is lowballing a non for their phoenix pet in the dwarven mines',
    ],
    mining_3: [
        'is trying to find the lobby V3RLO is farming ghosts in',
        'is talking to a sheep in the dwarven mines',
        'is nuking mithril',
        'is afking goblins',
        'is throwing more bones at a powder ghast than humanly possible',
        'is making INSANE stonks from ghost grinding',
        'is trying to figure out what fetchur wants today',
        'is nuking cobble on top of the dwarven mines',
        'is breaking the same 10 blocks of mithril over and over again',
        'is fishing up a ghost to kill nons in the dwarven mines',
        'is asking for spare titanium in the dwarven mines',
        'is getting killed by ghosts in the dwarven mines',
        'is refueling their drill for the 37th time this hour',
        'is complaining about the non that stole their titanium',
        'is dying to a murderlover during a goblin raid',
    ],
    dungeon: [
        'is duping secrets in a dungeon',
        'is haeling a bunch of terminals',
        'is using secret aura to clear the dungeon faster',
        'is inv walking terminals',
        'is sneaking over the deathmite pit, telling their team to leap',
        'is autoclicking simon says',
        'is trying to transfer items to ironman in dungeons',
        'is working on their sub 5 pb with the help of freecam',
        'is trying to figure out why one of the livids is yellow',
        'is getting 1 handle every 2384 runs',
        'is rerolling their handle',
        'is failing tic tac toe',
        'is killing the blazes in the wrong order',
        'is placing traps around the silverfish',
        'is grinding for #1 LadyBleu Deaths',
        'is trying to suffocate their team with mage wall',
        'is knocking their team off the platform as a ghost',
        'is shadow furying into the deathmite pit',
        'is killing their tank on purpose by jumping into the deep hole',
        'is trying to do trap but they dont know the new route',
    ],
    winter: [
        'is duping yetis in the jerry island',
        'is trying to find that last present in the jerry island',
        'is defending the jerry village from evil magma cubes',
        'is spleefing nons that are fishing on the ice',
        'is trying to unlock jingle bells from the chicken race',
        'is killing other peoples yeti with a flower of truth',
        'is fishing with ice bait',
        'is complaining that the jerry island is too laggy for bazaar',
        'is waiting for their first pet in 57 yetis',
        'is burning grinches',
    ],
    crystal_hollows: [
        'is using xray to find pink glass',
        'is catching butterflies',
        'is getting 100k worth of gems for completing the nucleus quest',
        'is trying to get a worm pet',
        'is mining gems',
        'is trying to find bal',
    ],
    garden: [
        'is macroing on their garden',
        'is thinking of the most effective way to delete nerds',
        'is strangling their pests',
        'is trying to find where the earthworm went',
        'is stacking flies for the wheat contest',
    ],
    crimson_isle: [
        'is trying to fish a plhlegblast',
        'is trying the new blaze one tap',
        'is preping to be eaten by kuudra',
        'is chasing bats for beastiary',
        'is watching thirtyvirus say \'pc shut the fuck up\'',
        'is dying to matriarch',
        'is mining sulphur blocks with a gemstone gauntlet',
        'is jumping into the erupting volcano',
    ],
    rift: [
        'is trying to drop a celadon dye',
        'is trying to figure out the mirriorverse',
        'is getting jailed by vampire',
        'is missing twinclaw timing on t2 vamp',
    ],
};

const location = new StatCommand(['location'], async ({ name }) => {
    const player = await getPlayerStatus(name);
    if (!player.session.online) {
        //make sure they are actually offline and not just api disabled
        let p2 = await getPlayerStatsHypixel(name);
        if (p2.lastLogin > p2.lastLogout) return `${p2.playername} is currently online but hides their location.Probably some roleplay housing`;
        return `${player.username} is currently touching grass`;
    }
    if (player.session.gameType == 'SKYBLOCK') {
        const lines = LOCATION_LINES[player.session.mode];
        if (typeof lines === 'string') return `${player.username} ${lines}`;
        if (lines) return `${player.username} ${getRandomElement(lines)} `;
        console.log(player.session.mode);
        return `${player.username} is playing skyblock`;
    }
    return `${player.username} is currently cheating in ${player.session.gameType.toLowerCase()} `;
});

const bedwarsStars = new StatCommand(['bwstars', 'stars', 'bedwarsstars'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    return `${player.playername} has ${dot(player.achievements.bedwars_level)} bedwars stars`;
});

// Hypixel rank as shown in game: custom prefix, staff rank, MVP++, then the bought rank
function hypixelRank(player) {
    if (player.prefix) return player.prefix.replace(/§./g, '').replace(/[[\]]/g, '');
    if (player.rank && player.rank !== 'NORMAL') return player.rank;
    if (player.monthlyPackageRank && player.monthlyPackageRank !== 'NONE') return 'MVP++';
    const bought = player.newPackageRank || player.packageRank;
    return bought ? bought.replace('_PLUS', '+').replace('_', ' ') : 'no rank';
}

// "!player [ign]": rank, network level and first login (ported from treeot/hypixel-chat-bridge, MIT)
const playerInfo = new StatCommand(['player', 'hypixel'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    // "Dec 28, 2016": a YYYY-MM-DD date would look like a phone number to the safety filter
    const firstLogin = player.firstLogin ? new Date(player.firstLogin).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'unknown';
    return `${player.displayname} is ${hypixelRank(player)}, network level ${hypixelLevel(player.networkExp ?? 0)}, first joined ${firstLogin}`;
});

module.exports = [playerInfo, discord, activity, achievementPoints, achievements, location, bedwarsStars];
