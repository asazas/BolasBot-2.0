const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { async_crear, async_cerrar, async_reabrir, async_purgar } = require('../racing/async_util');


const preset_files = glob.sync('rando-settings/**/*.json');
const preset_option = new SlashCommandStringOption();
preset_option.setName('preset')
	.setDescription('Preset.');

for (const file of preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_option.addChoice(`${dirname} - ${filename}`, filename);
}

const command = {};
command.data = new SlashCommandBuilder()
	.setName('async')
	.setDescription('Manejo de carreras asíncronas.')
	.addSubcommand(subcommand =>
		subcommand.setName('crear')
			.setDescription('Crea una carrera asíncrona.')
			.addStringOption(option =>
				option.setName('nombre')
					.setDescription('Nombre de la carrera asíncrona'))
			.addBooleanOption(option =>
				option.setName('blind')
					.setDescription('¿Deberían los participantes ver los resultados de la carrera al terminar?'))
			.addStringOption(preset_option)
			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra para preset.'))
			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed. Tiene precedencia sobre el preset.')))

	.addSubcommand(subcommand =>
		subcommand.setName('cerrar')
			.setDescription('Cerrar la carrera asíncrona'))

	.addSubcommand(subcommand =>
		subcommand.setName('reabrir')
			.setDescription('Reabrir la carrera asíncrona'))

	.addSubcommand(subcommand =>
		subcommand.setName('purgar')
			.setDescription('Purgar la carrera asíncrona'));


command.execute = async function(interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}

	if (interaction.options.getSubcommand() == 'crear') {
		await async_crear(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'cerrar') {
		await async_cerrar(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'reabrir') {
		await async_reabrir(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'purgar') {
		await async_purgar(interaction, db);
	}
};

module.exports = command;