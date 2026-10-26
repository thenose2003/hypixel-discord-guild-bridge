const StatCommand = require('./statCommand.js');
const { getPlayerHypixel, getLilyWeight } = require('../helper/skyblockApi.js');
const { getSkillWeight, getSlayerWeight, getDungeonWeight, shortenDot } = require('../helper/skyblockStats.js');

// Senither weight: skills + slayers + dungeons
const weight = new StatCommand(['weight', 'fiske', 'fiskefillet', 'we'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let skillWeights = getSkillWeight(player);
    let slayerWeights = getSlayerWeight(player);
    let cataWeights = getDungeonWeight(player);

    let skillWe = skillWeights.reduce((prev, [we, ov]) => prev + we, 0);
    let skillOv = skillWeights.reduce((prev, [we, ov]) => prev + ov, 0);

    let slayerWe = slayerWeights.reduce((prev, [we, ov]) => prev + we, 0);
    let slayerOv = slayerWeights.reduce((prev, [we, ov]) => prev + ov, 0);

    let cataWe = cataWeights.reduce((prev, [we, ov]) => prev + we, 0);
    let cataOv = cataWeights.reduce((prev, [we, ov]) => prev + ov, 0);

    return `${player.username} has ${shortenDot(skillWe + skillOv + slayerWe + slayerOv + cataWe + cataOv)} weight (${shortenDot(
        slayerWe + slayerOv + skillWe + cataWe
    )} we / ${shortenDot(skillOv + cataOv)} ov)`;
});

// Lily weight from lily.antonio32a.com. Also answers any other "...weight" keyword
// that no command claims exactly (e.g. "lilyweight", "lappyweight").
const lilyWeight = new StatCommand(
    ['lilyweight', 'lwe', 'lappywe', 'lilywe'],
    async ({ name }) => {
        const weight_obj = await getLilyWeight(name);
        if (weight_obj == null) return;
        return (
            `${weight_obj.username} has ${shortenDot(weight_obj.data.total)} lily weight (${shortenDot(
                weight_obj.data.skill.base + weight_obj.data.skill.overflow
            )} skills, ` +
            `${shortenDot(weight_obj.data.slayer)} slayers, ${shortenDot(weight_obj.data.catacombs.experience)} cata lvl, ` +
            `${shortenDot(weight_obj.data.catacombs.completion.base + weight_obj.data.catacombs.completion.master)} floor completions)`
        );
    },
    { match: (stat) => stat.endsWith('weight') && stat !== 'weight', matchPriority: 5 }
);

module.exports = [weight, lilyWeight];
