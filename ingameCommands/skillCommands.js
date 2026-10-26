const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { findSkillLevel, findSA, findSA60, findRunecraftingLevel, findSocialLevel, getSkillWeight, dot, shortenDot } = require('../helper/skyblockStats.js');

// [skill, extra aliases, cap the first level at 50]
const SKILLS = [
    ['combat', ['combatxp'], false],
    ['mining', ['miningxp'], false],
    ['foraging', ['foragingxp'], true],
    ['enchanting', ['enchantingxp'], false],
    ['fishing', ['fishingxp'], true],
    ['farming', ['farmingxp'], false],
    ['alchemy', ['alchemyxp'], true],
    ['taming', ['tamingxp'], true],
    ['carpentry', ['carp', 'carpentryxp'], true],
];
const skillCommands = SKILLS.map(
    ([skill, aliases, capAt50]) =>
        new StatCommand([skill, ...aliases], async ({ name }) => {
            const player = await getPlayerHypixel(name);
            const xp = player?.player_data.experience[`SKILL_${skill.toUpperCase()}`];
            return `${player.username} is ${skill} ${parseFloat(findSkillLevel(xp, capAt50)).toFixed(2)} (${parseFloat(findSkillLevel(xp, false, true)).toFixed(
                2
            )}) with ${dot(xp ?? 0)} ${skill} xp`;
        })
);

const runecrafting = new StatCommand(['runecrafting', 'runecraftingxp'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const xp = player?.player_data.experience.SKILL_RUNECRAFTING;
    return `${player.username} is runecrafting ${parseFloat(findRunecraftingLevel(xp)).toFixed(2)} with ${dot(xp ?? 0)} runecrafting xp`;
});

const social = new StatCommand(['social', 'socialxp'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let xp = player?.player_data?.experience?.SKILL_SOCIAL ?? 0;
    return `${player.username} is social ${parseFloat(findSocialLevel(xp)).toFixed(2)} with ${dot(xp)} social xp.`;
});

const skillAverage = new StatCommand(['skills', 'sa', 'skill', 'average', 'avg'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} has skill average ${parseFloat(findSA(player)).toFixed(2)} (${parseFloat(findSA60(player).toFixed(2))})`;
});

const uncappedSkillAverage = new StatCommand(['uncappedsa', 'uncsa', 'ucsa'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    return `${player.username} has a real skill average of ${parseFloat(findSA(player)).toFixed(2)}, but uncapped it would be ${parseFloat(
        findSA60(player, true).toFixed(2)
    )} `;
});

const skillXp = new StatCommand(['skillxp', 'skillsxp'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const xp = player.player_data.experience;
    const total =
        (xp.SKILL_ALCHEMY ?? 0) +
        (xp.SKILL_TAMING ?? 0) +
        (xp.SKILL_COMBAT ?? 0) +
        (xp.SKILL_ENCHANTING ?? 0) +
        (xp.SKILL_FISHING ?? 0) +
        (xp.SKILL_FORAGING ?? 0) +
        (xp.SKILL_FARMING ?? 0) +
        (xp.SKILL_MINING ?? 0) +
        (xp.SKILL_CARPENTRY ?? 0);
    return `${player.username} has ${dot(total)} total skill xp (+${dot(xp.SKILL_RUNECRAFTING ?? 0)} cosmetic skill xp)`;
});

const skillWeight = new StatCommand(['skillweight', 'skillwe'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let allWeights = getSkillWeight(player);
    let we = allWeights.reduce((prev, [weight, overflow]) => prev + weight, 0);
    let ov = allWeights.reduce((prev, [weight, overflow]) => prev + overflow, 0);
    return `${player.username} has ${shortenDot(we + ov)} skill weight (${shortenDot(we)} we / ${shortenDot(ov)} ov)`;
});

// "!allskills [ign]": every skill level at once (treeot/hypixel-chat-bridge's !skills; ours is the skill average)
const allSkills = new StatCommand(['allskills', 'skilllist', 'levels'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const xp = player.player_data.experience;
    const levels = SKILLS.map(([skill, , capAt50]) => `${skill} ${Math.floor(findSkillLevel(xp[`SKILL_${skill.toUpperCase()}`], capAt50))}`);
    return `${player.username}'s skills: ${levels.join(', ')} (avg ${parseFloat(findSA(player)).toFixed(2)})`;
});

module.exports = [allSkills, ...skillCommands, runecrafting, social, skillAverage, uncappedSkillAverage, skillXp, skillWeight];
