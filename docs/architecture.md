# Architecture

## Processes and clients

There is a single Node process with three long-lived pieces:

1. **Discord client** (`discord.js` v14, intents: Guilds, GuildMessages, GuildMessageReactions, GuildMembers, MessageContent). MessageContent must also be enabled in the Developer Portal. It is created in `index.js` and passed explicitly to every handler and event.
2. **Minecraft bot** (`mineflayer`, protocol 1.8.9, `mc.hypixel.net`, Microsoft auth). It is stored as **`global.minecraftClient`**, and the code references it as a bare global almost everywhere.
3. **Express API** (`handlers/api.js`), only if `config.api.enabled`.

## Startup sequence (`index.js`)

```
createBot() → global.minecraftClient
startMinecraftBot():
    on('end') → log to Discord, createBot() again, startMinecraftBot() again
    handlers/minecraftEvents   (binds events/minecraft/*.js; the file name is the event name)
    handlers/minecraftCommands (loads ingameCommands/*.js into minecraftClient.commands)
handlers/discordEvents        (binds events/discord/*.js; the file name is the event name)
handlers/discordCommands      (loads slashCommands/*.js into discordClient.commands)
handlers/api
setInterval 5 min: if !minecraftClient.player → quit + recreate   (options.unknownDisconnectRelog)
discordClient.login()
```

Event binding is by convention. `events/minecraft/message.js` binds to mineflayer's `message` event, and `events/discord/ready.js` binds to Discord's `ready`. Minecraft handlers are called as `execute(discordClient, ...eventArgs)`. Discord handlers are called as `execute(discordClient, ...eventArgs)` through `.bind(null, discordClient)`.

On reconnect, `startMinecraftBot` re-runs both Minecraft loaders against the **new** global client. That is why commands hang off `minecraftClient.commands` and not a module variable.

## Minecraft → Discord (`events/minecraft/message.js`)

Each chat line (`ChatMessage`) goes through these steps in order:

1. **Limbo keeper.** `login.js` sends `/locraw` every 60 s. If the reply JSON says `server !== 'limbo'`, the bot sends `§` (an illegal character), which makes Hypixel drop it back to limbo. JSON lines return early.
2. **Console log** (ANSI), unless the line matches `logOptions.ingameChatLogFilter`.
3. **Raw chat log.** The line is pushed onto `messagesCache`. A 2 s interval flushes the cache to `channels.ingameChatLog` as text (max 1998 chars).
4. `You cannot say the same message twice!` adds a ⛔ reaction to the last pending Discord message.
5. **DM from NoseThe** (`From [MVP+/MVP++] NoseThe: !x`) runs `/x`. This is a hardcoded remote control.
6. **`Guild >` or `Officer >` lines that contain `:`:**
   - The author is parsed from the space-split tokens: index 2, or 3 if index 2 is a `[RANK]`.
   - If the message starts with the trigger (`!`):
     - `dispatchCommand(sentMsg, author, { isOfficer, discordClient })` (`helper/commandDispatcher.js`) runs at most one bot command, or an officer's Minecraft command (see [commands.md](commands.md)).
   - If the author is the bot itself, the message is marked ✅ on Discord and the step stops unless the text starts with `@` (bot replies are mirrored).
   - URLs are validated with a GET and posted as plain text after the image.
   - The colored text is rendered to a PNG (`helper/messageToImage.js`) and sent to `guildIngameChat` or `officerIngameChat`. The attachment is named `<author>.png` and its `description` holds the raw line, which reply-handling and the other-bridge relay depend on.
7. **Guild events** (`helper/functions.isGuildEvent`, gated by `config.ingameChatEvents.*`) are rendered as an image with a dashed border.
8. `/g slow` toggling mirrors the Discord channel slowmode (`options.discordUseSlowCommand`).
9. **Join request screening** (`guildRequirement.enabled`): reads the clickEvent `/g accept <name>`, calls `helper/requirements.getRequirements(uuid)`, posts a summary to `/oc` and an embed to the officer channel, and auto-accepts if the requirements are met and the player is not blacklisted.
10. **Welcome** message on `joined the guild!`.
11. **Frag bot** (`fragBot.enabled`): a party invite queue that accepts, waits 5 s, then leaves.

## Discord → Minecraft (`events/discord/messageCreate.js`)

