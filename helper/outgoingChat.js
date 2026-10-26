// Everything the bot says in Minecraft: the safety guard on bot.chat, and relaying long messages as several lines.
// splitForChat is ported from treeot/hypixel-chat-bridge (src/minecraft/queue.ts); MIT, see ./safety/LICENSE.
const { checkOutbound, guardCommand } = require('./safety/index.js');

const MAX_LENGTH = 256;
const MAX_PARTS = 4;
// Gap between the lines of one split message, to stay under Hypixel's "sending commands too fast"
const PACE_MS = 1100;
// Sent on purpose by the limbo keeper (an illegal character gets the bot sent to limbo), so never filtered
const LIMBO_KICK = '§';

const REASON_TEXT = {
    slurs: 'it contains a slur',
    profanity: 'it contains profanity',
    links: 'links are not allowed',
    advertising: 'it looks like advertising',
    personalInfo: 'it contains personal info',
    custom: 'it contains a blocked word',
    tooLong: 'it is too long',
};

/** Breaks only at whitespace; a word longer than a line is the only thing cut mid-word. An over-long head yields no lines. */
function splitForChat(head, body, maxLength = MAX_LENGTH, maxParts = MAX_PARTS) {
    const budget = maxLength - head.length - 1;
    if (budget < 1) return { parts: [], truncated: true };
    const chunks = [];
    let current = '';
    for (const word of body.split(/\s+/).filter(Boolean)) {
        let rest = word;
        while (rest.length > budget) {
            if (current) {
                chunks.push(current);
                current = '';
            }
            chunks.push(rest.slice(0, budget));
            rest = rest.slice(budget);
        }
        if (!rest) continue;
        if (!current) current = rest;
        else if (current.length + 1 + rest.length <= budget) current += ` ${rest}`;
        else {
            chunks.push(current);
            current = rest;
        }
    }
    if (current) chunks.push(current);
    return { parts: chunks.slice(0, maxParts).map((chunk) => `${head} ${chunk}`), truncated: chunks.length > maxParts };
}

/** The safety-checked version of a bot's chat(): each line is cut to the line limit, then filtered (blocked lines are dropped and logged). */
function guardChat(send) {
    return (line) => {
        if (line === LIMBO_KICK) return send(line);
        // Cut before checking, so the cut cannot splice a blocked word afterwards
        let text = String(line).trim();
        text = text.slice(0, text.startsWith('/') ? MAX_LENGTH : MAX_LENGTH - 1);
        const guarded = guardCommand(text);
        if (!guarded.ok) {
            console.warn(`[safety] blocked outgoing line (${guarded.reason}): ${text}`);
            return;
        }
        send(guarded.command);
    };
}

/**
 * Guards bot.chat. mineflayer's chat plugin only assigns bot.chat a tick after createBot, so whatever
 * function gets assigned (now or later) is wrapped.
 */
function installChatGuard(bot) {
    let guarded = typeof bot.chat === 'function' ? guardChat(bot.chat.bind(bot)) : undefined;
    Object.defineProperty(bot, 'chat', {
        configurable: true,
        enumerable: true,
        get: () => guarded,
        set: (fn) => {
            guarded = typeof fn === 'function' ? guardChat(fn) : fn;
        },
    });
}

/**
 * Relays "author: content" with a chat command such as /gc or /oc, split over up to 4 lines ("/gc author: ...").
 * Returns { ok: true, lines, truncated } or { ok: false, reason }; the first line is sent immediately.
 */
function sendBridgeMessage(prefix, author, content) {
    const whole = checkOutbound(`${author}: ${content}`);
    if (!whole.ok) {
        console.warn(`[safety] blocked message from ${author} (${whole.reason})`);
        return { ok: false, reason: whole.reason };
    }

    // Nothing left of the message once links are removed
    if (whole.text === `${author}:`) return { ok: false, reason: 'links' };
    const authored = whole.text.startsWith(`${author}: `);
    const head = authored ? `${prefix} ${author}:` : prefix;
    const body = authored ? whole.text.slice(author.length + 2) : whole.text;
    const { parts, truncated } = splitForChat(head, body);
    if (parts.length === 0) return { ok: false, reason: 'tooLong' };

    parts.forEach((line, i) => setTimeout(() => minecraftClient.chat(line), i * PACE_MS));
    return { ok: true, lines: parts, truncated };
}

module.exports = { installChatGuard, sendBridgeMessage, splitForChat, REASON_TEXT, MAX_PARTS };
