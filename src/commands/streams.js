const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions } = require('discord.js');
const { stream_alta, stream_baja, set_stream_role } = require('../streams/streams_util');

const command = {};
command.data = new SlashCommandBuilder()
	.setName('streams')
	.setDescription('Gestión de avisos para streams de Twitch.')
	.addSubcommand(subcommand =>
		subcommand.setName('alta')
			.setDescription('Registra un stream de Twitch para realizar avisos en el servidor.')
			.addStringOption(option =>
				option.setName('stream')
					.setDescription('Nombre de usuario en Twitch (nombre del canal)')
					.setRequired(true))
			.addUserOption(option =>
				option.setName('usuario')
					.setDescription('@ del usuario en Discord.')))

	.addSubcommand(subcommand =>
		subcommand.setName('baja')
			.setDescription('Eliminar un stream de Twitch de la lista de avisos en el servidor.')
			.addStringOption(option =>
				option.setName('stream')
					.setDescription('Nombre de usuario en Twitch (nombre del canal)')
					.setRequired(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('rol')
			.setDescription('Rol al que hacer ping cuando un stream esté en vivo.')
			.addRoleOption(option =>
				option.setName('rol')
					.setDescription('@ del rol, dejar vacío para no hacer ping a ningún rol.')));


command.execute = async function(interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}
	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
		throw { 'message': 'Solo un moderador puede ejecutar este comando.' };
	}

	if (interaction.options.getSubcommand() == 'alta') {
		await stream_alta(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'baja') {
		await stream_baja(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'rol') {
		await set_stream_role(interaction, db);
	}
};

module.exports = command;