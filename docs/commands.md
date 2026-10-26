# Commands

There are two command systems: **`!` commands** (`ingameCommands/`), which work the same in game chat and the Discord bridge channels, and **Discord slash commands** (`slashCommands/`). Officers can also make the bot run any Minecraft command with the same `!` prefix.

## In-game commands: `ingameCommands/`

### Loading

`handlers/minecraftCommands.js` `require`s every file in `ingameCommands/`. Each file exports one `BaseCommand` instance or an **array** of them. Anything else is skipped silently, which is how `baseCommand.js` and `statCommand.js`, the class files, get through. Names listed in `config.ingameCommands.disabled` are skipped too. The loaded commands live in `minecraftClient.commands`, which is rebuilt on every reconnect.

### Dispatch: `helper/commandDispatcher.js`

`dispatchCommand(text, author, { fromDiscord })` is the single entry point:
- **Minecraft:** `events/minecraft/message.js` calls it for guild and officer chat lines that start with the trigger (`!`).
- **Discord:** `events/discord/messageCreate.js` calls it for messages in the bridge channels, with `fromDiscord: true`. The author is the Discord username, or the linked IGN when the user has run `/link`.

The rules are:
1. A leading `!s` / `!stats` is dropped, so `!s cata X` is the same as `!cata X`.
2. The key is the first word without the trigger, lowercased, with all `-` removed (`!PB-M7` → `pbm7`).
3. `findCommand(key)` checks exact matches first: `name`, then code `aliases`, then `config.ingameCommands.alias[name]`. If nothing matches, it falls back to pattern matches (`matches(key)`), and the lowest `matchPriority` wins. The pattern commands are `lb`/`leaderboard*` (1), `pb*` (2), `runs*` (3), `team*` (4), and `*weight` → lily weight (5).
4. Every command works from both sides. Commands with `officerOnly` (`!rs`) are only visible to officers (`helper/officers.js`). Nothing runs from Discord if `ingameCommands.discordEnabled` is `false`.
5. **At most one command runs per message.** It's called as `execute(text, author, { fromDiscord, isOfficer, discordClient, discordMember })`. If a non-stat command throws, `@author <error>` is sent to guild chat.
6. **Officers:** if no bot command matches, the text runs as a Minecraft command (`!g kick X` → `/g kick X`). `!/<command>` always runs as a Minecraft command, which is how to reach names that a bot command shadows: `!/w` (whisper; `w` is a weight alias), `!/guild`, `!/l` and `!/ah`.

### `BaseCommand` (`ingameCommands/baseCommand.js`)

- `constructor(name, aliases = [])`. Set `this.officerOnly = true` for officer-only commands.
- `triggers(key)` handles exact matches. `matches(key)` handles pattern matches and returns `false` by default.
- `getArgs(message, author)` returns `{ username: word[1] || author, profile: word[2] }`.
- `sendReply(text)` sends `/gc @<text>`. `runCommand(text)` sends `/<text>`.
- `execute(message, author)` receives the normalized text, for example `!vampire SomeIGN`.

### `StatCommand` (`ingameCommands/statCommand.js`) for stat lookups

Most commands are this type. They are defined as data plus a `run` function:

```js
const StatCommand = require('./statCommand.js');
const { getPlayerHypixel } = require('../helper/skyblockApi.js');
const { dot } = require('../helper/skyblockStats.js');

// first name = command name (and its config alias key), the rest are aliases
const foo = new StatCommand(['foo', 'foos'], async ({ name, full, stat, parts, words }) => {
    const player = await getPlayerHypixel(name); // selected profile's member data + .username
    return `${player.username} has ${dot(player.foo ?? 0)} foo`;   // return null/undefined for no reply
});
module.exports = [foo];
```

- The args are parsed like the old StatChecker did:
  - `name` is the lowercased `word[1]` or the author.
  - `full` is everything after the command, lowercased.
  - `stat` is the normalized key.
  - `parts` are the lowercased words, and `words` keeps the original case.
