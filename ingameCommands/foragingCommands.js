const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot } = require('../helper/skyblockStats.js');

const treeGifts = new StatCommand(['treegifts', 'gifttrees'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const gifts = player.foraging?.tree_gifts ?? {};
    const tiers = gifts.milestone_tier_claimed ?? {};
    return `${player.username} has ${dot(gifts.FIG ?? 0)} fig (milestone ${tiers.FIG ?? 0}) and ${dot(gifts.MANGROVE ?? 0)} mangrove (milestone ${tiers.MANGROVE ?? 0}) tree gifts`;
});

const whispers = new StatCommand(['whispers'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const all = player.foraging_core?.whispers ?? {};
    const spent = (area) => Object.values(all[area] ?? {}).reduce((sum, tier) => sum + (tier?.spent ?? 0), 0);
    return `${player.username} has ${dot(all.forest?.total ?? 0)} forest whispers (${dot(spent('forest'))} spent) and ${dot(all.desert?.total ?? 0)} desert whispers (${dot(
        spent('desert')
    )} spent)`;
});

// Harp songs from Melody: songs played, perfected and total completions
const harp = new StatCommand(['harp', 'melody'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const songs = player.foraging?.songs?.harp ?? {};
    const completions = Object.entries(songs).filter(([key]) => /^song_.+_completions$/.test(key) && !key.endsWith('_perfect_completions'));
    const perfected = Object.keys(songs).filter((key) => key.endsWith('_perfect_completions') && songs[key] > 0);
    const total = completions.reduce((sum, [, count]) => sum + count, 0);
    return `${player.username} played ${completions.length} harp songs (${perfected.length} perfected), ${dot(total)} completions in total`;
});

module.exports = [treeGifts, whispers, harp];
