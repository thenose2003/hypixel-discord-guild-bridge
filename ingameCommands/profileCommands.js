const { ProfileNetworthCalculator } = require('skyhelper-networth');
const StatCommand = require('./statCommand.js');
const config = require('../config.json');
const { getJsonFromUrl, getPlayerHypixel, getPlayerHypixelFullProfile, getAuctionInfo } = require('../helper/skyblockApi.js');
const { fixFarmingNames, getTimeString, dot, space } = require('../helper/skyblockStats.js');
const { numberformatter } = require('../helper/functions.js');
const { bestiary, bestiary_brackets: bestiaryTiers } = require('../constants');

const level = new StatCommand(['level', 'sb', 'lvl', 'sblvl', 'sblevel', 'sbxp', 'skyblocklevel'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let xp = (player?.leveling?.experience ?? 0) / 100;
    return `${player.username} is skyblock level ${xp.toFixed(2)}.`;
});

const networth = new StatCommand(['networth', 'nw'], async ({ name }) => {
    const player = await getPlayerHypixelFullProfile(name);
    let museumData = player.museumData;
    let networth = await new ProfileNetworthCalculator(player.members[player.uuid], museumData?.members?.[player.uuid], player?.banking?.balance).getNetworth({
        onlyNetworth: true,
    });
    let nw = networth.networth;
    let soulbound = networth.networth - networth.unsoulboundNetworth;
    return `${player.username} has a networth of ${space(nw)} (${space(soulbound)} soulbound).`;
});

const coins = new StatCommand(['coins', 'bank', 'purse'], async ({ name }) => {
    const profile = await getPlayerHypixelFullProfile(name);
    let purse = profile?.members[profile.uuid]?.currencies?.coin_purse ?? 0;
    let bank = profile?.banking?.balance;
    return (
        `${profile.username} has ${space(purse + (bank ?? 0))} coins ` +
        (bank ? `(${space(parseInt(purse))} purse / ${space(parseInt(bank))} bank)` : `in their purse`)
    );
});

const magicPower = new StatCommand(['magicpower', 'mp', 'accessories', 'talismans', 'tali', 'talis'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    // Hypixel's own number: the highest accessory power the profile has reached (it doesn't drop when accessories are removed)
    const mp = player.accessory_bag_storage?.highest_magical_power;
    if (mp == null) return `${player.username} has no accessory bag data`;
    return `${player.username} has ${dot(mp)} magic power.`;
});

const petXp = new StatCommand(['petxp'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let petxp = 0;
    for (let pet of Object.values(player.pets_data.pets ?? {})) petxp = petxp + pet.exp;
    return `${player.username} has ${dot(petxp)} total pet xp`;
});

const candy = new StatCommand(['candy'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let petcandy = 0;
    for (let pet of Object.values(player.pets_data.pets ?? {})) petcandy = petcandy + pet.candyUsed;
    return `${player.username} used a total of ${dot(petcandy)} candy on their pets`;
});

const PET_RARITY_VALUE = { MYTHIC: 6, LEGENDARY: 5, EPIC: 4, RARE: 3, UNCOMMON: 2, COMMON: 1 };
// Pet xp needed for level 100 per rarity (legendary/mythic as default)
const PET_MAX_XP = { EPIC: 18_608_500, RARE: 12_626_665, UNCOMMON: 8_644_220, COMMON: 5_624_785 };

// Pet score: best rarity per pet type (+1 if max level), tier boosts count as the next rarity
const petScore = new StatCommand(['pets', 'petscore'], async ({ name }) => {
    const profile = await getPlayerHypixel(name);
    let pets = {};
    profile?.pets_data?.pets?.forEach((pet) => {
        let type = pet.type;
        let rarity = pet.tier;

        // comment this in once wisp pet stacking is fixed
        //if (type.includes('WISP')) type = 'WISP';
        let value = PET_RARITY_VALUE[rarity] || 0;
        if (value < 6 && pet.heldItem === 'PET_ITEM_TIER_BOOST') value += 1;
        if (pet.exp >= (PET_MAX_XP[rarity] || 25_353_230)) value++;
        if (value > (pets?.[type] || 0)) pets[type] = value;
    });
    let petscore = Object.values(pets).reduce((prev, val) => prev + val, 0);
    return `${profile.username} has a petscore of ${dot(petscore)}.`;
});

