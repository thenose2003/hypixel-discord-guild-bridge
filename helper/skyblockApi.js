// Network layer for the stat commands: Mojang + Hypixel lookups with a shared
// 5 minute response cache and a throttle that backs off when the Hypixel
// ratelimit is nearly used up.
const config = require('../config.json');

const apiKey = config.keys.hypixelApiKey;

const refreshTime = 1000 * 5 * 60;
const cache = {};
let remainingRequests = 120;
let timeTillReset = 60;

function getRateLimit() {
    return { remainingRequests, timeTillReset };
}

async function getJsonFromUrl(url) {
    //wipe old cache entries
    for (let i in cache) {
        if (cache[i].lastUpdate < Date.now() - refreshTime) delete cache[i];
    }
    //check if url is still in cache
    if (url in cache) return cache[url].data;

    //prevent api key death
    if (remainingRequests < 10) {
        //sleep till refresh time
        await new Promise((resolve) => setTimeout(resolve, timeTillReset * 1000));
    }

    let response = await fetch(url);
    if (url.includes('senither') || url.includes('hypixel')) {
        remainingRequests = response.headers.get('ratelimit-remaining');
        timeTillReset = response.headers.get('ratelimit-reset');
    }
    if (response.status != 200) {
        switch (response.status) {
            case 403:
                console.log('API key is invalid, requesting a new one');
                break;
            case 429:
                console.log('API rate limit reached');
                break;
            case 500:
                console.log('Internal API error');
                break;
            case 502:
                console.log('API not available');
                break;
            case 503:
                console.log('API in maintenance mode');
                break;
            default:
                console.log('Unknown error requesting url');
        }
        return;
    }
    let jsonData = await response.json();

    //update cache
    cache[url] = { lastUpdate: Date.now(), data: jsonData };
    return jsonData;
}

async function getPlayerUUID(name) {
    if (name == '' || name == null) return;
    // get player uuid from mojang api
    let response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${name}`);
    if (response.status != 200) {
        switch (response.status) {
            case 204:
                console.log(`Player ${name} does not exist`);
                break;
            default:
                console.log('Unknown error: ' + response.status);
        }
        return;
    }
    let data = await response.json();
    return { uuid: data.id, name: data.name };
}

// Mojang removed the name history endpoint, so this uses the session server
async function getUsernameFromUUID(uuid) {
    let response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
    let data = await response.json();
    return data.name;
}

// Selected SkyBlock profile's member data for a player, plus `username`
async function getPlayerHypixel(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;

    let response = await getJsonFromUrl(`https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}&key=${apiKey}`);

    if (response == null || !('success' in response) || !response.success || !('profiles' in response)) {
        console.log('Player has no skyblock data');
        return;
    }
    //find latest profile
    let currentProfile = {};
    Object.values(response?.profiles || {}).forEach((profile) => {
        if (profile.selected) {
            currentProfile = profile.members[uuid];
        }
    });
    currentProfile.username = uuidInfo.name;
    return currentProfile;
}

// Whole selected SkyBlock profile (all members, banking, ...) plus `username`, `uuid` and `museumData`
async function getPlayerHypixelFullProfile(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;

    let response = await getJsonFromUrl(`https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}&key=${apiKey}`);

    if (response == null || !('success' in response) || !response.success || !('profiles' in response)) {
        console.log('Player has no skyblock data');
        return;
    }

    let museumData = await getJsonFromUrl(`https://api.hypixel.net/v2/skyblock/museum?uuid=${uuid}&key=${apiKey}`);

    //find latest profile
    let currentProfile = {};
    for (let i in response.profiles) {
        let profile = response.profiles[i];
        if (profile.selected) {
            currentProfile = profile;
        }
    }
    currentProfile.username = uuidInfo.name;
    currentProfile.uuid = uuidInfo.uuid;
    currentProfile.museumData = museumData;
    return currentProfile;
}

// Hypixel network player object (achievements, social media, login times, ...)
async function getPlayerStatsHypixel(name) {
    let response = await getJsonFromUrl(`https://api.hypixel.net/player?key=${apiKey}&name=${name}`);
    if (response == null || !('success' in response) || !response.success || !('player' in response)) {
        console.log('Player has no data');
        return;
    }
    return response.player;
}

async function getPlayerStatus(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    let response = await getJsonFromUrl(`https://api.hypixel.net/status?key=${apiKey}&uuid=${uuid}`);
    if (response == null || !('success' in response) || !response.success) {
        console.log('Player has no data');
        return;
    }
    response.username = uuidInfo.name;
    return response;
}

async function getLilyWeight(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    let response = await getJsonFromUrl(`https://lily.antonio32a.com/${uuid}?key=${apiKey}`);
    if (response == null || !('success' in response) || !response.success) {
        console.log('Error catching lily weight');
        return;
    }
    response.username = uuidInfo.name;
    return response;
}

async function getGuildData(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    let response = await getJsonFromUrl(`https://api.hypixel.net/guild?key=${apiKey}&player=${uuid}`);
    response.username = uuidInfo.name;
    response.uuid = uuidInfo.uuid;
    return response;
}

async function getGuildByGuildName(name) {
    return await getJsonFromUrl(`https://api.hypixel.net/guild?key=${apiKey}&name=${name}`);
}

async function getAuctionInfo(name) {
    let playerInfo = await getPlayerHypixelFullProfile(name);
    let profileId = playerInfo.profile_id;
    let response = await getJsonFromUrl(`https://api.hypixel.net/skyblock/auction?key=${apiKey}&profile=${profileId}`);
    if (response == null || !('success' in response) || !response.success || !('auctions' in response)) {
        console.log('Player has no auction data');
        return;
    }
    response.username = playerInfo.username;
    response.uuid = playerInfo.uuid;
    return response;
}

module.exports = {
    getRateLimit,
    getJsonFromUrl,
    getPlayerUUID,
    getUsernameFromUUID,
    getPlayerHypixel,
    getPlayerHypixelFullProfile,
    getPlayerStatsHypixel,
    getPlayerStatus,
    getLilyWeight,
    getGuildData,
    getGuildByGuildName,
    getAuctionInfo,
};
