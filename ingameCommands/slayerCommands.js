const BaseCommand = require('./baseCommand.js')
const StatCommand = require('./statCommand.js');
const { getPlayer, addCommas } = require('../helper/functions.js');
const { getSlayerLevel } = require("../helper/skills");
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { getSlayerLvl, getSlayerWeight, dot, shortenDot } = require('../helper/skyblockStats.js');

class SlayerCommand extends BaseCommand {

    constructor(slayer) {
        super(slayer);
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile)
        const playerProfile = searchedPlayer.memberData;

        const xp = playerProfile?.slayer?.slayer_bosses?.[this.name]?.xp || 0;

        const level = getSlayerLevel(xp);
        return this.sendReply(`${username} is ${this.name} slayer ${level} with ${addCommas(xp.toFixed())} xp`)
    }
}

// [slayer boss key in the API, extra aliases]
const SLAYERS = [
    ['zombie', ['rev', 'revs', 'revxp', 'zombiexp']],
    ['spider', ['tara', 'taras', 'taraxp', 'spiderxp']],
    ['wolf', ['sven', 'svenxp', 'wolfxp']],
    ['enderman', ['void', 'eman', 'voidxp', 'emanxp', 'endermanxp']],
    ['blaze', []],
];
const slayerStatCommands = SLAYERS.map(
    ([boss, aliases]) =>
        new StatCommand([boss, ...aliases], async ({ name }) => {
            const player = await getPlayerHypixel(name);
            const xp = player.slayer.slayer_bosses[boss].xp;
            return `${player.username} is ${boss} slayer ${getSlayerLvl(xp)} with ${dot(xp)} xp`;
        })
);

const slayers = new StatCommand(['slayer', 'slay', 'slayers'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const bosses = player.slayer.slayer_bosses;
    return (
        `${player.username} has slayer lvls ${getSlayerLvl(bosses.zombie.xp)}${getSlayerLvl(bosses.spider.xp)}` +
        `${getSlayerLvl(bosses.wolf.xp)} ${'enderman' in bosses ? getSlayerLvl(bosses.enderman.xp) : 0}${
            'blaze' in bosses ? getSlayerLvl(bosses.blaze.xp) : 0
        } and ${dot(
            bosses.zombie.xp +
                bosses.spider.xp +
                bosses.wolf.xp +
                ('enderman' in bosses && 'xp' in bosses.enderman ? bosses.enderman.xp : 0) +
                ('blaze' in bosses && 'xp' in bosses.blaze ? bosses.blaze.xp : 0)
        )} total slayer xp`
    );
});

const slayerWeight = new StatCommand(['slayerweight', 'slayerwe'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let allWeight = getSlayerWeight(player);
    let we = allWeight.reduce((prev, [weight, overflow]) => prev + weight, 0);
    let ov = allWeight.reduce((prev, [weight, overflow]) => prev + overflow, 0);
    return `${player.username} has ${shortenDot(we + ov)} slayer weight (${shortenDot(we)} we / ${shortenDot(ov)} ov)`;
});

module.exports = [
    new SlayerCommand('vampire'),
    ...slayerStatCommands,
    slayers,
    slayerWeight,
]