const fees = new StatCommand(['fees'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} spent ${dot(player.player_stats.auctions.fees)} coins on auction fees`;
});

const essence = new StatCommand(['essence'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const essence = (type) => dot(player.currencies?.essence?.[type]?.current ?? 0);
    return (
        `${player.username} has ${essence('WITHER')} wither, ${essence('UNDEAD')} undead, ${essence('GOLD')} gold, ` +
        `${essence('DIAMOND')} diamond, ${essence('SPIDER')} spider, ${essence('DRAGON')} dragon and ${essence('ICE')} ice essence`
    );
});

const soulflow = new StatCommand(['soulflow'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} has ${dot(player?.item_data?.soulflow ?? 0)} soulflow available`;
});

const peppers = new StatCommand(['peppers', 'pepper', 'reaperpepper', 'reaperpeppers'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} ate ${dot(player?.player_data?.reaper_peppers_eaten ?? 0)} reaper peppers`;
});

const pelts = new StatCommand(['pelts', 'pelt'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let pelts = player?.quests?.trapper_quest?.pelt_count ?? 0;
    return `${player.username} has ${pelts} pelts.`;
});

const fairySouls = new StatCommand(['fairysouls', 'souls'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} found ${dot(parseInt(player?.fairy_soul.total_collected))} fairy souls`;
});

// Unique crafted minions needed for each bonus minion slot tier, highest first: [crafted, slots]
const MINION_SLOT_TIERS = [
    [650, 26], [600, 25], [550, 24], [500, 23], [450, 22], [400, 21], [350, 20], [300, 19], [275, 18], [250, 17], [225, 16],
    [200, 15], [175, 14], [150, 13], [125, 12], [100, 11], [75, 10], [50, 9], [30, 8], [15, 7], [5, 6],
];
const minions = new StatCommand(['minions', 'minionslots'], async ({ name }) => {
    const profile = await getPlayerHypixelFullProfile(name);
    let minionCount = 0;
    let minionList = new Set([]);
    for (let upgrade of Object.values(profile.community_upgrades.upgrade_states ?? {})) {
        if (upgrade.upgrade == 'minion_slots') minionCount++;
    }
    for (let member of Object.values(profile.members)) {
        for (let minion of member.player_data?.crafted_generators ?? []) minionList.add(minion);
    }
    const craftedMinions = minionList.size;
    const tierIndex = MINION_SLOT_TIERS.findIndex(([crafted]) => craftedMinions >= crafted);
    const [reached, slots] = MINION_SLOT_TIERS[tierIndex] ?? [0, 5];
    minionCount += slots;
    // tiers are sorted highest first, so the next tier is the entry before this one
    const next = tierIndex === -1 ? MINION_SLOT_TIERS[MINION_SLOT_TIERS.length - 1] : MINION_SLOT_TIERS[tierIndex - 1];
    const progress = next ? `${craftedMinions - reached}/${next[0] - reached} to next tier` : 'max tier';
    return `${profile.username} unlocked ${minionCount}/31 minion slots (${craftedMinions} unique minions, ${progress})`;
});

// Lists the top 3 entries of `counts` as "(a: x, b: y, c: z)" after `result`
function appendTopThree(result, counts, format) {
    let sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (sorted.length == 0) return result;
    return result + ` (${sorted.slice(0, 3).map(format).join(', ')})`;
}

const contests = new StatCommand(['contests', 'golds'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let totalGolds = 0;
    let golds = {};
    const jacob = player.jacobs_contest ?? {};
    for (let contestName in jacob.contests) {
        let contest = jacob.contests[contestName];
        if ('claimed_position' in contest && 'claimed_participants' in contest)
            if (contest.claimed_position / contest.claimed_participants <= 0.05) {
                totalGolds++;
                let type = contestName.split(':').slice(2).join(':');
                golds[type] = (golds[type] || 0) + 1;
            }
    }
    let result = `${player.username} earned ${jacob.unique_brackets?.gold?.length ?? 0} unique gold medals and ${totalGolds} golds in total`;
    return appendTopThree(result, golds, (key) => `${fixFarmingNames(key)}: ${golds[key]}`);
});

const logs = new StatCommand(['logs', 'wood'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    if (!('collection' in player)) return `${player.username} did not enable collection API`;
    const LOG_TYPES = { oak: 'LOG', spruce: 'LOG:1', birch: 'LOG:2', jungle: 'LOG:3', acacia: 'LOG_2', 'dark oak': 'LOG_2:1' };
    let woodCollections = {};
    for (const [tree, key] of Object.entries(LOG_TYPES)) {
        if (key in player.collection) woodCollections[tree] = player.collection[key];
    }
    let totalWood = Object.values(woodCollections).reduce((a, b) => a + b);
    let result = `${player.username} broke a total of ${dot(totalWood)} logs`;
    let sorted = Object.keys(woodCollections).sort((a, b) => woodCollections[b] - woodCollections[a]);
    if (sorted.length == 0) return result;
    const percent = (key) => `${key}: ${parseInt(100 * (woodCollections[key] / totalWood))}%`;
    return result + ` (Favorite trees: ${sorted.slice(0, 3).map(percent).join(', ')})`;
});