1. Messages from the **`otherBridge`** webhook ID are relayed to `/gc`. The text comes from `attachments.first().description` (another bridge instance's image description).
2. Bot messages are ignored unless the author ID is in `webhooks`. Empty content is ignored.
3. A leading `\` is stripped.
4. A message in `channels.ingameChatLog` is sent **raw** to Minecraft, so the channel is a console. Anyone who can post there controls the bot.
5. In `guildIngameChat` or `officerIngameChat`:
   - The prefix is `/gc` or `/oc` followed by the nickname or username. If the author is linked (`data/guildLinks.json`), their username is replaced with the linked IGN from `guildLinkUsernames.json`.
   - **Replies:** a reply to a bot image becomes `X replied to <author from attachment filename>`.
   - Mentions, roles, channels and emoji are flattened by `formatMentions`. Newlines are removed and the text is truncated to 256.
   - ⛔ is added after 3 s unless the echo comes back first. `react()` is exported by mutating `module.exports` inside `execute`, and `message.js` `require`s it lazily.
   - The bridge message is sent, then `dispatchCommand(content, author, { fromDiscord: true, isOfficer, … })` runs the command, exactly as in game. This includes officer passthrough and `!rs`.

## Outgoing chat (`helper/outgoingChat.js`, `helper/safety/`)

- `index.js` wraps every new bot's `chat()` with `installChatGuard`. Each line is cut to 256 chars, then run through `guardCommand`, which strips `§` codes and checks for slurs, profanity, advertising and personal info, and strips links unless their domain is in `allowedLinkDomains`. A blocked line is dropped with a `[safety]` warning. The limbo keeper's lone `§` is exempt.
- Discord bridge messages, the other bridge's relay, and the API `/chat` route use `sendBridgeMessage(prefix, author, text)`. It filters the whole `author: text` and splits it at spaces into up to 4 `/gc author: …` lines sent 1.1 s apart. In Discord, a blocked message gets 🚫 and a 5-second notice saying why.

## Background jobs (`events/discord/ready.js`)

| Job | Schedule | Effect |
|---|---|---|
| Slash command registration | once, if `config.slashCommandsSet` is false | `guild.commands.set(...)`, then writes `slashCommandsSet: true` back to `config.json` |
| `updateGuildMemberData()` | on ready, then hourly | Hypixel `/guild?player=<bot uuid>` updates `data/guildMembers.json`, `guildRanks.json` and `guildGexp.json`. It makes one Mojang UUID→name call per member, so it is slow. |
| Weekly GEXP snapshot | cron `0 23 * * 0` America/New_York | Same as above with `addToHistory=true`, which appends `{date, gexp}` to each member's `gexpHistory` |
| Chat-log flush | every 2 s (`message.js`) | Flushes `messagesCache` to the log channel |
| `/locraw` | every 60 s (`login.js`) | Limbo keeper |
| Relog watchdog | every 5 min (`index.js`) | Recreates the bot if `minecraftClient.player` is missing |

`ready.js` also replaces `module.exports` with `{ execute, sendDiscordMessage }` once ready. Other modules `require('../discord/ready').sendDiscordMessage` at call time, so before `ready` that function is `undefined` (the callers wrap the call in try/catch).

## External services

- **Hypixel API** (`api.hypixel.net`, v2 SkyBlock endpoints). `helper/functions.hypixelRequest` (axios) sends the `API-Key` header. `helper/skyblockApi.js` (used by the stat commands) uses `?key=` and has its own 5-minute URL cache and rate-limit throttle in `getJsonFromUrl`.
- **Mojang**: name↔UUID lookups.
- **Mojang**: `api.mojang.com` (name → UUID) and `sessionserver.mojang.com` (UUID → name). The old `/user/profiles/<uuid>/names` history endpoint is gone.
- **Third-party** (checked 2026-10-25):
  - **Still up:** `dawjaw.net/jacobs` (farming contests), `soopy.dev` (`!rtca`), sourcebin (`!paste`) and imgur (`!render`).
  - **Down or gone:** `hypixel-api.inventivetalent.org` (`!spooky`, `!interest`, `!jerry`), `hypixel-app-api.senither.com` (`!glb`, weight `!lb`), and `sky.shiiyu.moe/api/v2/leaderboards` (`!lb`), which redirects.
  - **Couldn't confirm:** `lily.antonio32a.com` (`!lilyweight`) answers but returned nothing usable.
  - When a service fails, the command stays silent.
- **skyhelper-networth** handles networth calculations.
