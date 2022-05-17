const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { crear_multiworld } = require('../archipelago/multi_utils');

const template_files = glob.sync('res/archipelago-yaml/*.yaml');
const plantillas = new SlashCommandStringOption();
plantillas.setName('juego')
	.setDescription('Juego del que obtener la plantilla de multiworld.')
	.setRequired(true);

for (const file of template_files) {
	const filename = path.basename(file, '.yaml');
	plantillas.addChoices({ name: filename, value: filename });
}

const command = {};
command.data = new SlashCommandBuilder()
	.setName('multiworld')
	.setDescription('Manejo de Archipelago Multiworld')
	.addSubcommand(subcommand =>
		subcommand.setName('crear')
			.setDescription('Generar una partida de Archipelago Multiworld')
			.addAttachmentOption(option =>
				option.setName('ajustes')
					.setDescription('Archivo comprimido (.zip) con los ajustes YAML para cada jugador')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('nombre')
					.setDescription('Nombre de la sesión de multiworld.'))
			.addBooleanOption(option =>
				option.setName('spoiler')
					.setDescription('¿Hacer visibles los spoiler logs de las seeds?')))

	.addSubcommand(subcommand =>
		subcommand.setName('plantilla')
			.setDescription('Obtener plantilla de ajustes para un juego de Archipelago Multiworld.')
			.addStringOption(plantillas));

command.execute = async function(interaction, db) {

	if (interaction.options.getSubcommand() == 'crear') {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}
		await crear_multiworld(interaction, db);
		return;
	}
	else if (interaction.options.getSubcommand() == 'plantilla') {
		const game = interaction.options.getString('juego');
		const template_path = `res/archipelago-yaml/${game}.yaml`;
		await interaction.reply({ files: [template_path] });
		return;
	}
};

module.exports = command;