# Config and data files

## `config.json` (gitignored, contains secrets)

It is loaded with `require('./config.json')` in nearly every module. The object is cached once per process, so most edits need a restart. `example_config.json` is the template, and the upstream `README.md` documents most keys in detail. Here is what is specific to this fork or easy to miss:

| Key | Notes |
|---|---|
| `minecraft.{username,password,microsoftAuth,doNotUsePassword}` | Login. `ingameName` is **overwritten on login** from the session profile (`events/minecraft/login.js`). |
| `keys.{discordBotToken,hypixelApiKey,imgurClientId}` | Secrets. Never print or commit them. |
| `channels.{guildIngameChat,officerIngameChat,ingameChatLog,log}` | Discord channel IDs. `ingameChatLog` acts as a raw console into Minecraft. |
| `channels.logOptions.*` | Which lifecycle events are posted to `log`. `ingameChatLogFilter` lists substrings that are never logged. |
| `discordServer` | Guild ID used for slash command registration. |
| `ingameChatEvents.*` | Toggles for each guild event image (see `helper/functions.isGuildEvent`). |
| `options.imageSizeMultiplier` | Optional scale for chat PNGs (default 1). |
| `ingameCommands.trigger` | Usually `!`. Used by the dispatcher and officer passthrough. |
| `ingameCommands.disabled` | Command **names** to skip loading. Aliases don't count. |
| `ingameCommands.alias` | `{ commandName: [aliases] }`, on top of the aliases defined in code. Every key in the live config matches a command. |
| `gexpManagment.weeklyGEXPRequirement` | Used by `/gexp`. Note the typo "Managment"; keep it. |
| `slashCommandsSet` | Set to `false` to re-register slash commands on the next start. It is rewritten to `true` automatically. |
| `api.{enabled,port,keys,routes}` | `keys` maps `key → [allowed routes]`. The key is sent in the `Authorization` header or `?key=`. `routes.*` toggles are documented in the README, but `handlers/api.js` does **not** check them; only per-key route lists are enforced. |
| `guildRequirement.*` | `requirements` keys must match `getRequirements()` result keys (`skyblockLevel networth senitherWeight lilyWeight skillAverage catacombs hypixelLevel bwLevel bwFKDR slayer.{revenant,tarantula,wolf,enderman,blaze}`). It also supports optional `minRequired` and `acceptEitherSkyblockOrBedwars`. |
| `guildWelcome.{enabled,message}` | `{USERNAME}` placeholder. |
| `safetyFilter` (optional) | `{ enabled, categories: { slurs, profanity, links, advertising, personalInfo }, blockedWords: [], allowedWords: [], allowedLinkDomains: [] }`. Everything defaults to on, and `allowedLinkDomains` defaults to `["sourceb.in", "imgur.com"]`, the links `!paste` and `!render` post. For example, `"safetyFilter": { "categories": { "profanity": false } }` lets swearing through. See `helper/safety/index.js`. |
| `fragBot.*` | Party-accept queue. Guild members are auto-whitelisted from `data/guildMembers.json`. |

Runtime writers of `config.json`: `events/minecraft/login.js` (`ingameName`) and `events/discord/ready.js` (`slashCommandsSet`). Both write the whole object back out pretty-printed.

`sbConfig.json` (untracked) has the same schema and looks like an alternate or second-bot config. Nothing references it. Treat it as secret.

## `data/` (runtime state, tracked in git)

Everything here is read and written synchronously with `fs.readFileSync` / `writeFileSync` and no locking.

| File | Shape | Written by | Read by |
|---|---|---|---|
| `guildMembers.json` | `["IGN", …]` current members | `ready.js` hourly | frag bot whitelist |
| `guildRanks.json` | `{ uuid: rankTag \| null }` | `ready.js` hourly | Discord→MC relay (`playerRank`, currently unused because the code is commented out) |
| `guildGexp.json` | `{ IGN: { rank, joined, isInGuild, gexpWeek, gexpHistory: [{date (unix s, string), gexp}] } }`. It keeps ex-members (`isInGuild:false`). | `ready.js` hourly; the weekly cron appends history | `/gexp` |
| `guildLinks.json` | `{ discordUserId: minecraftUuid }` | `/link` | relay prefix |
| `guildLinkUsernames.json` | `{ discordUserId: IGN }` | `/link` | relay prefix (replaces the Discord username with the IGN) |

GEXP data is keyed by **IGN**, not UUID, so a name change creates a new entry.

## Other root files

| File | Status |
|---|---|
| `constants.js` | `bestiary` and `bestiary_brackets` are used by `!bestiary`. `taliData` is no longer used, because `!mp` reads Hypixel's `accessory_bag_storage.highest_magical_power`. Large and generated-looking. |
| `constants/global.js` | Live. XP tables and max levels for `helper/skills.js`. |
| `userdata.json` | Untracked, about 2.3 MB. A saved, old **v1**-format Hypixel `skyblock/profiles` response (`{success, profiles}`, with fields like `experience_skill_*` and `inv_contents`). Nothing references it. It contains real player data, so don't publish it. |
| `yarn.lock` + `package-lock.json` | Both exist, and Docker uses npm. `package-lock.json` is the one that matters. |
| `*.swp` in `events/minecraft/`, `ingameCommands/` | Vim swap files. Note that `minecraftCommands.js` `readdirSync`s `ingameCommands/` and `require`s every entry, including non-`.js` files. |

## Dependencies worth knowing

- **Node ≥ 22.13** (`engines`), required by mineflayer and sourcebin 6. The Pi runs Node 22 because it's the newest version with 32-bit ARM builds.
- **`discord.js@14`**: `EmbedBuilder`, `AttachmentBuilder`, `ButtonBuilder`, `GatewayIntentBits`, `MessageType.Reply`, `interaction.isChatInputCommand()`. The `ready` event is bound as `clientReady` in `handlers/discordEvents.js`.
- **`mineflayer@4`** connects with protocol `1.8.9`.
- **`@napi-rs/canvas`** renders the chat and lore images. It ships prebuilt binaries for x64, arm64 and 32-bit ARM (`arm-gnueabihf`), so nothing compiles on the Pi. Fonts are registered with `GlobalFonts.registerFromPath`.
- **`express@5`**: `req.query` has no prototype (use `Object.hasOwn`), and `req.body` is undefined without a JSON body.
- **`skyhelper-networth@2`**: `new ProfileNetworthCalculator(member, museumMember, bank).getNetworth()`. Dependabot auto-bumps it (`.github/dependabot.yml`).
- **`sourcebin@6`** is ESM-only and loaded through `require()` (Node 22.12+): `create({ title, files })`.
- **HTTP:** the stat commands use the global `fetch`. `helper/functions.js` and `events/` use `axios`.
