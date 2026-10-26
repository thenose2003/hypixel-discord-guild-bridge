const { EmbedBuilder } = require('discord.js');

function errorEmbed(title, message) {
    return new EmbedBuilder()
        .setTitle(title || 'Error')
        .setDescription(message || 'An error has occurred.')
        .setColor('Red');
}

module.exports = {
    errorEmbed,
};
