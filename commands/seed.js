const glob = require('glob');
const path = require('path');
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { generate_from_preset, seed_info_embed } = require('../src/seedgen');

const preset_files = glob.sync('rando-settings/**/*.json');
const preset_option = new SlashCommandStringOption();
preset_option.setName('preset')
	.setDescription('Preset.')
	.setRequired(true);

for (const file of preset_files) {
	const filename = path.basename(file, '.json');
	const dirname = path.basename(path.dirname(file)).toUpperCase();
	preset_option.addChoice(`${dirname} - ${filename}`, filename);
}

const command = {};
command.data = new SlashCommandBuilder()
	.setName('seed')
	.setDescription('Genera seed.')
	.addStringOption(preset_option)
	.addStringOption(option =>
		option.setName('extra')
			.setDescription('Opciones extra.'));

command.execute = async function(interaction) {
	await interaction.deferReply();
	const preset = interaction.options.getString('preset').toLowerCase();
	let extra = interaction.options.getString('extra');
	if (extra) {
		extra = extra.toLowerCase();
	}
	const full_preset = extra ? preset + ' ' + extra : preset;
	const seed = await generate_from_preset(preset, extra);
	await interaction.editReply({ embeds: [seed_info_embed(seed, interaction, full_preset)] });
};

module.exports = command;