const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { generate_from_preset, generate_varia_finetune, retrieve_from_url, preset_file } = require('../seedgen/seedgen');
const { seed_info_embed, varia_info_embed } = require('../seedgen/info_embeds');
const { preset_help, extra_help } = require('../seedgen/help');


async function seed_crear(interaction, jugadores = 1, nombres = '') {
	await interaction.deferReply();
	const preset = interaction.options.getString('preset').toLowerCase();
	let extra = interaction.options.getString('extra');
	if (extra) {
		extra = extra.toLowerCase();
	}
	const [full_preset, seed] = await generate_from_preset(preset, extra, jugadores, nombres);

	const info_embed = seed_info_embed(seed, interaction, full_preset);
	if (info_embed[1]) {
		await interaction.editReply({ embeds: [info_embed[0]], files: [info_embed[1]] });
	}
	else {
		await interaction.editReply({ embeds: [info_embed[0]] });
	}
}


async function seed_info(interaction) {
	const url = interaction.options.getString('url');
	await interaction.deferReply();
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
	.setDescription('Preset.')
	.setRequired(true);
const preset_option_help = new SlashCommandStringOption();
preset_option_help.setName('preset')
	.setDescription('Preset del que obtener información');

for (const file of preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_option.addChoices({ name: `${dirname} - ${filename}`, value: filename });
	preset_option_help.addChoices({ name: `${dirname} - ${filename}`, value: filename });
}

const sm_preset_files = glob.sync('rando-settings/sm*/*.json');
const preset_multi = new SlashCommandStringOption();
preset_multi.setName('preset')
	.setDescription('Preset.')
	.setRequired(true);
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
			.setDescription('Crea una seed a partir de un preset.')
			.addStringOption(preset_option)
			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra.')))

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
					.setDescription('Opciones extra.')))

	.addSubcommand(subcommand =>
		subcommand.setName('multi')
			.setDescription('Crear partida de multiworld via SMZ3.')
			.addStringOption(preset_multi)
			.addIntegerOption(option =>
				option.setName('jugadores')
					.setDescription('Número de jugadores, máximo 20')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('nombres')
					.setDescription('Lista de nombres de jugadores, separados por comas'))
			.addStringOption(option =>
				option.setName('extra')
					.setDescription('Opciones extra.')))

	.addSubcommand(subcommand =>
		subcommand.setName('info')
			.setDescription('Obtener información de una seed a partir de su URL.')
			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed.')
					.setRequired(true)))

	.addSubcommand(subcommand =>
		subcommand.setName('config')
			.setDescription('Obtener el archivo de configuración de un preset.')
			.addStringOption(preset_option))

	.addSubcommandGroup(subcommandGroup =>
		subcommandGroup.setName('ayuda')
			.setDescription('Ayuda')
			.addSubcommand(subcommand =>
				subcommand.setName('presets')
					.setDescription('Ayuda de presets disponibles')
					.addStringOption(preset_option_help))

			.addSubcommand(subcommand =>
				subcommand.setName('extra')
					.setDescription('Ayuda de opciones extra')));


command.execute = async function (interaction) {
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

	else if (interaction.options.getSubcommand() == 'info') {
		await seed_info(interaction);
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
};

module.exports = command;