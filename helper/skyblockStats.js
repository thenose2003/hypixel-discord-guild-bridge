// Level, weight and formatting math for the stat commands (moved out of StatChecker.js).
// Levels use the v2 SkyBlock profile fields.

// Heart of the Mountain level from hotm xp
function getHotmLvl(xp) {
    if (xp < 3000) return 1;
    if (xp < 12000) return 2;
    if (xp < 37000) return 3;
    if (xp < 97000) return 4;
    if (xp < 197000) return 5;
    if (xp < 347000) return 6;
    if (xp < 557000) return 7;
    if (xp < 847000) return 8;
    if (xp < 1247000) return 9;
    return 10;
}

function getSlayerLvl(xp, type) {
    return xp >= 1000000
        ? 9
        : xp >= 400000
            ? 8
            : xp >= 100000
                ? 7
                : xp >= 20000
                    ? 6
                    : xp >= 5000
                        ? 5
                        : (type == "eman" && xp >= 1500) || (type != "eman" && xp >= 1000)
                            ? 4
                            : (type == "eman" && xp >= 250) || (type != "eman" && xp >= 200)
                                ? 3
                                : (type == "eman" && xp >= 30) ||
                                    (type == "spider" && xp >= 25) ||
                                    (type != "eman" && type != "spider" && xp >= 20)
                                    ? 2
                                    : (type == "eman" && xp >= 10) || (type != "eman" && xp >= 5)
                                        ? 1
                                        : 0;
}

