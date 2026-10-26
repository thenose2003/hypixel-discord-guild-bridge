# GuildBridge — agent guide

A Node.js bot that bridges a **Hypixel guild chat** (Minecraft, via mineflayer) with a **Discord server** (discord.js v14). It also answers SkyBlock stat commands (`!weight`, `!pb`, `!nw`, …) in guild chat, tracks guild XP, screens join requests, and exposes a small HTTP API.

It is a fork of [Altpapier/hypixel-discord-guild-bridge](https://github.com/Altpapier/hypixel-discord-guild-bridge). There are many uncommitted local changes on top of upstream `master` (see `git status`), so **the working tree is the source of truth, not HEAD.**

## Run

```bash
npm install        # Node >= 22.13; no native build step (@napi-rs/canvas ships prebuilt binaries, including 32-bit ARM)
node index.js      # or: npm start. Run from the repo root (paths are relative to the CWD)
```

Production runs on a Raspberry Pi with a 32-bit OS. Node 22 is the newest LTS with 32-bit ARM builds, so keep the code compatible with Node 22. It is also tested on Node 26. Docker: `Dockerfile` (`node:22-bookworm-slim`, runs under `dumb-init`). There are no tests, no linter and no build step. `.prettierrc.json` is gitignored. The code uses 4-space indent and single quotes.

`config.json` (gitignored) holds **live secrets**: the Minecraft login, the Discord bot token and the Hypixel API key. `sbConfig.json` has the same schema. Never print, commit or copy their values; refer to keys by name only. `example_config.json` is the template.

## Directory map

| Path | What it is |
|---|---|
| `index.js` | Entry point. Creates the Discord client and the mineflayer bot (global `minecraftClient`), wires handlers, and reconnects on `end` and every 5 min. |
| `handlers/` | Loaders: auto-register every file in `events/discord`, `events/minecraft`, `slashCommands`, `ingameCommands`; `api.js` = Express API. |
| `events/minecraft/message.js` | **The core.** Every in-game chat line: limbo keeper, chat log, Guild/Officer → Discord images, in-game `!` commands, guild events, join-request screening, welcome message, frag bot. |
| `events/discord/messageCreate.js` | Discord → Minecraft: relays bridge-channel messages as `/gc` and `/oc`, handles another bridge's webhook, and runs `!` commands through the dispatcher. |
| `events/discord/ready.js` | Registers slash commands (once), runs the hourly guild-data refresh and the weekly GEXP history cron, and exports `sendDiscordMessage`. |
| `events/minecraft/{login,kicked}.js` | Login logging and `/locraw` limbo polling. On a kick the process **exits**. |
| `ingameCommands/` | All `!` commands: `BaseCommand` / `StatCommand` instances grouped by topic (`dungeonCommands.js`, `skillCommands.js`, …). See [docs/commands.md](docs/commands.md). |
| `helper/outgoingChat.js`, `helper/safety/` | Everything the bot says in Minecraft passes the ban-safety filter (a guard installed on `bot.chat` in `index.js`). Discord/API relay messages are split over up to 4 lines. Ported from treeot/hypixel-chat-bridge (MIT, see `helper/safety/LICENSE`). |
| `helper/commandDispatcher.js` | `dispatchCommand()`: the single entry point for `!` commands from Minecraft and Discord. |
| `helper/skyblockApi.js`, `helper/skyblockStats.js` | Hypixel/Mojang fetchers (5-minute cache, rate-limit throttle) and level/weight/format math for the stat commands. |
| `constants.js` (root, untracked) | Bestiary tables and bundled talisman data, used by `helper/skyblockStats.js` and `profileCommands.js`. |
| `constants/global.js` | XP tables (skills, dungeons, slayer, HOTM) used by `helper/skills.js`. |
| `slashCommands/` | Discord slash commands: `gexp`, `info`, `link`, `members`, `online`, `requirements`. |
| `helper/` | Shared utilities: `functions.js` (Hypixel/Mojang requests, `getPlayer`, formatting, guild-event matching), `messageToImage.js` (Minecraft-styled PNGs via @napi-rs/canvas), `requirements.js`, `skills.js`, `weight.js`, `getBedwarsLevel.js`, `loreRenderer.js`, `embeds.js`. |
| `data/*.json` | Runtime state written by the bot (guild members, ranks, GEXP history, Discord↔MC links). Tracked in git but constantly rewritten. |
| `fonts/` | Minecraft fonts used by the canvas renderers. |

## Deeper docs

- [docs/architecture.md](docs/architecture.md): startup, message flow in both directions, background jobs, globals
- [docs/commands.md](docs/commands.md): how `!` commands are dispatched, how to add one, and the slash commands
- [docs/config-and-data.md](docs/config-and-data.md): config keys, data files, and who reads and writes what
- [docs/gotchas.md](docs/gotchas.md): known bugs, dead code, hardcoded IDs, footguns. **Read this before changing behavior.**

## Rules of thumb for agents

- `minecraftClient` is a **global** that is replaced on every reconnect. Always reference `minecraftClient` / `global.minecraftClient` at call time, and never cache it in a module-level variable.
- In-game chat is capped at **256 chars**, and Hypixel rejects duplicate consecutive messages. Every bot reply goes through `minecraftClient.chat('/gc …')`, which is guarded: lines are cut to 256, then filtered (slurs, profanity, links outside `allowedLinkDomains`, advertising, personal info). A blocked line is dropped with a `[safety]` console warning.
- The officer lists (IGNs and Discord user IDs) are hardcoded in `helper/officers.js`, not in config. The other bridge's webhook IDs are in `events/discord/messageCreate.js`.
- `login.js` and `ready.js` **rewrite `config.json`** at runtime with `JSON.stringify(…, null, 2)`, so manual formatting or comments in it get lost.
- To add a stat command, add a `new StatCommand([...names], async ({ name }) => text)` to the matching `ingameCommands/*Commands.js` array. Don't create a second dispatcher.
- discord.js is **v14**: use `EmbedBuilder`, `AttachmentBuilder`, `GatewayIntentBits` and so on, not the v13 `Message*` classes.
- Hypixel API v2 field names (`pets_data.pets`, `player_stats.*`, `player_data.experience.SKILL_*`, `leveling.experience`) are what the profile data contains. Some older code still reads v1 names; see [docs/gotchas.md](docs/gotchas.md).
