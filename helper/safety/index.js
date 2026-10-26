// Ban-safety filter for everything the bot says in Minecraft.
// Ported from treeot/hypixel-chat-bridge (src/safety/index.ts); MIT License,
// Copyright (c) 2026 treeot and contributors, see ./LICENSE.
// Changes: settings come from config.safetyFilter, and links to allowedLinkDomains are kept (!paste, !render).
const config = require('../../config.json');
const { containsProfanity, containsSlur, normalize } = require('./profanity.js');

const DEFAULT_SAFETY = {
    enabled: true,
    categories: { slurs: true, profanity: true, links: true, advertising: true, personalInfo: true },
    blockedWords: [],
    allowedWords: [],
    allowedLinkDomains: ['sourceb.in', 'imgur.com'],
};

// config.safetyFilter (all keys optional) merged over the defaults
function getSafetySettings() {
    const custom = config.safetyFilter || {};
    const list = (value, fallback) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : fallback);
    const categories = { ...DEFAULT_SAFETY.categories };
    for (const key of Object.keys(categories)) {
        if (typeof custom.categories?.[key] === 'boolean') categories[key] = custom.categories[key];
    }
    return {
        enabled: custom.enabled !== false,
        categories,
        blockedWords: list(custom.blockedWords, []),
        allowedWords: list(custom.allowedWords, []),
        allowedLinkDomains: list(custom.allowedLinkDomains, DEFAULT_SAFETY.allowedLinkDomains),
    };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRegex = (word) => new RegExp(`(?<![a-z0-9])${escapeRegex(word)}(?![a-z0-9])`, 'gi');

const EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
// Separators: `.` (spaces allowed), `-` attached on the left, ` - ` spaced on both sides, or whitespace.
// A `-` with space before and a digit right after is a sign (`100 64 -200`), so it ends the run.
const DIGIT_RUN = /\+?\d+(?:(?:\s*\.\s*|-\s*|\s+-\s+|\s+)\d+)+/g;
// `[dot]`, `( dot )`, `{.}`, `<dot>`: any bracket pair around `dot` or `.`.
const DOT_TOKEN = String.raw`[\[({<]\s*(?:dot|\.)\s*[\])}>]`;
const IPV4 = new RegExp(String.raw`\b(?:\d{1,3}\s*(?:\.|\bdot\b|${DOT_TOKEN})\s*){3}\d{1,3}\b`, 'i');
const IPV6 = /\b(?:[0-9a-f]{1,4}:){4,7}[0-9a-f]{1,4}\b/i;

const PAYMENT = /\b(paypal|cash ?app|venmo|zelle|crypto|bitcoin|btc)\b/;
const RMT = /\b(sell|selling|buy|buying)\b.{0,40}\b(coins?|mil|bil)\b/;
// Checked on the un-folded text: `normalize` turns `$` into `s`.
const MONEY = /[$€£]|\b(usd|eur|gbp|irl|dollars?)\b/i;
const FREE_STUFF = /\bfree\s+(rank|mvp\+*|vip\+*|coins|nitro)\b/;
const SERVER_AD = /\b(join|play on|come to)\s+(my|our)\s+(server|smp|network)\b/;
const GIVEAWAY = /\bgiveaway\b.{0,40}\b(dm|message|add)\b/;

const BARE_DOT = new RegExp(DOT_TOKEN, 'gi');
const URL_RE = /\b(?:https?:\/\/(?:www\.)?[a-z0-9-]+|(?:www\.)?[a-z0-9-]{2,})(?:\.[a-z]{2,}){1,2}(?:\/\S*)?/gi;
const DISCORD_INVITE = /discord\s*(?:\.|dot)\s*gg\/?\S*/gi;
const OBFUSCATED_DOMAIN = new RegExp(String.raw`\b[a-z0-9-]{2,}\s*(?:${DOT_TOKEN}|\s+dot\s+)\s*[a-z]{2,}\b`, 'gi');

function isAdvertising(scan) {
    const n = normalize(scan);
    if (PAYMENT.test(n) || FREE_STUFF.test(n) || SERVER_AD.test(n) || GIVEAWAY.test(n)) return true;
    return RMT.test(n) && MONEY.test(scan);
}

/** Thousands grouping (`1.000.000`) is exempt, but a leading `+` dial code never is. */
function hasPhoneNumber(text) {
    for (const [run] of text.matchAll(DIGIT_RUN)) {
        const groups = run.replace('+', '').split(/\s*[.-]\s*|\s+/);
        if (groups.join('').length < 7) continue;
        const thousands = !run.startsWith('+') && groups[0].length <= 3 && groups.slice(1).every((g) => g.length === 3);
        if (!thousands) return true;
    }
    return false;
}

function findBlock(text, s) {
    const on = s.categories;
    if (on.slurs && containsSlur(text)) return 'slurs';

    let scan = text;
    for (const w of s.allowedWords) if (w.trim()) scan = scan.replace(wordRegex(w.trim()), ' ');

    const folded = normalize(text);
    for (const w of s.blockedWords) {
        const word = normalize(w.trim());
        if (word && wordRegex(word).test(folded)) return 'custom';
    }

    if (on.profanity && containsProfanity(scan)) return 'profanity';
    if (on.personalInfo && (EMAIL.test(text) || hasPhoneNumber(text) || IPV4.test(text) || IPV6.test(text))) return 'personalInfo';
    if (on.advertising && isAdvertising(scan)) return 'advertising';
    return null;
}

// Marks where a link was removed; regexes treat it like whitespace.
const CUT = '  ';
const CUT_RE = /\s*\s*/g;

