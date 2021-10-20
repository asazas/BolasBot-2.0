const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { async_cerrar, async_reabrir, async_purgar } = require('../racing/async_util');
const { carrera_crear } = require('../racing/carrera_util');


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
	.setName('carrera')
	.setDescription('Manejo de carreras.')
	.addSubcommand(subcommand =>
		subcommand.setName('crear')
			.setDescription('Crea una carrera.')
			.addStringOption(option =>
				option.setName('nombre')
					.setDescription('Nombre de la carrera asíncrona'))
			.addStringOption(preset_option)
			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra para preset.'))
			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed. Tiene precedencia sobre el preset.')))

	.addSubcommandGroup(subcommand_group =>
		subcommand_group.setName('forzar')
			.setDescription('Forzar inicio o cierre.')
			.addSubcommand(subcommand =>
				subcommand.setName('inicio')
					.setDescription('Forzar el inicio de la carrera.'))

			.addSubcommand(subcommand =>
				subcommand.setName('final')
					.setDescription('Forzar el final inmediato de la carrera.')));


command.execute = async function(interaction, db) {
	if (interaction.options.getSubcommand() == 'crear') {
		await carrera_crear(interaction, db);
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