const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const { Permissions } = require('discord.js');
const { vetos_levantar, vetos_banear } = require('../otros/vetar_util');

const command = {};
command.data = new SlashCommandBuilder()
	.setName('vetos')
	.setDescription('Control de permisos de usuarios para participar en carreras de BolasBot.')
	.setDMPermission(false)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
	.addSubcommand(subcommand =>
		subcommand.setName('banear')
			.setDescription('Impide que un usuario participe en carreras de BolasBot.')
			.addUserOption(option =>
				option.setName('usuario')
					.setDescription('@ del usuario en Discord.')
					.setRequired(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('levantar')
			.setDescription('Levanta el veto aplicado sobre un usuario.')
			.addUserOption(option =>
				option.setName('usuario')
					.setDescription('@ del usuario en Discord.')
					.setRequired(true)));


command.execute = async function(interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}
	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
		throw { 'message': 'Solo un moderador puede ejecutar este comando.' };
	}

	if (interaction.options.getSubcommand() == 'banear') {
		await vetos_banear(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'levantar') {
		await vetos_levantar(interaction, db);
	}
};

module.exports = command;