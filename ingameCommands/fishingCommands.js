const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot } = require('../helper/skyblockStats.js');

const itemsFished = new StatCommand(['fished', 'itemsfished'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const fished = player.player_stats?.items_fished ?? {};
    return `${player.username} fished up ${dot(fished.total ?? 0)} items (${dot(fished.normal ?? 0)} normal, ${dot(fished.treasure ?? 0)} treasure, ${dot(
        fished.large_treasure ?? 0
    )} large treasure, ${dot(fished.outstanding ?? 0)} outstanding, ${dot(fished.trophy_fish ?? 0)} trophy fish)`;
});

const seaCreatureKills = new StatCommand(['seacreaturekills', 'sckills'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} killed ${dot(player.player_stats?.sea_creature_kills ?? 0)} sea creatures`;
});

module.exports = [itemsFished, seaCreatureKills];
