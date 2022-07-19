const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, ButtonStyle } = require('discord-api-types/v10');
const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resetear_puntos')
		.setDescription('Resetea el ranking de jugadores.')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}
		if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
			throw { 'message': 'Solo un moderador puede ejecutar este comando.' };
		}

		const ans_embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('**¡Una vez se reseteen las puntuaciones, no se podrán recuperar!**\n\nPulsa "Confirmar" si quieres resetear las puntuaciones.')
			.setTimestamp();

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('resetear')
				.setLabel('Confirmar')
				.setStyle(ButtonStyle.Primary),
		);

		await interaction.reply({ embeds: [ans_embed], components: [row], ephemeral: true });
	},
};