- Replies go out as `/gc @Stats: <text>`. `LeaderboardCommand` overrides this to send `/gc @<text>`.
- **Errors are logged and never sent to chat.** A throw, or a `TypeError` on missing data, means no reply. That matches the old behavior.
- Pattern commands pass `{ match: (stat) => bool, matchPriority }` as the third argument.
- For many similar commands, use a table and `.map()` (see `SKILLS`, `SLAYERS`, `TROPHY_FISH` and `KILL_STATS`).
- Replies must stay under about 240 chars. The chat guard cuts lines at 256, and only Discord/API relay messages are split into several lines. Replies also pass the safety filter, so links outside `safetyFilter.allowedLinkDomains` are stripped.
- `garden`, `chocolatefactory`, `forge`, `floor`, `player`, `mayor`, `allskills` and `8ball` were ported from treeot/hypixel-chat-bridge (MIT).

Shared helpers:
- **`helper/skyblockApi.js`:** `fetch` with a 5-minute URL cache and a rate-limit throttle, plus `getPlayerUUID`, `getUsernameFromUUID` (session server), `getPlayerHypixel` (member data), `getPlayerHypixelFullProfile` (whole profile + `museumData`), `getPlayerStatsHypixel` (network player), `getPlayerStatus`, `getPlayerFriends`, `getGuildData`, `getGuildByGuildName`, `getAuctionInfo`, `getLilyWeight` and `getRateLimit`.
- **`helper/skyblockStats.js`:** `dot` / `space` / `shortenDot` formatting, plus skill, cata, slayer, social, runecrafting and HOTM levels, skill average, senither-style weights, magic power (talisman data from `constants.js` unless the remote list loads), `dungeonTime`, `getTimeString` and so on.

These are separate from the older `helper/functions.js`, `helper/skills.js` and `helper/weight.js`, which use axios and v1 field names and are used by the slash commands, `requirements` and a few `BaseCommand`s.

### Files

