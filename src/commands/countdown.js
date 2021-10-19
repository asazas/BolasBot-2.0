const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('countdown')
		.setDescription('Inicia una cuenta atrás.')
		.addIntegerOption(option =>
			option.setName('tiempo')
				.setDescription('Tiempo en segundos (máximo 10)')),

	async execute(interaction) {
		let tiempo = interaction.options.getInteger('tiempo');
		if (tiempo < 1 || tiempo > 10) {
			tiempo = 10;
		}
		await interaction.reply(tiempo.toString());
		for (let i = tiempo - 1; i > 0; i--) {
			await new Promise(r => setTimeout(r, 800));
			await interaction.editReply(i.toString());
		}
		await new Promise(r => setTimeout(r, 800));
		await interaction.editReply('GO!');
	},
};