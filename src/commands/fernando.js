const { SlashCommandBuilder } = require('@discordjs/builders');

const { get_fernando_embed } = require('../otros/fernando_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fernando')
		.setDescription('Perla de sabiduría de Fernando Almeida'),

	async execute(interaction) {
		await interaction.deferReply();
		const fernando_embed = await get_fernando_embed();
		await interaction.editReply({ embeds: [fernando_embed[0]], files: [fernando_embed[1]] });
	},
};