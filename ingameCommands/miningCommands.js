const StatCommand = require('./statCommand.js');
const { getPlayerHypixel, getPlayerStatsHypixel } = require('../helper/skyblockApi.js');
const { getHotmLvl, dot } = require('../helper/skyblockStats.js');

const oresMined = new StatCommand(['rock', 'ores'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} mined ${dot(player.player_stats.pets.milestone.ores_mined)} ores`;
});

const commissions = new StatCommand(['commissions', 'coms', 'comms'], async ({ name }) => {
    const player = await getPlayerStatsHypixel(name);
    return `${player.playername} completed ${dot(player.achievements.skyblock_hard_working_miner)} commissions for the king`;
});

const powder = new StatCommand(['powder', 'gempowder', 'mithrilpowder'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    if (!('mining_core' in player)) return `${player.username} never entered the dwarven mines`;
    const core = player.mining_core;
    return `${player.username} has a total of ${dot(core.powder_mithril + core.powder_spent_mithril)} mithril powder, ${dot(
        core.powder_gemstone + core.powder_spent_gemstone
    )} gemstone powder, and ${dot(core.powder_glacite + core.powder_spent_glacite)} glacite powder.`.replace(/NaN/g, '0');
});

const heartOfTheMountain = new StatCommand(['hotm', 'heartofthemountain'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const xp = player.skill_tree?.experience?.mining;
    if (xp == null) return `${player.username} never entered the dwarven mines`;
    return `${player.username} is hotm level ${getHotmLvl(xp)} with ${dot(xp)} hotm xp`;
});

const nucleus = new StatCommand(['nucleus', 'nuc', 'nucleusruns'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    if (!('mining_core' in player)) return `${player.username} never entered the dwarven mines`;
    return `${player.username} completed ${player.mining_core.crystals.jade_crystal.total_placed} nucleus runs`.replace('undefined', 0);
});

const glacite = new StatCommand(['glacite', 'fossils', 'mineshafts'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const glacite = player.glacite_player_data ?? {};
    const corpses = glacite.corpses_looted ?? {};
    const corpseList = Object.entries(corpses).map(([type, count]) => `${dot(count)} ${type}`);
    return `${player.username} donated ${(glacite.fossils_donated ?? []).length}/8 fossils, has ${dot(glacite.fossil_dust ?? 0)} fossil dust, entered ${dot(
        glacite.mineshafts_entered ?? 0
    )} mineshafts and looted ${dot(Object.values(corpses).reduce((a, b) => a + b, 0))} corpses` + (corpseList.length ? ` (${corpseList.join(', ')})` : '');
});

module.exports = [glacite, oresMined, commissions, powder, heartOfTheMountain, nucleus];
