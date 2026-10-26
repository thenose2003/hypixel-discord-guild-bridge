// Officers can make the bot run any Minecraft command ("!g kick X" -> "/g kick X")
// and use officer-only commands such as !rs, from game chat or the Discord bridge.

const OFFICER_IGNS = ['NoseThe', 'Dalosen', 'Premeatheouse', 'Nanaimi', 'Mezey', 'lil_hunter11', 'Hunter11_'];

const OFFICER_DISCORD_IDS = [
    '324261366854713348', // NoseThe
    '365168274864078851', // Dalosen
    '447264623230713898', // Premeatheouse
    '577462483682590740', // Nanaimi
    '243002023375667200', // Mezey
    '424923885402587137', // Hunter
    '547135400418738190', // Poison
    '286541220287741952', // Gian
];

function isOfficerIgn(ign) {
    return OFFICER_IGNS.some((officer) => officer.toLowerCase() === ign?.toLowerCase());
}

function isOfficerDiscordId(id) {
    return OFFICER_DISCORD_IDS.includes(id);
}

module.exports = { isOfficerIgn, isOfficerDiscordId };
