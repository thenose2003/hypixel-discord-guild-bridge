# Gotchas and known issues

Observed while reading the code (2026-10-25). Verify them before you rely on them, and update this file when you fix something.

## Behavioral surprises

- **Stat commands fail silently.** A `StatCommand` that throws, for example on an unknown player or missing data, only logs `[name] error` to the console. Check the console when a command doesn't answer.
- **Name collisions decide behavior.** `findCommand` takes the first exact match in load order (alphabetical by file). Run a duplicate-trigger check when adding names or aliases, because config aliases count too.
- **Officer passthrough is a fallback.** An officer's `!x` runs as `/x` only when `x` isn't a bot command, so new command names or aliases can shadow Hypixel commands officers use (`w` already shadows whisper). Officers can force passthrough with `!/x`. `!rs` calls `process.exit(0)`.
- **A kick kills the process.** `events/minecraft/kicked.js` calls `process.exit()`, but only when `logOptions.hypixelKicked` and `channels.log` are set. Otherwise the `end` handler reconnects. Restarts depend on an external supervisor or Docker restart policy.
- **The `ingameChatLog` channel is a console.** Anything posted there is sent raw to Minecraft.
- **The limbo keeper sends `§`.** That is intentional: it is an illegal character, so Hypixel kicks the bot to limbo.
- **`react()` export hack.** `events/discord/messageCreate.js` reassigns `module.exports = { react }` *inside* `execute`, so `react` exists only after the first Discord message. `ready.js` does the same for `sendDiscordMessage`. Consumers `require` these lazily and wrap the call in try/catch.
- **Every `!` command also works from the Discord bridge.** That includes `!mute` (Discord timeouts) and `!paste`, which publishes to sourcebin. From Discord, the author is the linked IGN, or the Discord username when not linked.
- **The safety filter blocks profanity by default.** Guild members swearing on Discord get 🚫 and their message isn't relayed. Turn that category off with `safetyFilter.categories.profanity: false` if your guild doesn't want it. Links in bot replies are stripped unless their domain is allowed (sourcebin and imgur by default). If a command reply silently doesn't appear, look for a `[safety]` warning in the console.
- **Replies can be blocked by the personal-info filter.** Runs of 7 or more digits separated by spaces, dots or dashes look like phone numbers, and so do `YYYY-MM-DD` dates. Write dates as `Dec 28, 2016` and big numbers with commas (`dot()`). A blocked reply only shows up as a `[safety]` console warning.
- **`!mute` uses Discord timeouts.** The bot needs the **Timeout Members** permission, and Discord won't time out anyone whose highest role is above the bot's or who is the server owner. Failures are only logged.
- **`replied to` parsing** relies on bot image attachments being named `<IGN>.png`. Renaming that breaks reply prefixes, and it also breaks the other-bridge relay, which reads `attachment.description`.

## Hardcoded values that belong in config

- `helper/officers.js`: officer IGNs and Discord user IDs
- `events/discord/messageCreate.js`: `webhooks`, `otherBridge` (webhook IDs)
- `events/minecraft/message.js`: the `NoseThe` DM remote control
- `ingameCommands/random.js`: about 220 hardcoded IGNs
- `ingameCommands/statCommand.js`: a name alias (`greg` → `DragonBoii`). Personal keywords (`nosethe`, `dalosen`, …) are aliases in `dungeonCommands.js` and `killCommands.js`.

## Dead or broken code

- `config.api.routes.*` toggles are ignored by `handlers/api.js`.
- In `index.js`, `kicked.js` and `login.js`, `` `${config.minecraft.ingameName + ' has' || 'I have'}` `` never falls back, because the left side is always truthy.
- `messageCreate.js`: `messagesReactionCache.set(mentionedMessage)` is called with no value.
- `readdirSync('./…')` in the handlers and `fs` paths like `./data/…` are **relative to the CWD**. Always start the bot from the repo root.
- `handlers/minecraftCommands.js` `require`s every directory entry, including `.swp` files. Today they are skipped only because loading them doesn't throw.

## Hypixel v2 fields

All profile reads use v2 paths as of 2026-10-25: `player_data.experience.SKILL_*`, `slayer.slayer_bosses`, `currencies.essence.<TYPE>.current`, `skill_tree.experience.mining` (HOTM), `jacobs_contest`, `player_data.crafted_generators`, `player_data.reaper_peppers_eaten` and `inventory.inv_contents`. `userdata.json` is a v1 dump, so don't copy field names from it. To find where something lives now, fetch a profile with `helper/skyblockApi.getPlayerHypixelFullProfile` and look.

Hypixel removed the friends endpoint and Mojang removed name history, so `!friends` and `!namehistory` were deleted. See [architecture.md](architecture.md) for the dead third-party services (`!spooky`, `!interest`, `!jerry`, `!glb`, `!lb` and `!lilyweight`), which still fail silently.

## Git state

- The fork diverges heavily from upstream `master` without any commits. About 25 upstream command files are deleted locally, and many new files are untracked (`constants.js`, `helper/skyblock*.js`, most of `ingameCommands/`). Don't `git checkout .`, `git stash` or `git clean` casually; that would lose the live bot.
- The `data/*.json` files are tracked but change every hour, so expect them to show as modified.
- `config.json` is gitignored, but `sbConfig.json` and `userdata.json` are **not**. Don't `git add -A`.

## Testing tips

There is no test suite. To exercise logic without connecting to Hypixel:
- `userdata.json` is an old **v1** profiles response, so it's only useful for v1-shaped code paths. Fetch a fresh v2 response for anything else.
- You can run a stat command directly without logging in. Set `global.minecraftClient = { chat: console.log }`, run `require('./handlers/minecraftCommands.js')()`, then `require('./helper/commandDispatcher.js').dispatchCommand('!cata NoseThe', 'NoseThe')`. This needs `config.json` with a valid Hypixel key, and makes real API calls.
- A quick syntax check: `node -e "require('./ingameCommands/foo.js')"` from the repo root. This requires `config.json` to exist.
