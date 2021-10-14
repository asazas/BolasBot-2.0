const fs = require('fs');
const glob = require('glob');
const axios = require('axios').default;
const { MessageEmbed } = require('discord.js');

const { get_seed_code } = require('./seedgen-util');

function seed_info_embed(seed, interaction, preset = '') {
	const code = get_seed_code(seed).join(' | ');
	const url = `https://alttpr.com/h/${seed.data.hash}`;
	const embed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(preset)
		.setURL(url)
		.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
		.addField('Autor', interaction.user.username)
		.addField('URL', url)
		.addField('Hash', code)
		.setTimestamp();
	return embed;
}

function preset_file(preset) {
	const search_files = glob.sync(`rando-settings/**/${preset}.json`);
	if (search_files.length == 1) {
		return search_files[0];
	}
	else {
		return null;
	}
}

function add_default_customizer(preset_data) {
	if (!('l' in preset_data['settings'])) {
		const default_customizer = JSON.parse(fs.readFileSync('res/default-customizer.json'));
		preset_data['settings'] = { ...preset_data['settings'], ...default_customizer };
		return preset_data;
	}
}

async function generate_alttpr(preset_data, extra) {
	if (extra) {
		const extra_params = extra.split(/\s+/);
		if (extra_params.includes('spoiler')) {
			preset_data['settings']['spoilers'] = 'on';
		}
		if (extra_params.includes('noqs')) {
			preset_data['settings']['allow_quickswap'] = false;
		}
		if (extra_params.includes('pistas')) {
			preset_data['settings']['hints'] = 'on';
		}
		if (extra_params.includes('ad')) {
			preset_data['settings']['goal'] = 'dungeons';
		}
		if (extra_params.includes('hard')) {
			preset_data['settings']['item']['pool'] = 'hard';
		}
		if (extra_params.includes('botas')) {
			preset_data = add_default_customizer(preset_data);
			preset_data['customizer'] = true;
			if (!preset_data['settings']['eq'].includes('PegasusBoots')) {
				preset_data['settings']['eq'].push('PegasusBoots');
				if (preset_data['settings']['custom']['item']['count']['PegasusBoots'] > 0) {
					preset_data['settings']['custom']['item']['count']['PegasusBoots'] -= 1;
					preset_data['settings']['custom']['item']['count']['TwentyRupees2'] += 1;
				}
			}
		}
	}

	if (preset_data['customizer']) {
		return await axios.post('https://alttpr.com/api/customizer', preset_data['settings']);
	}
	return await axios.post('https://alttpr.com/api/randomizer', preset_data['settings']);
}

async function generate_from_preset(preset, extra) {
	const preset_file_loc = preset_file(preset);
	if (preset_file_loc) {
		const preset_data = JSON.parse(fs.readFileSync(preset_file_loc));
		return await generate_alttpr(preset_data, extra);
	}
}

module.exports = { generate_from_preset, seed_info_embed };