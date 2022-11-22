const glob = require('glob');
const path = require('path');
const gaxios = require('gaxios');
const YAML = require('yaml');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { generate_from_preset, generate_varia_finetune, retrieve_from_url, preset_file, generate_from_file } = require('../seedgen/seedgen');
const { seed_info_embed, varia_info_embed } = require('../seedgen/info_embeds');
const { preset_help, extra_help } = require('../seedgen/help');
const { CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');


/**
 * @summary Llamado al terminar el proceso de generación de una seed con /seed crear y /seed multi.
 *
 * @description Obtiene un embed con los datos de la seed generada y responde al comando inicialmente invocado.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 * @param {object}             seed        Objeto con los datos de la seed, tal y como lo devuelve la API del
 *                                         randomizer correspondiente.
 * @param {string}             full_preset Preset de la seed generada y opciones extra, separadas por espacios.
 */
async function responder_seed(interaction, seed, full_preset) {
	const info_embed = seed_info_embed(seed, interaction, full_preset);
	if (info_embed[1]) {
		await interaction.editReply({ embeds: [info_embed[0]], files: [info_embed[1]] });
	}
	else {
		await interaction.editReply({ embeds: [info_embed[0]] });
	}
}


/**
 * @summary Punto de entrada para /seed crear y /seed multi.
 *
 * @description Crea una seed a partir de un preset y responde con sus datos.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {number}             jugadores   Número de jugadores (solo relevante para /seed multi.)
 * @param {string}             nombres     Nombres de los jugadores, separados por comas (solo relevante
 *                                         para /seed multi.)
 */
async function seed_crear(interaction, jugadores = 1, nombres = '') {
	await interaction.deferReply();

	let extra = interaction.options.getString('extra');
	if (extra) {
		extra = extra.toLowerCase();
	}

	const archivo = interaction.options.getAttachment('archivo');
	if (archivo) {
		const settings_file = await gaxios.request({ url: archivo.url, responseType: 'text', retry: true });
		let settings_data;
		try {
			settings_data = JSON.parse(settings_file.data);
		}
		catch (error1) {
			try {
				settings_data = YAML.parse(settings_file.data);
			}
			catch (error2) {
				throw { 'message': 'El archivo proporcionado no es un fichero .json o .yaml válido.' };
			}
		}
		const [full_preset, seed] = await generate_from_file(settings_data, archivo.name, extra, jugadores, nombres);
		responder_seed(interaction, seed, full_preset);
		return;
	}

	const url = interaction.options.getString('url');
	if (url) {
		await seed_info(interaction);
		return;
	}

	let preset = interaction.options.getString('preset');
	if (preset) {
		preset = preset.toLowerCase();
		const [full_preset, seed] = await generate_from_preset(preset, extra, jugadores, nombres);
		responder_seed(interaction, seed, full_preset);
		return;
	}

	throw { 'message': 'No se ha dado archivo, URL ni preset para crear la seed.' };
}


/**
 * @summary Respuesta para /seed crear cuando se pasa una URL como parámetro.
 *
 * @description Obtiene la información de una seed a partir de su URL y responde con un embed.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 */
async function seed_info(interaction) {
	const url = interaction.options.getString('url');
	const seed = await retrieve_from_url(url);

	if (seed) {
		const info_embed = seed_info_embed(seed, interaction);
		if (info_embed[1]) {
			await interaction.editReply({ embeds: [info_embed[0]], files: [info_embed[1]] });
		}
		else {
			await interaction.editReply({ embeds: [info_embed[0]] });
		}
	}
	else {
		throw { 'message': 'La URL proporcionada no es válida.' };
	}
}


const preset_files = glob.sync('rando-settings/**/*.json');
const preset_option = new SlashCommandStringOption();
preset_option.setName('preset')
	.setDescription('Preset disponible en BolasBot.');

const preset_option_config = new SlashCommandStringOption();
preset_option_config.setName('preset')
	.setDescription('Preset del que obtener el archivo de configuración')
	.setRequired(true);

const preset_option_help = new SlashCommandStringOption();
preset_option_help.setName('preset')
	.setDescription('Preset del que obtener información');

for (const file of preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_option.addChoices({ name: `${dirname} - ${filename}`, value: filename });
	preset_option_config.addChoices({ name: `${dirname} - ${filename}`, value: filename });
	preset_option_help.addChoices({ name: `${dirname} - ${filename}`, value: filename });
}

const sm_preset_files = glob.sync('rando-settings/sm*/*.json');
const preset_multi = new SlashCommandStringOption();
preset_multi.setName('preset')
	.setDescription('Preset disponible en BolasBot.');

for (const file of sm_preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_multi.addChoices({ name: `${dirname} - ${filename}`, value: filename });
}

const command = {};
command.data = new SlashCommandBuilder()
	.setName('seed')
	.setDescription('Genera seed.')
	.addSubcommand(subcommand =>
		subcommand.setName('crear')
			.setDescription('Crea una seed a partir de un preset adjunto, URL o preset de BolasBot.')

			.addAttachmentOption(option =>
				option.setName('archivo')
					.setDescription('Archivo de preset .json (formato BolasBot) o .yaml (formato SahasrahBot)'))

			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed.'))

			.addStringOption(preset_option)

			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra.')
					.setAutocomplete(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('varia')
			.setDescription('Seed de VARIA randomizer con configuración específica.')
			.addStringOption(option =>
				option.setName('settings')
					.setDescription('Preset de ajustes')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('skills')
					.setDescription('Preset de habilidades')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra.')
					.setAutocomplete(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('multi')
			.setDescription('Crear partida de multiworld via SMZ3.')

			.addIntegerOption(option =>
				option.setName('jugadores')
					.setDescription('Número de jugadores, máximo 20')
					.setRequired(true))

			.addAttachmentOption(option =>
				option.setName('archivo')
					.setDescription('Archivo de preset .json (formato BolasBot) o .yaml (formato SahasrahBot)'))

			.addStringOption(preset_multi)

			.addStringOption(option =>
				option.setName('nombres')
					.setDescription('Lista de nombres de jugadores, separados por comas'))

			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra.')
					.setAutocomplete(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('config')
			.setDescription('Obtener el archivo de configuración de un preset de BolasBot.')
			.addStringOption(preset_option_config))

	.addSubcommandGroup(subcommandGroup =>
		subcommandGroup.setName('ayuda')
			.setDescription('Ayuda')
			.addSubcommand(subcommand =>
				subcommand.setName('presets')
					.setDescription('Ayuda de presets disponibles')
					.addStringOption(preset_option_help))

			.addSubcommand(subcommand =>
				subcommand.setName('extra')
					.setDescription('Ayuda de opciones extra')))

	.addSubcommand(subcommand =>
		subcommand.setName('torneo')
			.setDescription('Generar una seed con configuración de Torneo Hispano ALTTPR 2023.'));


command.execute = async function(interaction) {
	if (interaction.options.getSubcommand() == 'crear') {
		await seed_crear(interaction);
		return;
	}

	else if (interaction.options.getSubcommand() == 'multi') {
		let jugadores = interaction.options.getInteger('jugadores');
		if (jugadores > 20) jugadores = 20;
		if (jugadores < 1) jugadores = 1;
		const nombres = interaction.options.getString('nombres');
		await seed_crear(interaction, jugadores, nombres);
		return;
	}

	else if (interaction.options.getSubcommand() == 'varia') {
		await interaction.deferReply();
		const settings_preset = interaction.options.getString('settings').toLowerCase();
		const skills_preset = interaction.options.getString('skills').toLowerCase();
		let extra = interaction.options.getString('extra');
		if (extra) {
			extra = extra.toLowerCase();
		}
		const seed = await generate_varia_finetune(settings_preset, skills_preset, extra);
		await interaction.editReply({ embeds: [varia_info_embed(seed, interaction, `${settings_preset} ${skills_preset}`)] });
		return;
	}

	else if (interaction.options.getSubcommand() == 'config') {
		const preset = interaction.options.getString('preset').toLowerCase();
		const file = preset_file(preset);
		await interaction.reply({ files: [file] });
		return;
	}

	else if (interaction.options.getSubcommand() == 'presets') {
		await interaction.reply({ embeds: [preset_help(interaction)] });
		return;
	}

	else if (interaction.options.getSubcommand() == 'extra') {
		await interaction.reply({ embeds: [extra_help(interaction)] });
		return;
	}

	else if (interaction.options.getSubcommand() == 'torneo') {
		const ans_embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setTitle('Seed de Torneo Hispano ALTTPR 2023')
			.setDescription('Elige uno de los modos disponibles.')
			.setTimestamp();

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('standard')
				.setLabel('Standard')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId('openboots')
				.setLabel('Open Boots')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId('ambrosia')
				.setLabel('Ambrosia')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId('keysanity')
				.setLabel('Keysanity')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId('enemizer')
				.setLabel('Enemizer')
				.setStyle(ButtonStyle.Primary),
		);

		await interaction.reply({ embeds: [ans_embed], components: [row], ephemeral: true });
		return;
	}
};

module.exports = command;