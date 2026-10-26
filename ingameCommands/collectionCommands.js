const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');
const StatCommand = require('./statCommand.js');
const { getJsonFromUrl, getPlayerHypixelFullProfile } = require('../helper/skyblockApi.js');

class CollectionCommand extends BaseCommand {

    constructor(collection, key, { name, coop } = { coop: false }) {
        super(collection);
        this.crop = name || collection
        this.key = key || collection;
        this.coop = coop;
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        if (!('collection' in playerProfile)) return this.sendReply(`${username} did not enable collection API`);
        const amount = playerProfile?.collection[this.key] || 0;
        const total = Object.values(searchedPlayer.profileData.members || {}).reduce((prev, p) => prev + (p?.collection?.[this.key] || 0), 0);

        return this.sendReply(`${username} collected ${numberformatter(amount, 3)} ${this.crop}` + (this.coop ? ` (${numberformatter(total, 3)} total)` : ''));
    }
}

// Sand and red sand are separate collections
class SandCommand extends BaseCommand {

    constructor() {
        super('sand', ['redsand']);
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);
        const playerProfile = (await getPlayer(username, profile)).memberData;
        if (!('collection' in playerProfile)) return this.sendReply(`${username} did not enable collection API`);
        return this.sendReply(
            `${username} collected ${numberformatter(playerProfile.collection.SAND || 0, 3)} sand and ${numberformatter(playerProfile.collection['SAND:1'] || 0, 3)} red sand`
        );
    }
}

// Collection names, categories and tiers from Hypixel (cached 5 minutes by getJsonFromUrl)
async function getCollectionInfo() {
    const data = await getJsonFromUrl('https://api.hypixel.net/v2/resources/skyblock/collections');
    return data?.collections ?? {};
}

// "!miningcols [ign]": the player's 5 biggest collections in one category
function topCollectionsCommand(names, category) {
    return new StatCommand(names, async ({ name }) => {
        const profile = await getPlayerHypixelFullProfile(name);
        const own = profile.members[profile.uuid]?.collection ?? {};
        const items = (await getCollectionInfo())[category]?.items ?? {};
        const top = Object.entries(items)
            .map(([key, item]) => [item.name, own[key] ?? 0])
            .filter(([, amount]) => amount > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
        if (!top.length) return `${profile.username} has no ${category.toLowerCase()} collections`;
        return `${profile.username}'s top ${category.toLowerCase()} collections: ${top.map(([itemName, amount]) => `${itemName} ${numberformatter(amount, 2)}`).join(', ')}`;
    });
}

// "!collections [ign]": collections unlocked and maxed. Tiers use the co-op total, like in game.
const collectionSummary = new StatCommand(['collections', 'cols'], async ({ name }) => {
    const profile = await getPlayerHypixelFullProfile(name);
    const totals = {};
    for (const member of Object.values(profile.members ?? {})) {
        for (const [key, amount] of Object.entries(member.collection ?? {})) totals[key] = (totals[key] ?? 0) + amount;
    }
    let all = 0;
    let unlocked = 0;
    let maxed = 0;
    for (const category of Object.values(await getCollectionInfo())) {
        for (const [key, item] of Object.entries(category.items ?? {})) {
            all++;
            const amount = totals[key] ?? 0;
            if (amount > 0) unlocked++;
            const maxTier = item.tiers?.[item.tiers.length - 1]?.amountRequired;
            if (maxTier && amount >= maxTier) maxed++;
        }
    }
    return `${profile.username} has maxed ${maxed}/${all} collections (${unlocked} unlocked)`;
});

module.exports = [
    collectionSummary,
    topCollectionsCommand(['miningcols', 'miningcollections'], 'MINING'),
    topCollectionsCommand(['farmingcols', 'farmingcollections'], 'FARMING'),
    topCollectionsCommand(['combatcols', 'combatcollections'], 'COMBAT'),
    new SandCommand(),
    new CollectionCommand('obsidian', 'OBSIDIAN', { coop: true }),
    new CollectionCommand('diamond', 'DIAMOND', { name: 'diamonds', coop: true }),
    new CollectionCommand('hardstone', 'HARD_STONE', { name: 'hard stone', coop: true }),
    new CollectionCommand('coal', 'COAL', { coop: true }),
    new CollectionCommand('mycelium', 'MYCEL', { coop: true }),
    new CollectionCommand('hemovibe', 'HEMOVIBE', { coop: true }),
    new CollectionCommand('timite', 'TIMITE', { coop: true }),
    new CollectionCommand('blazerods', 'BLAZE_ROD', { name: 'blaze rods', coop: true }),
    new CollectionCommand('wildrose', 'WILD_ROSE', { name: 'wild roses', coop: true }),
    new CollectionCommand('moonflower', 'MOONFLOWER', { name: 'moonflowers', coop: true }),
    new CollectionCommand('sunflower', 'DOUBLE_PLANT', { name: 'sunflowers', coop: true }),
    new CollectionCommand('lilypads', 'WATER_LILY', { name: 'lily pads', coop: true }),
    new CollectionCommand('mangrove', 'MANGROVE_LOG', { name: 'mangrove logs', coop: true }),
    new CollectionCommand('fig', 'FIG_LOG', { name: 'fig logs', coop: true }),
    //new CollectionCommand('gold', 'GOLD_INGOT'),
    new CollectionCommand('gemstones', 'GEMSTONE_COLLECTION'),
    new CollectionCommand('magmafish', 'MAGMA_FISH'),
    new CollectionCommand('chilipeppers', 'CHILI_PEPPER'),
    new CollectionCommand('cocoabeans', 'INK_SACK:3', { name: 'cocoa beans', coop: true }),
    new CollectionCommand('potatoes', 'POTATO_ITEM', { coop: true }),
    new CollectionCommand('carrots', 'CARROT_ITEM', { coop: true }),
    new CollectionCommand('cactus', 'CACTUS', { coop: true }),
    new CollectionCommand('mushrooms', 'MUSHROOM_COLLECTION', { coop: true }),
    new CollectionCommand('wheat', 'WHEAT', { coop: true }),
    new CollectionCommand('pumpkin', 'PUMPKIN', { coop: true }),
    new CollectionCommand('melon', 'MELON', { coop: true }),
    new CollectionCommand('sugarcane', 'SUGAR_CANE', { name: 'sugar cane', coop: true }),
    new CollectionCommand('netherwarts', 'NETHER_STALK', { name: 'nether warts', coop: true }),
    new CollectionCommand('mithril', 'MITHRIL_ORE', { name: 'mithril', coop: true }),
    new CollectionCommand('umber', 'UMBER', { name: 'umber', coop: true }),
    new CollectionCommand('tungsten', 'TUNGSTEN', { name: 'tungsten', coop: true }),
];
