const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { String: STRING } = ApplicationCommandOptionType;
const { n, addCommas, toFixed, paginator } = require('../helper/functions.js');
const config = require('../config.json');
const fs = require('fs');

module.exports = {
    name: 'gexp',
    description: 'Guild Exp',
    options: [
        {
            name: 'player',
            description: 'Player name',
            type: STRING,
            required: false,
        },
    ],
    async execute(discordClient, interaction) {
        const playerInput = interaction.options.get('player')?.value;
        const gexpData = JSON.parse(fs.readFileSync('./data/guildGexp.json').toString());
        const lowerToNormal = {};
        for (const player of Object.keys(gexpData)) {
            lowerToNormal[player.toLowerCase()] = player;
        }

        if (Object.keys(gexpData).length > 0) {
            if (playerInput) {
                const playerData = gexpData[lowerToNormal[playerInput.toLowerCase()]];
                if (!playerData) return interaction.editReply({ content: 'Guild Member not found.' });

                const embeds = [];
                const pages = Number(toFixed((playerData.gexpHistory.length || 0) / 20)) + ((playerData.gexpHistory.length || 1) % 20 == 0 ? 0 : 1);
                for (let i = 0; i < pages; i++) {
                    const embed = new EmbedBuilder()
                        .setTitle(`${lowerToNormal[playerInput.toLowerCase()]}'s Guild Exp`)
                        .setColor('Blurple')
                        .setDescription(
                            n(`
                                **In Guild**: \`${playerData.isInGuild ? 'Yes' : 'No'}\`
                                **Rank**: \`${playerData.rank}\`
                                **Joined**: <t:${(playerData.joined / 1000).toFixed()}>
                                **Guild Exp (Week)**: \`${addCommas(playerData.gexpWeek)}\`

                                **Guild Exp History**:
                                ${
                                    playerData.gexpHistory.length > 0
                                        ? playerData.gexpHistory
                                              .reverse()
                                              .slice(i * 20, i * 20 + 20)
                                              .map((history) => {
                                                  return `<t:${history.date}:d> \`${addCommas(history.gexp)}\``;
                                              })
                                              .join('\n')
                                        : 'None'
                                }
                        `)
                        )
                        .setFooter({ text: `Page ${i + 1} / ${pages}` });
                    embeds.push(embed);
                }

                paginator(interaction, embeds);
            } else {
                const requirement = config.gexpManagment.weeklyGEXPRequirement;
                const members = Object.keys(gexpData).filter((player) => gexpData[player].isInGuild);
                const line = (player) => `**${player}**: \`${addCommas(gexpData[player].gexpWeek)}\``;
                const byGexp = (a, b) => gexpData[a].gexpWeek - gexpData[b].gexpWeek;

                const lines = requirement
                    ? [
                          `**Weekly GEXP Requirement**: \`${addCommas(requirement)}\``,
                          '',
                          '**Members under the requirement**:',
                          ...members.filter((player) => gexpData[player].gexpWeek < requirement).sort(byGexp).map(line),
                          '',
                          '**Members above the requirement**:',
                          ...members.filter((player) => gexpData[player].gexpWeek >= requirement).sort(byGexp).map(line),
                      ]
                    : ['**Members**:', ...members.sort((a, b) => byGexp(b, a)).map(line)];

                // Discord rejects embed descriptions over 4096 characters, so long lists become pages
                const pages = [''];
                for (const text of lines) {
                    if (pages[pages.length - 1].length + text.length + 1 > 4000) pages.push('');
                    pages[pages.length - 1] += `${text}\n`;
                }
                const embeds = pages.map((page, i) => {
                    const embed = new EmbedBuilder().setTitle('Guild Exp').setColor('Blurple').setDescription(page.trim() || 'None');
                    if (pages.length > 1) embed.setFooter({ text: `Page ${i + 1} / ${pages.length}` });
                    return embed;
                });
                if (embeds.length > 1) return paginator(interaction, embeds);
                return interaction.editReply({
                    embeds,
                });
            }
        } else {
            return interaction.editReply({
                content: 'Guild GEXP data is empty.',
            });
        }
    },
};