function fixFarmingNames(name) {
    switch (name) {
        case "INK_SACK:3":
            return "cocoa beans";
        case "POTATO_ITEM":
            return "potato";
        case "CARROT_ITEM":
            return "carrot";
        case "CACTUS":
            return "cactus";
        case "SUGAR_CANE":
            return "sugar cane";
        case "MUSHROOM_COLLECTION":
            return "mushroom";
        case "PUMPKIN":
            return "pumpkin";
        case "NETHER_STALK":
            return "nether wart";
        case "WHEAT":
            return "wheat";
        case "MELON":
            return "melon";
        case "WILD_ROSE":
            return "wild rose";
        case "MOONFLOWER":
            return "moonflower";
        case "DOUBLE_PLANT":
            return "sunflower";
        default:
            return "weed";
    }
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function findCompletedRuns(data) {
    let total = 0;
    for (let mode in data.dungeon_types) {
        for (let floor in data.dungeon_types[mode].tier_completions) {
            total += data.dungeon_types[mode].tier_completions[floor];
        }
    }
    return total;
}

function findTotalRuns(data) {
    let total = 0;
    for (let floor in data.dungeon_types.catacombs.times_played) {
        total += data.dungeon_types.catacombs.times_played[floor];
    }
    return total;
}

function dungeonTime(time) {
    let seconds = parseInt(time / 1000);
    return (
        "" +
        parseInt(seconds / 60) +
        ":" +
        (seconds % 60 < 10 ? "0" + (seconds % 60) : seconds % 60)
    );
}

function findSA60(player, uncapped) {
    let mining = findSkillLevel(player?.player_data.experience.SKILL_MINING, false, uncapped);
    let fishing = findSkillLevel(player?.player_data.experience.SKILL_FISHING, false, uncapped);
    let farming = findSkillLevel(player?.player_data.experience.SKILL_FARMING, false, uncapped);
    let taming = findSkillLevel(player?.player_data.experience.SKILL_TAMING, false, uncapped);
    let foraging = findSkillLevel(player?.player_data.experience.SKILL_FORAGING, false, uncapped);
    let enchanting = findSkillLevel(player?.player_data.experience.SKILL_ENCHANTING, false, uncapped);
    let alchemy = findSkillLevel(player?.player_data.experience.SKILL_ALCHEMY, false, uncapped);
    let combat = findSkillLevel(player?.player_data.experience.SKILL_COMBAT, false, uncapped);
    let carpentry = findSkillLevel(player?.player_data.experience.SKILL_CARPENTRY, false, uncapped);
    let skillSum = mining + fishing + farming + taming + foraging + enchanting + alchemy + combat + carpentry;
    return skillSum / 9;
}

function findSA(player) {
    let mining = findSkillLevel(player?.player_data.experience.SKILL_MINING);
    let fishing = Math.min(50, findSkillLevel(player?.player_data.experience.SKILL_FISHING));
    let farming = findSkillLevel(player?.player_data.experience.SKILL_FARMING);
    let taming = findSkillLevel(player?.player_data.experience.SKILL_TAMING);
    let foraging = Math.min(50, findSkillLevel(player?.player_data.experience.SKILL_FORAGING));
    let enchanting = findSkillLevel(player?.player_data.experience.SKILL_ENCHANTING);
    let alchemy = Math.min(50, findSkillLevel(player?.player_data.experience.SKILL_ALCHEMY));
    let combat = findSkillLevel(player?.player_data.experience.SKILL_COMBAT);
    let carpentry = Math.min(50, findSkillLevel(player?.player_data.experience.SKILL_CARPENTRY));
    let skillSum = mining + fishing + farming + taming + foraging + enchanting + alchemy + combat + carpentry;
    return skillSum / 9;
}

function findSkillLevel(xp, capAt50 = false, uncapped = false) {
    if (!xp) return 0;
    let skillLevel = 0;
    let remainingSkillXp = xp;
    let requiredSkillXp = [
        50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500, //1-10
        5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000, //11-20
        300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, //21-30
        1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000, //31-40
        2300000, 2400000, 2500000, 2600000, 2750000, 2900000, 3100000, 3400000, 3700000, 4000000, //41-50
        4300000, 4600000, 4900000, 5200000, 5500000, 5800000, 6100000, 6400000, 6700000, 7000000, //51-60
    ];
    for (let skillXp of requiredSkillXp) {
        if (remainingSkillXp > skillXp) {
            skillLevel++;
            remainingSkillXp -= skillXp;
        } else {
            skillLevel += remainingSkillXp / skillXp;
            if (capAt50) return Math.min(50, skillLevel);
            return skillLevel;
        }
    }
    if (uncapped) {
        let skillXp = 7400000;
        let lastIncrease = 400000;
        while (remainingSkillXp > skillXp) {
            remainingSkillXp -= skillXp;
            lastIncrease += 100000;
            skillXp += lastIncrease;
            skillLevel++;
        }
        skillLevel += remainingSkillXp / skillXp;
    }
    if (capAt50) return Math.min(50, skillLevel);
    return skillLevel;
}

function findSocialLevel(xp) {
    if (!xp) return 0;
    let skillLevel = 0;
    let remainingSkillXp = xp;
    let requiredSkillXp = [50, 100, 150, 250, 500, 750, 1000, 1250, 1500, 2000,
        2500, 3000, 3750, 4500, 6000, 8000, 10000, 12500, 15000, 20000,
        25000, 30000, 35000, 40000, 50000]
    for (let skillXp of requiredSkillXp) {
        if (remainingSkillXp > skillXp) {
            skillLevel++;
            remainingSkillXp -= skillXp;
        } else {
            skillLevel += remainingSkillXp / skillXp;
            return skillLevel;
        }
    }
    return skillLevel;
}

function findRunecraftingLevel(xp) {
    if (!xp) return 0;
    let skillLevel = 0;
    let remainingSkillXp = xp;
    let requiredSkillXp = [
        50, 100, 125, 160, 200, 250, 315, 400, 500, 625, //1-10
        785, 1000, 1250, 1565, 2000, 2500, 3125, 4000, 5000, 6250, //11-20
        7850, 9800, 12250, 15300, 19100
    ];
    for (let skillXp of requiredSkillXp) {
        if (remainingSkillXp > skillXp) {
            skillLevel++;
            remainingSkillXp -= skillXp;
        } else {
            skillLevel += remainingSkillXp / skillXp;
            return skillLevel;
        }
    }
    return skillLevel;
}

function findCataLvl(xp, past50 = true) {
    if (!xp || isNaN(xp)) return 0;
    const cataXpTable = [
        50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10300, 14400, 20000, 27600, 38000, 52500, 71500, 97000, 132000, 180000, 243000, 328000, 445000,
        600000, 800000, 1065000, 1410000, 1900000, 2500000, 3300000, 4300000, 5600000, 7200000, 9200000, 12000000, 15000000, 19000000, 24000000, 30000000, 38000000, 48000000, 60000000, 75000000, 93000000, 116250000
    ]
    let remainingXp = xp;
    let level = 0;

    //levels 1 - 50
    for (let levelXp of cataXpTable) {
        if (levelXp <= remainingXp) {
            remainingXp -= levelXp;
            level++;
        } else {
            level += remainingXp / parseFloat(levelXp);
            return level;
        }
    }
    if (!past50) return level;
    //levels above 50
    level += parseInt(remainingXp / 200000000);
    remainingXp %= 200000000;
    level += remainingXp / 200000000.0;
    return level
}

//format numbers
function dot(number) {
    if (isNaN(number)) return 0;
    return String(parseInt(number)).replace(/\d(?=(?:\d{3})+$)/g, "$&,");
}
//space
function space(number) {
    if (isNaN(number)) return 0;
    return String(parseInt(number)).replace(/\d(?=(?:\d{3})+$)/g, "$& ");
}

function shortenDot(number) {
    let intPart = String(parseInt(number));
    let decimals = String(parseFloat(number).toFixed(2));
    return dot(intPart) + "." + decimals.substr(decimals.length - 2);
}

function getTimeString(time) {
    let totalSeconds = parseInt(time / 1000);
    let totalMinutes = parseInt(totalSeconds / 60);
    let totalHours = parseInt(totalMinutes / 60);
    let totalDays = parseInt(totalHours / 24);
    return (
        (totalDays > 0 ? `${totalDays}d ` : "") +
        (totalHours > 0 ? `${totalHours - totalDays * 24}h ` : "") +
        (totalMinutes > 0 ? `${totalMinutes - 60 * totalHours}m ` : "") +
        (totalSeconds > 0 ? `${totalSeconds - totalMinutes * 60}s ` : "")
    );
}

function getDungeonWeight(player) {
    let cata = player?.dungeons?.dungeon_types?.catacombs?.experience ?? 0;
    let healer = player?.dungeons?.player_classes?.healer?.experience ?? 0;
    let mage = player?.dungeons?.player_classes?.mage?.experience ?? 0;
    let archer = player?.dungeons?.player_classes?.archer?.experience ?? 0;
    let berserk = player?.dungeons?.player_classes?.berserk?.experience ?? 0;
    let tank = player?.dungeons?.player_classes?.tank?.experience ?? 0;
    const level50experience = 569809640;
    const weights = {
        catacombs: 0.0002149604615,
        healer: 0.0000045254834,
        mage: 0.0000045254834,
        berserker: 0.0000045254834,
        archer: 0.0000045254834,
        tank: 0.0000045254834,
    }
    let we = (xp, modifier) => {
        let base = Math.pow(findCataLvl(xp, false), 4.5) * modifier;
        if (xp < level50experience) {
            return [base, 0]
        }
        let remaining = xp - level50experience;
        let splitter = (4 * level50experience) / base;
        return [Math.floor(base), Math.pow(remaining / splitter, 0.968)];
    }
    return [we(cata, weights.catacombs), we(healer, weights.healer), we(archer, weights.archer), we(berserk, weights.berserker), we(mage, weights.mage), we(tank, weights.tank)];
}

function getSkillWeight(player) {
    const experience = player?.player_data?.experience;
    let combat = experience?.SKILL_COMBAT ?? 0;
    let foraging = experience?.SKILL_FORAGING ?? 0;
    let farming = experience?.SKILL_FARMING ?? 0;
    let fishing = experience?.SKILL_FISHING ?? 0;
    let enchanting = experience?.SKILL_ENCHANTING ?? 0;
    let alchemy = experience?.SKILL_ALCHEMY ?? 0;
    let taming = experience?.SKILL_TAMING ?? 0;
    let mining = experience?.SKILL_MINING ?? 0;

    const weights = {
        // Maxes out mining at 1,750 points at 60.
        mining: {
            exponent: 1.18207448,
            divider: 259634,
            maxXp: 111672425,
        },
        // Maxes out foraging at 850 points at level 50.
        foraging: {
            exponent: 1.232826,
            divider: 259634,
            maxXp: 55172425,
        },
        // Maxes out enchanting at 450 points at level 60.
        enchanting: {
            exponent: 0.96976583,
            divider: 882758,
            maxXp: 111672425,
        },
        // Maxes out farming at 2,200 points at level 60.
        farming: {
            exponent: 1.217848139,
            divider: 220689,
            maxXp: 111672425,
        },
        // Maxes out combat at 1,500 points at level 60.
        combat: {
            exponent: 1.15797687265,
            divider: 275862,
            maxXp: 111672425,
        },
        // Maxes out fishing at 2,500 points at level 50.
        fishing: {
            exponent: 1.406418,
            divider: 88274,
            maxXp: 55172425,
        },
        // Maxes out alchemy at 200 points at level 50.
        alchemy: {
            exponent: 1.0,
            divider: 1103448,
            maxXp: 55172425,
        },
        // Maxes out taming at 500 points at level 50.
        taming: {
            exponent: 1.14744,
            divider: 441379,
            maxXp: 55172425,
        },
    }
    let we = (xp, weight) => {
        let level = findSkillLevel(xp, weight.maxXp == 55172425, false)
        let base = Math.pow(level * 10, 0.5 + weight.exponent + level / 100) / 1250
        if (xp > weight.maxXp) {
            base = Math.round(base)
        }
        if (xp <= weight.maxXp) {
            return [base, 0]
        }
        let ov = Math.pow((xp - weight.maxXp) / weight.divider, 0.968);
        return [base, ov]
    }

    return [we(combat, weights.combat), we(foraging, weights.foraging), we(farming, weights.farming),
    we(fishing, weights.fishing), we(enchanting, weights.enchanting), we(alchemy, weights.alchemy), we(taming, weights.taming), we(mining, weights.mining)]
}

function getSlayerWeight(player) {
    const bosses = player?.slayer?.slayer_bosses;
    let rev = bosses?.zombie?.xp ?? 0;
    let tara = bosses?.spider?.xp ?? 0;
    let sven = bosses?.wolf?.xp ?? 0;
    let eman = bosses?.enderman?.xp ?? 0;

    const weights = {
        revenant: {
            divider: 2208,
            modifier: 0.15,
        },
        tarantula: {
            divider: 2118,
            modifier: 0.08,
        },
        sven: {
            divider: 1962,
            modifier: 0.015,
        },
        enderman: {
            divider: 1430,
            modifier: .017,
        }
    }
    let we = (xp, weight) => {
        if (xp < 1000000)
            return [xp / weight.divider, 0];
        let base = 1000000 / weight.divider;
        let remaining = xp - 1000000;
        let modifier = weight.modifier;
        let overflow = 0;
        while (remaining > 0) {
            let left = Math.min(remaining, 1000000);

            overflow += Math.pow(left / (weight.divider * (1.5 + modifier)), 0.942);
            modifier += weight.modifier;
            remaining -= left;
        }
        return [base, overflow]
    }

    return [we(rev, weights.revenant), we(tara, weights.tarantula), we(sven, weights.sven), we(eman, weights.enderman)]
}

module.exports = {
    getSlayerLvl,
    getHotmLvl,
    fixFarmingNames,
    getRandomElement,
    findCompletedRuns,
    findTotalRuns,
    dungeonTime,
    findSA60,
    findSA,
    findSkillLevel,
    findSocialLevel,
    findRunecraftingLevel,
    findCataLvl,
    dot,
    space,
    shortenDot,
    getTimeString,
    getDungeonWeight,
    getSkillWeight,
    getSlayerWeight,
};
