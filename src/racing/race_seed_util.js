const { seed_raw_data } = require('../seedgen/info_embeds');
const { retrieve_from_url, generate_from_preset } = require('../seedgen/seedgen');

async function seed_in_create_race(interaction) {
	let seed = null;
	let full_preset = null;
	let seed_info = null;

	const url = interaction.options.getString('url');
	if (url) {
		seed = await retrieve_from_url(url);
		// failsafe para VARIA
		if (!seed) {
			seed_info = {};
			seed_info['url'] = url;
			seed_info['author'] = interaction.user.username;
		}
	}
	else {
		let preset = interaction.options.getString('preset');
		if (preset) {
			preset = preset.toLowerCase();
			let extra = interaction.options.getString('extra');
			if (extra) {
				extra = extra.toLowerCase();
			}
			[full_preset, seed] = await generate_from_preset(preset, extra);
			if (!seed) {
				throw { 'message': 'Error al crear la seed a partir del preset.' };
			}
		}
	}
	if (seed) {
		seed_info = seed_raw_data(seed, interaction, full_preset);
	}
	return { 'seed': seed, 'full_preset': full_preset, 'seed_info': seed_info };
}

module.exports = { seed_in_create_race };