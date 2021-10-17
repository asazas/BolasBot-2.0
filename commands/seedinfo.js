const { MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { retrieve_from_url, seed_info_embed } = require('../src/seedgen/seedgen');
const { get_formatted_spoiler } = require('../src/seedgen/spoiler');

const ALTTPR_URL_REGEX = /^https:\/\/alttpr\.com\/([a-z]{2}\/)?h\/\w{10}$/;

const command = {};
command.data = new SlashCommandBuilder()
	.setName('seedinfo')
	.setDescription('Muestra información de una seed de ALTTPR.')
	.addStringOption(option =>
		option.setName('url')
			.setDescription('URL de la seed.')
			.setRequired(true));

command.execute = async function(interaction) {
	const url = interaction.options.getString('url');
	if (!ALTTPR_URL_REGEX.test(url)) {
		throw 'La URL proporcionada no es válida.';
	}

	await interaction.deferReply();
	const seed = await retrieve_from_url(url);
	if (seed['data']['spoiler']['meta']['spoilers'] == 'on' || seed['data']['spoiler']['meta']['spoilers'] == 'generate') {
		const spoiler = JSON.stringify(get_formatted_spoiler(seed), null, 4);
		const spoiler_attachment = new MessageAttachment(Buffer.from(spoiler), 'spoiler.json');
		spoiler_attachment.setSpoiler(true);
		await interaction.editReply({ embeds: [seed_info_embed(seed, interaction)], files: [spoiler_attachment] });
	}
	else {
		await interaction.editReply({ embeds: [seed_info_embed(seed, interaction)] });
	}
};

module.exports = command;