const glob = require('glob');
const path = require('path');
const { MessageAttachment } = require('discord.js');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { generate_from_preset, generate_varia_finetune, alttpr_retrieve_from_url, sm_retrieve_from_url } = require('../src/seedgen/seedgen');
const { alttpr_info_embed, sm_info_embed, varia_info_embed } = require('../src/seedgen/util');
const { get_formatted_spoiler } = require('../src/seedgen/spoiler');
const { preset_help } = require('../src/seedgen/help');


const ALTTPR_URL_REGEX = /^https:\/\/alttpr\.com\/([a-z]{2}\/)?h\/\w{10}$/;
const SMZ3_URL_REGEX = /^https:\/\/(sm\.)?samus\.link\/seed\/[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$/;


async function seed_crear(interaction) {
	await interaction.deferReply();
	const preset = interaction.options.getString('preset').toLowerCase();
	let extra = interaction.options.getString('extra');
	if (extra) {
		extra = extra.toLowerCase();
	}
	const full_preset = extra ? preset + ' ' + extra : preset;
	const seed = await generate_from_preset(preset, extra);

	// super metroid varia randomizer
	if (seed['data']['seedKey']) {
		await interaction.editReply({ embeds: [varia_info_embed(seed, interaction, full_preset)] });
		return;
	}

	// super metroid randomizer / combo randomizer
	else if (seed['data']['gameId'] == 'sm' || seed['data']['gameId'] == 'smz3') {
		await interaction.editReply({ embeds: [sm_info_embed(seed, interaction, full_preset)] });
		return;
	}

	else if (seed['data']['spoiler']['meta']['spoilers'] == 'on' || seed['data']['spoiler']['meta']['spoilers'] == 'generate') {
		const spoiler = JSON.stringify(get_formatted_spoiler(seed), null, 4);
		const spoiler_attachment = new MessageAttachment(Buffer.from(spoiler), 'spoiler.json');
		spoiler_attachment.setSpoiler(true);
		await interaction.editReply({ embeds: [alttpr_info_embed(seed, interaction, full_preset)], files: [spoiler_attachment] });
	}
	else {
		await interaction.editReply({ embeds: [alttpr_info_embed(seed, interaction, full_preset)] });
	}
}


async function seed_info(interaction) {
	const url = interaction.options.getString('url');
	if (ALTTPR_URL_REGEX.test(url)) {
		await interaction.deferReply();
		const seed = await alttpr_retrieve_from_url(url);
		if (seed['data']['spoiler']['meta']['spoilers'] == 'on' || seed['data']['spoiler']['meta']['spoilers'] == 'generate') {
			const spoiler = JSON.stringify(get_formatted_spoiler(seed), null, 4);
			const spoiler_attachment = new MessageAttachment(Buffer.from(spoiler), 'spoiler.json');
			spoiler_attachment.setSpoiler(true);
			await interaction.editReply({ embeds: [alttpr_info_embed(seed, interaction)], files: [spoiler_attachment] });
		}
		else {
			await interaction.editReply({ embeds: [alttpr_info_embed(seed, interaction)] });
		}
		return;
	}

	else if (SMZ3_URL_REGEX.test(url)) {
		await interaction.deferReply();
		const seed = await sm_retrieve_from_url(url);
		await interaction.editReply({ embeds: [sm_info_embed(seed, interaction)] });
		return;
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
	preset_option.addChoice(`${dirname} - ${filename}`, filename);
	preset_option_help.addChoice(`${dirname} - ${filename}`, filename);
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
		subcommand.setName('info')
			.setDescription('Obtener información de una seed a partir de su URL.')
			.addStringOption(option =>
				option.setName('url')
					.setDescription('URL de la seed.')
					.setRequired(true)))

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


command.execute = async function(interaction) {
	if (interaction.options.getSubcommand() == 'crear') {
		await seed_crear(interaction);
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

	else if (interaction.options.getSubcommand() == 'presets') {
		await interaction.reply({ embeds: [preset_help(interaction)] });
		return;
	}
};

module.exports = command;