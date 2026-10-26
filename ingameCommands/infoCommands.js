const StatCommand = require('./statCommand.js');
const { getJsonFromUrl, getRateLimit } = require('../helper/skyblockApi.js');

// Calendar estimates from inventivetalent. The optional argument is a time zone, e.g. "!spooky europe/berlin".
function calendarCommand(names, event, describe) {
    return new StatCommand(names, async ({ name }) => {
        const data = await getJsonFromUrl(`https://hypixel-api.inventivetalent.org/api/skyblock/${event}/estimate`);
        let times;
        try {
            const toLocal = (date) => new Date(date).toLocaleString('en-US', { timeZone: name });
            times = { start: toLocal(data.estimate), end: toLocal(data.endEstimate) };
        } catch (e) {}
        return describe(data, times);
    });
}

const spooky = calendarCommand(['spooky', 'spookyfestival'], 'spookyFestival', (data, times) =>
    times ? `Next spooky festival is ${data.estimateRelative} (${times.start})` : `Next spooky festival is ${data.estimateRelative}`
);

const interest = calendarCommand(['interest'], 'interest', (data, times) =>
    times ? `Next interest is ${data.estimateRelative} (${times.start})` : `Next interest is ${data.estimateRelative}`
);

const jerry = calendarCommand(['jerry', 'yeti', 'winterevent', 'icefishing', 'winter', 'yetifishing'], 'jerryWorkshop', (data, times) =>
    times
        ? `Next jerry island opens ${data.estimateRelative} and closes ${data.endEstimateRelative} (${times.start} - ${times.end})`
        : `Next jerry island opens ${data.estimateRelative} and closes ${data.endEstimateRelative}`
);

const rateLimit = new StatCommand(['ratelimit'], async () => {
    const { remainingRequests, timeTillReset } = getRateLimit();
    return `There are ${remainingRequests} requests remaining. Refreshes in ${timeTillReset} seconds`;
});

// "!mayor": current SkyBlock mayor, their perks and minister (ported from treeot/hypixel-chat-bridge, MIT)
const mayor = new StatCommand(['mayor'], async () => {
    const data = await getJsonFromUrl('https://api.hypixel.net/v2/resources/skyblock/election');
    const current = data?.mayor;
    if (!current) return 'No mayor data available right now';
    const perks = (current.perks ?? []).map((perk) => perk.name);
    return `Mayor ${current.name}: ${perks.join(', ') || 'no perks'}` + (current.minister ? ` | Minister ${current.minister.name}: ${current.minister.perk?.name ?? ''}`.trimEnd() : '');
});

module.exports = [spooky, interest, jerry, rateLimit, mayor];
