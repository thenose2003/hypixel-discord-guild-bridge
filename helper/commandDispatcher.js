const config = require('../config.json');

// Exact names/aliases win over pattern matches; lower matchPriority wins among patterns.
// Officer-only commands are invisible to everyone else, game-only ones to Discord.
function findCommand(key, { isOfficer = false, fromDiscord = false } = {}) {
    const commands = [...(minecraftClient?.commands || [])].filter((c) => (isOfficer || !c.officerOnly) && (!fromDiscord || !c.gameOnly));
    return (
        commands.find((c) => c.triggers(key)) ||
        commands.filter((c) => c.matches(key)).sort((a, b) => (a.matchPriority ?? 100) - (b.matchPriority ?? 100))[0]
    );
}

// "!g kick X" -> "/g kick X" (also accepts "!/g kick X")
function runAsMinecraftCommand(text) {
    const command = text.trim().substring(config.ingameCommands.trigger.length).replace(/^\//, '');
    if (!command) return false;
    console.log(`/${command}`);
    minecraftClient.chat(`/${command}`);
    return true;
}

/**
 * Runs the command for a chat message such as "!cata NoseThe" (or "!s cata NoseThe"), from game chat or the
 * Discord bridge. At most one thing happens per message:
 *   1. "!/<anything>" from an officer runs as a Minecraft command (for names a bot command shadows, e.g. "!/w").
 *   2. A bot command (exact name/alias first, then patterns like "pb*"); officer-only ones need `isOfficer`.
 *   3. Otherwise, from an officer, the text runs as a Minecraft command ("!g kick X" -> "/g kick X").
 * The command gets { fromDiscord, isOfficer, discordClient, discordMember } as context.
 * Returns true if something ran.
 */
function dispatchCommand(text, author, { fromDiscord = false, isOfficer = false, discordClient, discordMember } = {}) {
    const trigger = config.ingameCommands.trigger;
    if (fromDiscord && config.ingameCommands.discordEnabled === false) return false;

    const words = text.trim().split(' ');
    if (!words[0].startsWith(trigger)) return false;
    if (words[0].startsWith(`${trigger}/`)) return isOfficer && runAsMinecraftCommand(text);

    // "!s cata name" / "!stats cata name" are the same as "!cata name"
    if ([`${trigger}s`, `${trigger}stats`].includes(words[0].toLowerCase()) && words.length > 1) {
        words.shift();
        words[0] = trigger + words[0];
    }

    const key = words[0].substring(trigger.length).toLowerCase().replace(/-/g, '');
    if (!key) return false;

    const command = findCommand(key, { isOfficer, fromDiscord });
    // A game-only command typed on Discord does nothing (it must not fall through to officer passthrough)
    if (!command && fromDiscord && findCommand(key, { isOfficer })?.gameOnly) return false;
    if (!command) return isOfficer && runAsMinecraftCommand(text);

    command.execute(words.join(' '), author, { fromDiscord, isOfficer, discordClient, discordMember }).catch((err) => {
        minecraftClient.chat(`/gc @${author} ${err}`);
    });
    return true;
}

module.exports = { dispatchCommand, findCommand };
