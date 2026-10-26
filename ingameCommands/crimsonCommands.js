const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot } = require('../helper/skyblockStats.js');

const kuudra = new StatCommand(['kuudra'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const tiers = player?.nether_island_player_data?.kuudra_completed_tiers;
    let t1 = tiers?.none ?? 0;
    let t2 = tiers?.hot ?? 0;
    let t3 = tiers?.burning ?? 0;
    let t4 = tiers?.fiery ?? 0;
    let t5 = tiers?.infernal ?? 0;
    return `${player.username} completed ${dot(t1)} t1, ${dot(t2)} t2, ${dot(t3)} t3, ${dot(t4)} t4 and ${dot(t5)} t5 kuudra fights (${dot(
        t1 + t2 + t3 + t4 + t5
    )} total, ${dot(t1 + 2 * t2 + 3 * t3 + 4 * t4 + 5 * t5)} collection)`;
});

const dojo = new StatCommand(['dojo'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    const scores = player?.nether_island_player_data?.dojo;
    let force = scores?.dojo_points_mob_kb ?? 0;
    let stamina = scores?.dojo_points_wall_jump ?? 0;
    let mastery = scores?.dojo_points_archer ?? 0;
    let discipline = scores?.dojo_points_sword_swap ?? 0;
    let swiftness = scores?.dojo_points_snake ?? 0;
    let control = scores?.dojo_points_lock_head ?? 0;
    let tenacity = scores?.dojo_points_fireball ?? 0;
    return `Dojo highscores for ${player.username}: ${dot(force)} Force, ${dot(stamina)} Stamina, ${dot(mastery)} Mastery, ${dot(discipline)} Discipline, ${dot(
        swiftness
    )} Swiftness, ${dot(control)} Control, ${dot(tenacity)} Tenacity. Total score: ${dot(
        force + stamina + mastery + discipline + tenacity + swiftness + control
    )}`;
});

const reputation = new StatCommand(['reputation', 'rep'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let faction = player?.nether_island_player_data?.selected_faction;
    let mage = player?.nether_island_player_data?.mages_reputation ?? 0;
    let barb = player?.nether_island_player_data?.barbarians_reputation ?? 0;
    return faction
        ? `${player.username} is part of the ${faction === 'mages' ? 'mage' : 'barbarian'} faction with ${dot(mage)} mage and ${dot(barb)} barbarian reputation`
        : `${player.username} is not part of any faction yet.`;
});

const crimsonEssence = new StatCommand(['crimsonessence', 'crimson'], async ({ name }) => {
    const player = await getPlayerHypixel(name);
    let essence = player?.currencies?.essence?.CRIMSON?.current ?? 0;
    return `${player.username} has ${dot(essence)} crimson essence`;
});

module.exports = [kuudra, dojo, reputation, crimsonEssence];
