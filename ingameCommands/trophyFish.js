const { getPlayer, addCommas } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js')
const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot } = require('../helper/skyblockStats.js');

class TrophyFishCommand extends BaseCommand {

    constructor() {
        super('trophy');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const bronzeSet = new Set();
        const silverSet = new Set();
        const goldSet = new Set();
        const diamondSet = new Set();

        for (let fish in playerProfile?.trophy_fish) {
            if (fish.endsWith('bronze')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
            } else if (fish.endsWith('silver')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
                silverSet.add(trophyFishName);
            } else if (fish.endsWith('gold')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
                silverSet.add(trophyFishName);
                goldSet.add(trophyFishName);
            } else if (fish.endsWith('diamond')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
                silverSet.add(trophyFishName);
                goldSet.add(trophyFishName);
                diamondSet.add(trophyFishName);
            }
        }

        const bronzeCount = bronzeSet.size;
        const silverCount = silverSet.size;
        const goldCount = goldSet.size;
        const diamondCount = diamondSet.size;

        const totalTrophyFish = playerProfile?.trophy_fish?.total_caught || 0;

        let detailMessage = "";
        if (bronzeCount < 15) {
            detailMessage = `(${bronzeCount}/15 to bronze)`;
        } else if (silverCount < 18) {
            detailMessage = `(${silverCount}/18 to silver)`;
        } else if (goldCount < 18) {
            detailMessage = `(${goldCount}/18 to gold)`;
        } else if (diamondCount < 18) {
            detailMessage = `(${diamondCount}/18 to diamond)`;
        }

        return this.sendReply(`${username} fished up ${addCommas(totalTrophyFish)} trophy fish ${detailMessage}`)
    }
}

// [names, trophy_fish key, display name]
const TROPHY_FISH = [
    [['gushers', 'gushie', 'gusher', 'gushies'], 'gusher', 'gushers'],
    [['slugfish', 'slugie', 'sluggie'], 'slugfish', 'slugfish'],
    [['blobfish', 'blobbie', 'blobies', 'blobie', 'blobbies'], 'blobfish', 'blobfish'],
    [['goldenfish', 'golden', 'goldfish'], 'golden_fish', 'golden fish'],
    [['stonefish', 'volcanic'], 'volcanic_stonefish', 'volcanic stonefish'],
    [['manaray', 'mana', 'manafish'], 'mana_ray', 'mana rays'],
    [['obfuscated', 'obf', 'obfuscated1', 'obf1', 'tier1', 't1', 'corrupted1'], 'obfuscated_fish_1', 'obfuscated 1'],
    [['obfuscated2', 't2', 'tier2', 'obf2', 'corrupted2'], 'obfuscated_fish_2', 'obfuscated 2'],
    [['obfuscated3', 't3', 'tier3', 'obf3', 'corrupted3'], 'obfuscated_fish_3', 'corrupted 3'],
    [['lavahorse', 'horse'], 'lava_horse', 'lava horses'],
    [['moldfin', 'mold'], 'moldfin', 'moldfin'],
    [['karate'], 'karate_fish', 'karate fish'],
    [['soulfish', 'soul'], 'soul_fish', 'soul fish'],
    [['vanille'], 'vanille', 'vanilles'],
    [['skeletonfish', 'skeleton'], 'skeleton_fish', 'skeleton fish'],
    [['skitter', 'sulphur', 'skitters'], 'sulphur_skitter', 'sulphur skitters'],
    [['flyfish'], 'flyfish', 'flyfish'],
    [['flounder', 'steaming', 'steaminghot', 'flounders'], 'steaming_hot_flounder', 'steaming hot flounders'],
];
const trophyFishSpecies = TROPHY_FISH.map(
    ([names, key, display]) =>
        new StatCommand(names, async ({ name }) => {
            const player = await getPlayerHypixel(name);
            const fish = player.trophy_fish;
            const bronze = fish[`${key}_bronze`] ?? 0;
            const silver = fish[`${key}_silver`] ?? 0;
            const gold = fish[`${key}_gold`] ?? 0;
            const diamond = fish[`${key}_diamond`] ?? 0;
            const total = fish[key] ?? 0;
            return `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond ${display} (${dot(total)} total)`;
        })
);

module.exports = [new TrophyFishCommand(), ...trophyFishSpecies]