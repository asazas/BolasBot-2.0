const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const { Permissions, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { reset_player_scores } = require('../datamgmt/db_utils');

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
		if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			throw { 'message': 'Solo un moderador puede ejecutar este comando.' };
		}

		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('**¡Una vez se reseteen las puntuaciones, no se podrán recuperar!**\n\nPulsa "Confirmar" si quieres resetear las puntuaciones.')
			.setTimestamp();

		const row = new MessageActionRow().addComponents(
			new MessageButton()
				.setCustomId('resetear')
				.setLabel('Confirmar')
				.setStyle('PRIMARY'),
		);

		await interaction.reply({ embeds: [ans_embed], components: [row], ephemeral: true });
	},
};