const gold = new StatCommand(['gold'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    if (!('collection' in player)) return `${player.username} did not enable collection API`;
    if ('GOLD_INGOT' in player.collection) return `${player.username} mined ${dot(player.collection.GOLD_INGOT)} gold`;
    return `${player.username} did not mine any gold yet`;
});

const auctions = new StatCommand(['auctions', 'ah'], async ({ name }) => {
    const data = await getAuctionInfo(name);
    let unclaimedCoins = 0;
    let expiredAuctions = 0;
    let activeAuctions = 0;
    let nextEnd = null;
    let endText = '';
    let auctionText = '';
    let ongoingCoins = 0;
    data.auctions.forEach((auction) => {
        if ('claimed' in auction && !auction.claimed && 'auctioneer' in auction && auction.auctioneer == data.uuid) {
            if (Date.now() > auction.end) {
                if (auction.highest_bid_amount == 0) expiredAuctions++;
                else unclaimedCoins += auction.highest_bid_amount;
            } else {
                activeAuctions++;
                ongoingCoins += auction.highest_bid_amount;
                if (nextEnd == null || nextEnd > auction.end) nextEnd = auction.end;
            }
        }
    });
    if (nextEnd != null) {
        let timeLeft = nextEnd - Date.now();
        endText = `(${getTimeString(timeLeft)}left on shortest auction)`;
        auctionText = ` totaling ${dot(ongoingCoins)} coins `;
    }
    return `${data.username} has ${activeAuctions} ongoing auctions${auctionText}${endText}. ${expiredAuctions} auctions expired, ${dot(unclaimedCoins)} unclaimed coins`;
});

const bestiaryLevel = new StatCommand(['bestiary', 'be'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let tiers = 0;
    let maxed = 0;
    let total = 0;
    Object.values(bestiary).forEach((island) => {
        island.mobs.forEach((mob) => {
            total++;
            let kills = mob.mobs.reduce((prev, cur) => prev + (player?.bestiary?.kills?.[cur] || 0), 0);
            if (kills >= mob.cap) maxed++;
            for (let n of bestiaryTiers[mob.bracket]) {
                if (n > mob.cap) break;
                if (n <= kills) tiers++;
                else break;
            }
        });
    });
    return `${player.username} is bestiary level ${tiers / 10} (${maxed}/${total} categories maxed)`;
});

// "INK_SACK:3" -> "cocoa beans", "CARROT_ITEM" -> "carrot", "WILD_ROSE" -> "wild rose"
const CROP_NAMES = { 'INK_SACK:3': 'cocoa beans', MUSHROOM_COLLECTION: 'mushroom', NETHER_STALK: 'nether wart', DOUBLE_PLANT: 'sunflower' };
const cropName = (key) => CROP_NAMES[key] ?? key.replace(/_ITEM$/, '').replace(/_/g, ' ').toLowerCase();

// Ported from treeot/hypixel-chat-bridge (MIT): !garden, !chocolatefactory, !forge
const garden = new StatCommand(['garden'], async ({ name }) => {
    const profile = await getPlayerHypixelFullProfile(name);
    const data = await getJsonFromUrl(`https://api.hypixel.net/v2/skyblock/garden?profile=${profile.profile_id}&key=${config.keys.hypixelApiKey}`);
    const garden = data?.garden;
    if (!garden) return `${profile.username} has no garden yet`;
    const crops = Object.entries(garden.resources_collected ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([crop, amount]) => `${cropName(crop)}: ${dot(amount)}`);
    return `${profile.username} has ${dot(garden.garden_experience ?? 0)} garden xp and ${(garden.unlocked_plots_ids ?? []).length}/24 plots` + (crops.length ? ` (${crops.join(', ')})` : '');
});

const chocolateFactory = new StatCommand(['chocolatefactory', 'cf', 'chocolate'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const easter = player.events?.easter;
    if (!easter || !Object.keys(easter).length) return `${player.username} has no Chocolate Factory data`;
    const employees = Object.values(easter.employees ?? {});
    return `${player.username} has ${dot(easter.chocolate_since_prestige ?? 0)} chocolate this prestige (${dot(easter.total_chocolate ?? 0)} all-time), ${
        Object.keys(easter.rabbits ?? {}).length
    } rabbits found` + (employees.length ? `, employees up to level ${Math.max(...employees)}` : '');
});