| File | Commands (name: aliases) |
|---|---|
| `dungeonCommands.js` | `lastrun`, `class: selectedclass`, `dailyruns: runstoday` (Hypixel day = US Eastern), `floor <0-7|m1-m7> [ign]`, `pb*`, `runs*`, `team*` (prefix), `cata`, `tank` `healer` `berserk` `mage` `archer` (+`xp` aliases), `classaverage: classes ca`, `secrets`, `secretratio: ratio`, `blood: watcher…`, `dungeonweight: catawe dungwe…` |
| `skillCommands.js` | `allskills: skilllist levels` (every level at once), the 9 skills (+`xp`, `carp`), `runecrafting`, `social`, `skills: sa skill average avg`, `uncappedsa: uncsa ucsa`, `skillxp`, `skillweight: skillwe` |
| `slayerCommands.js` | `zombie: rev revs…`, `spider: tara…`, `wolf: sven…`, `enderman: eman void…`, `blaze`, `slayer: slay slayers`, `slayerweight`, `vampire` (BaseCommand) |
| `weightCommands.js` | `weight: fiske fiskefillet we`, `lilyweight: lwe lappywe lilywe` + any unclaimed `*weight` |
| `killCommands.js` | `highestdamage: highestcrit maxdamage`, `mytho`, `inquisitors`, `champions`, `yetis`, `ghosts: dalo dalosen…`, `dolphin: seacreatures`, `kills`, `deaths`, `mythoskd: kd k/d…`, `dragons`; plus `flares`, `vanquishers` (BaseCommand) |
| `miningCommands.js` | `glacite: fossils mineshafts`, `rock: ores`, `commissions: coms comms`, `powder`, `hotm`, `nucleus: nuc` |
| `crimsonCommands.js` | `kuudra`, `dojo`, `reputation: rep`, `crimsonessence: crimson` |
| `trophyFish.js` | 18 species (`gushers`, `blobfish`, `t1`-`t3`, `lavahorse`, …), plus `trophy` (BaseCommand) |
| `profileCommands.js` | `motes`, `races: racetimes`, `bids: auctionstats ahstats`, `sbtasks: tasks`, `attributes: shards`, `gifts`, `firstjoin: joined`, `lastdeath`, `garden`, `chocolatefactory: cf chocolate`, `forge`, `level: sb lvl…`, `networth: nw`, `coins: bank purse`, `magicpower: mp tali…`, `petxp`, `candy`, `pets: petscore`, `fees`, `essence`, `soulflow`, `peppers`, `pelts`, `fairysouls: souls`, `minions`, `contests: golds`, `logs: wood`, `gold`, `auctions: ah`, `bestiary: be` |
| `fishingCommands.js` | `fished: itemsfished`, `seacreaturekills: sckills` (`sck` is a config alias of `dolphin`) |
| `farmingCommands.js` | `copper`, `greenhouse`, `jacobperks: anita`, `medals: medalinv` (unspent medals) |
| `foragingCommands.js` | `treegifts: gifttrees`, `whispers`, `harp: melody` |
| `playerCommands.js` | `player: hypixel` (rank, network level, first login), `discord`, `activity`, `ap`, `achievements`, `location`, `bwstars: stars` |
| `guildCommands.js` | `gexp`, `guild`, `membercount: mc <guild>`, `gexplb <guild> [page]`, `guildlb: glb`, `games <guild>` |
| `infoCommands.js` | `spooky`, `interest`, `jerry: yeti winter…` (optional time zone argument), `ratelimit`, `mayor` |
| `leaderboardCommands.js` | `lb` / `leaderboard <board> [guild] [page]` |
| `collectionCommands.js` | `collections: cols` (maxed/unlocked, co-op totals), `miningcols`/`farmingcols`/`combatcols` (top 5, names from Hypixel's collections resource), plus one `CollectionCommand` per item: crops, `obsidian`, `diamond`, `hardstone`, `coal`, `sand` (+ red sand), `mycelium`, `hemovibe`, `timite`, `blazerods`, `wildrose`, `moonflower`, `sunflower`, `lilypads`, `mangrove`, `fig`, … |
| `farmingContests.js` | `jacobcontest` and `<crop>contest` for all 13 contest crops, including `sunflowercontest`, `wildrosecontest` and `moonflowercontest` |
| `cakes.js`, `jademining.js`, `paste.js`, `render.js`, `rtca.js` | BaseCommands |
| `restart.js` | `!rs` (officer only): `process.exit(0)`, so Docker or a supervisor has to start the bot again |
| `mute.js` | `!mute <name>`, from Minecraft **and** Discord. A roll of 0-1 mutes `<name>`, anything else mutes the author (`everyone` always backfires). The loser gets `/g mute <IGN> 15m` if they have an IGN, and a 15-minute Discord timeout if they're a Discord member. IGN ↔ Discord is matched through `/link` (`data/guildLinkUsernames.json`). A typed name is matched to a linked IGN first, then to a Discord username, display name or nickname. |
| `bitches.js`, `eightball.js` (`8ball`), `ironman.js`, `rizz.js`, `random.js`, `test.js` | Joke BaseCommands |

`config.json` → `ingameCommands.alias` adds extra aliases by command **name**, for example `weight: [w]`, `level: [lv, l]` or `enderman: [voidgloom]`.

## Discord slash commands: `slashCommands/`

Each file exports `{ name, description, options?, execute(discordClient, interaction) }`. `interactionCreate.js` handles only chat-input commands and defers the reply first, so commands must use `interaction.editReply`. Registration only happens when `config.slashCommandsSet` is `false`. Set it to `false` and restart after changing a command's name, description or options. Use the discord.js **v14** builders (`EmbedBuilder`, `ApplicationCommandOptionType`, `ButtonBuilder`, …).

| Command | Purpose | Data |
|---|---|---|
| `/gexp [player]` | Members below or above `gexpManagment.weeklyGEXPRequirement`, or one player's weekly history | `data/guildGexp.json` |
| `/info` | Bot and guild info | |
| `/link player` | Links a Discord user to an IGN. The Hypixel DISCORD social link must equal the Discord username. | writes `guildLinks.json`, `guildLinkUsernames.json` |
| `/members`, `/online` | Roster and who is online | |
| `/requirements player` | Player vs `guildRequirement.requirements` (best value across all their profiles) | `helper/requirements.js` |

## Officer passthrough

Officers are listed in `helper/officers.js`: IGNs (case-insensitive) for game chat and Discord user IDs for the bridge. This is step 3 of the dispatcher, so it only applies when no bot command matches. Use `!/…` to force it.
- A DM to the bot from NoseThe that starts with `!` is still run directly as a command (`events/minecraft/message.js`), outside the dispatcher.
