const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const { Permissions, MessageEmbed } = require('discord.js');
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

		await reset_player_scores(db);
		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('Se ha reseteado el ranking de jugadores.')
			.setTimestamp();
		await interaction.reply({ embeds: [ans_embed] });
	},
};