function isAllowedLink(url, s) {
    const host = url
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
    return s.allowedLinkDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function stripLinks(text, s) {
    return text
        .replace(DISCORD_INVITE, CUT)
        .replace(OBFUSCATED_DOMAIN, CUT)
        .replace(BARE_DOT, CUT)
        .replace(URL_RE, (url) => (isAllowedLink(url, s) ? url : CUT));
}

/** { ok: true, text } with links removed, or { ok: false, reason } when the text must not be sent. */
function checkOutbound(text, s = getSafetySettings()) {
    if (!s.enabled) return { ok: true, text: text.trim() };
    const before = findBlock(text, s);
    if (before) return { ok: false, reason: before };

    let result = text.trim();
    if (s.categories.links) {
        let marked = result;
        // Strip until stable: removing a link can expose another one.
        for (let i = 0; i < 5; i++) {
            const next = stripLinks(marked, s);
            if (next === marked) break;
            marked = next;
        }
        result = marked.replace(CUT_RE, ' ').replace(/\s+/g, ' ').trim();
        if (!result && text.trim()) return { ok: false, reason: 'links' };
        // Stripping can splice fragments into a slur ("n <link> igger", "nig [dot] ger"):
        // check the text with each removed link glued shut.
        if (s.categories.slurs && containsSlur(marked.replace(CUT_RE, ''))) return { ok: false, reason: 'slurs' };
        const after = findBlock(result, s);
        if (after) return { ok: false, reason: after };
    }
    return { ok: true, text: result };
}

const CHAT_HEAD =
    /^\s*(\/(?:(?:g|guild|p|party)\s+(?:chat|officerchat)|gchat|ochat|achat|pchat|gc|oc|pc|ac|reply|shout|message|whisper|msg|tell|r|w))(?=\s|$)\s*(.*)$/is;
const TARGETED = new Set(['/msg', '/w', '/tell', '/message', '/whisper']);

function stripMinecraftUnsafe(text) {
    return text.replace(/§[0-9a-fk-orx]?/gi, '').replace(/\p{Cc}+/gu, ' ');
}

/**
 * Checks one line the bot is about to send: { ok: true, command } (possibly with links removed) or { ok: false, reason }.
 * Chat commands (/gc, /oc, /msg, ...) have their text filtered; name/rank/duration-only commands pass;
 * anything else is blocked if the filter would block or change its arguments.
 */
function guardCommand(raw, s = getSafetySettings()) {
    if (!s.enabled) return { ok: true, command: raw };
    // Every line (commands too) loses § codes and control characters.
    const command = stripMinecraftUnsafe(raw);
    if (!command.trimStart().startsWith('/')) {
        const v = checkOutbound(command, s);
        return v.ok ? { ok: true, command: v.text } : v;
    }

    const m = CHAT_HEAD.exec(command);
    if (m) {
        let head = m[1].replace(/\s+/g, ' ');
        let payload = m[2];
        if (TARGETED.has(head.toLowerCase())) {
            const t = /^(\S+)\s*(.*)$/s.exec(payload);
            if (!t) return { ok: true, command: command.trim() };
            const target = checkOutbound(t[1], s);
            if (!target.ok) return target;
            if (target.text !== t[1]) return { ok: false, reason: 'links' };
            head += ` ${t[1]}`;
            payload = t[2];
        }
        if (!payload.trim()) return { ok: true, command: command.trim() };
        const v = checkOutbound(payload, s);
        return v.ok ? { ok: true, command: `${head} ${v.text}` } : v;
    }

    const words = command.trim().split(/\s+/);
    const name = words[0].toLowerCase();
    const sub = words[1]?.toLowerCase() ?? '';
    const guild = name === '/g' || name === '/guild';
    const party = name === '/p' || name === '/party';

    // `/g kick <ign> <reason>`: only the reason is free text.
    if (guild && sub === 'kick') return checkArgs(command, /^\s*\S+\s+\S+\s+\S+\s*(.*)$/s.exec(command)?.[1] ?? '', s);

    const argOnly = ARG_ONLY.has(name) || (guild && GUILD_ARG_ONLY.has(sub)) || (party && PARTY_ARG_ONLY.has(sub));
    // IGN/rank/duration arguments are never content-scanned; anything that doesn't look like one falls through.
    if (argOnly && ARG_SHAPE.test(words.slice(1).join(' '))) return { ok: true, command };

    // `/g motd|tag|description …` and unknown commands: fail closed on the whole tail.
    return checkArgs(command, /^\s*\/\S+\s*(.*)$/s.exec(command)?.[1] ?? '', s);
}

const ARG_ONLY = new Set(['/locraw', '/limbo', '/lobby', '/l', '/hub', '/rejoin']);
const GUILD_ARG_ONLY = new Set([
    'accept',
    'invite',
    'promote',
    'demote',
    'setrank',
    'mute',
    'unmute',
    'online',
    'list',
    'members',
    'log',
    'top',
    'info',
    'history',
    'transfer',
]);
const PARTY_ARG_ONLY = new Set(['invite', 'kick', 'transfer', 'promote', 'demote', 'warp', 'disband', 'list', 'leave', 'accept']);
const ARG_SHAPE = /^[\w\s]*$/;

/** Non-chat argument text: blocked if the filter would block OR rewrite it (non-chat commands are never rewritten). */
function checkArgs(command, rest, s) {
    if (!rest.trim()) return { ok: true, command };
    const v = checkOutbound(rest, s);
    if (!v.ok) return v;
    if (v.text.replace(/\s+/g, ' ') !== rest.replace(/\s+/g, ' ').trim()) return { ok: false, reason: 'links' };
    return { ok: true, command };
}

module.exports = { getSafetySettings, checkOutbound, guardCommand, stripMinecraftUnsafe, DEFAULT_SAFETY };
