const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { async_privada_crear, async_privada_terminar, async_privada_invitar, async_privada_desinvitar } = require('../racing/async_privada_util');


const preset_files = glob.sync('rando-settings/**/*.json');
const preset_option = new SlashCommandStringOption();
preset_option.setName('preset')
	.setDescription('Preset disponible en BolasBot.');

for (const file of preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_option.addChoices({ name: `${dirname} - ${filename}`, value: filename });
}

const command = {};
command.data = new SlashCommandBuilder()
	.setName('async_privada')
	.setDescription('Manejo de carreras asíncronas invitacionales.')
	.setDMPermission(false)
	.addSubcommand(subcommand =>
		subcommand.setName('crear')
			.setDescription('Crea una carrera asíncrona.')

			.addStringOption(option =>
				option.setName('nombre')
					.setDescription('Nombre de la carrera asíncrona'))

			.addStringOption(option =>
				option.setName('etiqueta')
					.setDescription('Etiqueta para agrupar carreras con un propósito similar.'))

			.addBooleanOption(option =>
				option.setName('ranked')
					.setDescription('Determina si la carrera es puntuable.'))

			.addAttachmentOption(option =>
				option.setName('archivo')
					.setDescription('Archivo de preset .json (formato BolasBot) o .yaml (formato SahasrahBot) para generar la seed.'))

			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed.'))

			.addStringOption(preset_option)

			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra para preset.')
					.setAutocomplete(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('invitar')
			.setDescription('Invitar a un jugador a la carrera asíncrona')
			.addUserOption(option =>
				option.setName('jugador')
					.setDescription('@ del usuario en Discord a invitar.')
					.setRequired(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('desinvitar')
			.setDescription('Eliminar un jugador de la carrera asíncrona')
			.addUserOption(option =>
				option.setName('jugador')
					.setDescription('@ del usuario en Discord a eliminar.')
					.setRequired(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('terminar')
			.setDescription('Terminar la carrera asíncrona'));


command.execute = async function(interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}

	if (interaction.options.getSubcommand() == 'crear') {
		await async_privada_crear(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'invitar') {
		await async_privada_invitar(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'desinvitar') {
		await async_privada_desinvitar(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'terminar') {
		await async_privada_terminar(interaction, db);
	}
};

module.exports = command;