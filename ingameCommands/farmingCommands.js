const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot } = require('../helper/skyblockStats.js');

const copper = new StatCommand(['copper'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const garden = player.garden_player_data ?? {};
    return `${player.username} has ${dot(garden.copper ?? 0)} copper and ate ${dot(garden.larva_consumed ?? 0)} larva`;
});

const greenhouse = new StatCommand(['greenhouse'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const garden = player.garden_player_data ?? {};
    return `${player.username} discovered ${(garden.discovered_greenhouse_crops ?? []).length} greenhouse crops and analyzed ${
        (garden.analyzed_greenhouse_crops ?? []).length
    }`;
});

// Anita's shop perks: double drops (max 15 levels) and farming level cap (max +10)
const jacobPerks = new StatCommand(['jacobperks', 'anita'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const perks = player.jacobs_contest?.perks ?? {};
    return `${player.username}'s Jacob perks: double drops ${perks.double_drops ?? 0}/15, farming level cap +${perks.farming_level_cap ?? 0}/10, personal bests ${
        perks.personal_bests ? 'unlocked' : 'locked'
    }`;
});

// Unspent contest medals (lifetime golds are !contests)
const medals = new StatCommand(['medals', 'medalinv'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const inv = player.jacobs_contest?.medals_inv ?? {};
    return `${player.username} has ${dot(inv.gold ?? 0)} gold, ${dot(inv.silver ?? 0)} silver and ${dot(inv.bronze ?? 0)} bronze medals`;
});

module.exports = [copper, greenhouse, jacobPerks, medals];
