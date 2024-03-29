const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { crear_multiworld } = require('../archipelago/multi_utils');
const { EmbedBuilder } = require('discord.js');

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
	.setDescription('Manejo de Archipelago Multiworld');

// DESHABILITADO POR PROBLEMAS CON ARCHIPELAGO API

// .addSubcommand(subcommand =>
// 	subcommand.setName('crear')
// 		.setDescription('Generar una partida de Archipelago Multiworld')
// 		.addAttachmentOption(option =>
// 			option.setName('ajustes')
// 				.setDescription('Archivo comprimido (.zip) con los ajustes YAML para cada jugador')
// 				.setRequired(true))
// 		.addStringOption(option =>
// 			option.setName('nombre')
// 				.setDescription('Nombre de la sesión de multiworld.'))
// 		.addBooleanOption(option =>
// 			option.setName('spoiler')
// 				.setDescription('¿Hacer visibles los spoiler logs de las seeds?')))

// .addSubcommand(subcommand =>
// 	subcommand.setName('plantilla')
// 		.setDescription('Obtener plantilla de ajustes para un juego de Archipelago Multiworld.')
// 		.addStringOption(plantillas));

command.execute = async function(interaction, db) {

	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTitle('Archipelago Multiworld')
		.setDescription('Genera y juega partidas de Archipelago Multiworld en: https://archipelago.gg/')
		.setTimestamp();

	await interaction.reply({ embeds: [ans_embed] });


	// DESHABILITADO POR PROBLEMAS CON ARCHIPELAGO API

	// if (interaction.options.getSubcommand() == 'crear') {
	// 	await crear_multiworld(interaction, db);
	// 	return;
	// }
	// else if (interaction.options.getSubcommand() == 'plantilla') {
	// 	const game = interaction.options.getString('juego');
	// 	const template_path = `res/archipelago-yaml/${game}.yaml`;
	// 	await interaction.reply({ files: [template_path] });
	// 	return;
	// }
};

module.exports = command;