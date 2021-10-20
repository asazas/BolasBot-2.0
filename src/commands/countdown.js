const { SlashCommandBuilder } = require('@discordjs/builders');
const { countdown_interaction } = require('../otros/countdown_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('countdown')
		.setDescription('Inicia una cuenta atrás.')
		.addIntegerOption(option =>
			option.setName('tiempo')
				.setDescription('Tiempo en segundos (máximo 10)')),

	async execute(interaction) {
		const tiempo = interaction.options.getInteger('tiempo');
		await countdown_interaction(interaction, tiempo);
	},
};