const forge = new StatCommand(['forge'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const items = Object.values(player.forge?.forge_processes ?? {}).flatMap((slots) => Object.values(slots ?? {}));
    if (!items.length) return `${player.username} has nothing in the forge`;
    const lines = items.map((item) => {
        const itemName = (item.id ?? 'unknown').replace(/_/g, ' ').toLowerCase();
        if (item.startTime === undefined) return `${itemName} (in progress)`;
        const left = item.startTime + (item.duration ?? 0) - Date.now();
        return left <= 0 ? `${itemName} (ready)` : `${itemName} (${getTimeString(left).trim()})`;
    });
    return `${player.username}'s forge: ${lines.join(', ')}`;
});

const motes = new StatCommand(['motes'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} has ${dot(player.currencies?.motes_purse ?? 0)} motes`;
});

const seconds = (ms) => `${(ms / 1000).toFixed(2)}s`;
// Best times for the main races; Dungeon Hub races list the fastest "anything, no return" run per course
const races = new StatCommand(['races', 'racetimes'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const r = player.player_stats?.races ?? {};
    const main = [
        ['end', r.end_race_best_time],
        ['chicken', r.chicken_race_best_time_2],
        ['foraging', r.foraging_race_best_time],
        ['rift', r.rift_race_best_time],
        ['giant mushroom', r.dungeon_hub?.giant_mushroom_anything_no_return_best_time],
        ['precursor ruins', r.dungeon_hub?.precursor_ruins_anything_no_return_best_time],
        ['crystal core', r.dungeon_hub?.crystal_core_anything_no_return_best_time],
    ].filter(([, time]) => Number.isFinite(time));
    if (!main.length) return `${player.username} has no race times`;
    return `${player.username}'s race PBs: ${main.map(([race, time]) => `${race} ${seconds(time)}`).join(', ')}`;
});

const auctionStats = new StatCommand(['bids', 'auctionstats', 'ahstats'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const a = player.player_stats?.auctions ?? {};
    return `${player.username} won ${dot(a.won ?? 0)}/${dot(a.bids ?? 0)} bids (highest ${numberformatter(a.highest_bid ?? 0, 2)}, ${numberformatter(
        a.gold_spent ?? 0,
        2
    )} spent) and sold ${dot(a.completed ?? 0)}/${dot(a.created ?? 0)} auctions for ${numberformatter(a.gold_earned ?? 0, 2)}`;
});

const sbTasks = new StatCommand(['sbtasks', 'tasks'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} completed ${dot((player.leveling?.completed_tasks ?? []).length)} SkyBlock level tasks`;
});

const attributes = new StatCommand(['attributes', 'shards'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const owned = player.shards?.owned ?? [];
    return `${player.username} has ${Object.keys(player.attributes?.stacks ?? {}).length} attributes, ${owned.length} shard types (${dot(
        owned.reduce((sum, shard) => sum + (shard.amount_owned ?? 0), 0)
    )} shards) and fused ${dot(player.shards?.fused ?? 0)} times`;
});

const gifts = new StatCommand(['gifts'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const g = player.player_stats?.gifts ?? {};
    return `${player.username} gave ${dot(g.total_given ?? 0)} gifts and received ${dot(g.total_received ?? 0)}`;
});

const firstJoin = new StatCommand(['firstjoin', 'joined'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const joined = player.profile?.first_join;
    if (!joined) return `${player.username}'s join date is unknown`;
    const years = (Date.now() - joined) / (365.25 * 86_400_000);
    return `${player.username} joined this profile on ${new Date(joined).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} (${years.toFixed(1)} years ago)`;
});

// last_death is in seconds since SkyBlock's start (2019-06-11 17:55 UTC)
const SKYBLOCK_EPOCH_SECONDS = 1560275700;
const lastDeath = new StatCommand(['lastdeath'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const last = player.player_data?.last_death;
    if (!last) return `${player.username} has never died`;
    const ago = Date.now() - (SKYBLOCK_EPOCH_SECONDS + last) * 1000;
    return `${player.username} last died ${getTimeString(Math.max(ago, 1000)).trim()} ago`;
});

module.exports = [
    motes,
    races,
    auctionStats,
    sbTasks,
    attributes,
    gifts,
    firstJoin,
    lastDeath,
    garden,
    chocolateFactory,
    forge,
    level,
    networth,
    coins,
    magicPower,
    petXp,
    candy,
    petScore,
    fees,
    essence,
    soulflow,
    peppers,
    pelts,
    fairySouls,
    minions,
    contests,
    logs,
    gold,
    auctions,
    bestiaryLevel,
];
