const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { carrera_crear, carrera_entrar, carrera_salir, carrera_listo, carrera_no_listo, carrera_forzar_inicio, carrera_forzar_final, carrera_forzar_cancelar } = require('../racing/carrera_util');


const preset_files = glob.sync('rando-settings/**/*.json');
const preset_option = new SlashCommandStringOption();
preset_option.setName('preset')
	.setDescription('Preset.');

for (const file of preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_option.addChoices({ name: `${dirname} - ${filename}`, value: filename });
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
			.addBooleanOption(option =>
				option.setName('ranked')
					.setDescription('Determina si la carrera es puntuable.'))
			.addStringOption(preset_option)
			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra para preset.'))
			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed. Tiene precedencia sobre el preset.')))

	.addSubcommand(subcommand =>
		subcommand.setName('entrar')
			.setDescription('Unirme a una carrera.'))
	.addSubcommand(subcommand =>
		subcommand.setName('salir')
			.setDescription('Salir de la carrera.'))
	.addSubcommand(subcommand =>
		subcommand.setName('listo')
			.setDescription('Declararme como listo para iniciar la carrera.'))
	.addSubcommand(subcommand =>
		subcommand.setName('no_listo')
			.setDescription('Retirar el estado de listo para iniciar la carrera.'))

	.addSubcommandGroup(subcommand_group =>
		subcommand_group.setName('forzar')
			.setDescription('Forzar inicio o cierre.')
			.addSubcommand(subcommand =>
				subcommand.setName('inicio')
					.setDescription('Forzar el inicio de la carrera.'))

			.addSubcommand(subcommand =>
				subcommand.setName('final')
					.setDescription('Forzar el final inmediato de la carrera.'))

			.addSubcommand(subcommand =>
				subcommand.setName('cancelar')
					.setDescription('Cancelar la carrera.')));


command.execute = async function (interaction, db) {
	if (!interaction.inGuild()) {
		throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
	}

	if (interaction.options.getSubcommand() == 'crear') {
		await carrera_crear(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'entrar') {
		await carrera_entrar(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'salir') {
		await carrera_salir(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'listo') {
		await carrera_listo(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'no_listo') {
		await carrera_no_listo(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'inicio') {
		await carrera_forzar_inicio(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'final') {
		await carrera_forzar_final(interaction, db);
	}
	else if (interaction.options.getSubcommand() == 'cancelar') {
		await carrera_forzar_cancelar(interaction, db);
	}
};

module.exports = command;