const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions } = require('discord.js');
const { crear_categoria_roles, crear_rol, eliminar_categoria_roles, eliminar_rol } = require('../roles/roles_util');

const command = {};
command.data = new SlashCommandBuilder()
	.setName('roles')
	.setDescription('Asignación automática de roles mediante reacciones.')
	.addSubcommandGroup(subcommandGroup =>
		subcommandGroup.setName('crear')
			.setDescription('Crear rol o categoría')
			.addSubcommand(subcommand =>
				subcommand.setName('categoria')
					.setDescription('Crear una categoría para roles.')
					.addStringOption(option =>
						option.setName('nombre')
							.setDescription('Nombre de la categoría')
							.setRequired(true)))

			.addSubcommand(subcommand =>
				subcommand.setName('rol')
					.setDescription('Crear un nuevo rol.')
					.addStringOption(option =>
						option.setName('nombre')
							.setDescription('Nombre del rol. Si no existe en el servidor, lo crea.')
							.setRequired(true))
					.addStringOption(option =>
						option.setName('emoji')
							.setDescription('Emoji para asociar al rol')
							.setRequired(true))
					.addStringOption(option =>
						option.setName('descripcion')
							.setDescription('Descripción del rol')
							.setRequired(true))
					.addStringOption(option =>
						option.setName('categoria')
							.setDescription('Categoría a la que pertenece el rol')
							.setRequired(true))))

	.addSubcommandGroup(subcommandGroup =>
		subcommandGroup.setName('eliminar')
			.setDescription('Eliminar rol o categoría')
			.addSubcommand(subcommand =>
				subcommand.setName('categoria')
					.setDescription('Eliminar una categoría de roles y todos los roles asociados.')
					.addStringOption(option =>
						option.setName('nombre')
							.setDescription('Nombre de la categoría')
							.setRequired(true)))

			.addSubcommand(subcommand =>
				subcommand.setName('rol')
					.setDescription('Eliminar un rol.')
					.addStringOption(option =>
						option.setName('nombre')
							.setDescription('Nombre del rol')
							.setRequired(true))));


command.execute = async function(interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}
	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
		throw { 'message': 'Solo un moderador puede ejecutar este comando.' };
	}

	if (interaction.options.getSubcommandGroup() == 'crear') {
		if (interaction.options.getSubcommand() == 'categoria') {
			await crear_categoria_roles(interaction, db);
		}
		else if (interaction.options.getSubcommand() == 'rol') {
			await crear_rol(interaction, db);
		}
	}
	else if (interaction.options.getSubcommandGroup() == 'eliminar') {
		if (interaction.options.getSubcommand() == 'categoria') {
			await eliminar_categoria_roles(interaction, db);
		}
		else if (interaction.options.getSubcommand() == 'rol') {
			await eliminar_rol(interaction, db);
		}
	}
};

module.exports = command;