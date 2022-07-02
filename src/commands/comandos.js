const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const { Permissions } = require('discord.js');
const { crear_comando, eliminar_comando } = require('../otros/comandos_util');

const command = {};
command.data = new SlashCommandBuilder()
	.setName('comandos')
	.setDescription('Gestión de comandos de texto específicos de servidor.')
	.setDMPermission(false)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
	.addSubcommand(subcommand =>
		subcommand.setName('crear')
			.setDescription('Crea un comando de texto de servidor.')
			.addStringOption(option =>
				option.setName('nombre')
					.setDescription('Nombre del nuevo comando')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('texto')
					.setDescription('Texto de respuesta al comando.')
					.setRequired(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('eliminar')
			.setDescription('Elimina un comando de texto de servidor.')
			.addStringOption(option =>
				option.setName('nombre')
					.setDescription('Nombre del comando a eliminar')
					.setRequired(true)));


command.execute = async function(interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}
	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
		throw { 'message': 'Solo un moderador puede ejecutar este comando.' };
	}

	if (interaction.options.getSubcommand() == 'crear') {
		await crear_comando(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'eliminar') {
		await eliminar_comando(interaction, db);
	}
};

module.exports = command;