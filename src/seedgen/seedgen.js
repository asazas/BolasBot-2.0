const fs = require('fs');
const glob = require('glob');
const axios = require('axios').default;
const slugid = require('slugid');

const { mystery_settings } = require('./mystery');

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

async function generate_sm(preset_data, extra) {
	if (extra) {
		const extra_params = extra.split(/\s+/);
		if (extra_params.includes('spoiler')) {
			preset_data['settings']['race'] = 'false';
		}
		if (extra_params.includes('hard')) {
			preset_data['settings']['logic'] = 'tournament';
		}
		if (extra_params.includes('split')) {
			preset_data['settings']['placement'] = 'split';
		}
	}
	return await axios.post('https://samus.link/api/randomizers/sm/generate', preset_data['settings']);
}

async function generate_smz3(preset_data, extra) {
	if (extra) {
		const extra_params = extra.split(/\s+/);
		if (extra_params.includes('spoiler')) {
			preset_data['settings']['race'] = 'false';
		}
		if (extra_params.includes('hard')) {
			preset_data['settings']['smlogic'] = 'hard';
		}
		if (extra_params.includes('keys')) {
			preset_data['settings']['keyshuffle'] = 'keysanity';
		}
	}
	return await axios.post('https://samus.link/api/randomizers/smz3/generate', preset_data['settings']);
}


async function generate_varia(preset_data, extra) {
	let extra_params = [];
	if (extra) {
		extra_params = extra.split(/\s+/);
	}

	const default_settings = JSON.parse(fs.readFileSync('res/json/varia-default-settings.json'));

	const settings = { 'randoPreset': preset_data['settings']['settings_preset'], 'origin': 'extStats' };
	const skills = { 'preset': preset_data['settings']['skills_preset'] };

	let settings_preset, skills_preset;
	try {
		settings_preset = await axios.post('https://randommetroidsolver.pythonanywhere.com/randoPresetWebService', settings);
	}
	catch (error) {
		throw { 'message': 'El preset de ajustes indicado no existe.' };
	}
	try {
		skills_preset = await axios.post('https://randommetroidsolver.pythonanywhere.com/presetWebService', skills);
	}
	catch (error) {
		throw { 'message': 'El preset de habilidades indicado no existe.' };
	}

	const my_preset = { ...default_settings, ...settings_preset['data'] };
	my_preset['preset'] = preset_data['settings']['skills_preset'];
	my_preset['raceMode'] = extra_params.includes('spoiler') ? 'off' : 'on';
	my_preset['paramsFileTarget'] = JSON.stringify(skills_preset['data']);

	for (const key in my_preset) {
		if (typeof my_preset[key] == 'object') {
			my_preset[key] = my_preset[key].join();
		}
	}

	return await axios.post('https://randommetroidsolver.pythonanywhere.com/randomizerWebService', my_preset);
}


async function generate_from_preset(preset, extra) {
	const preset_file_loc = preset_file(preset);
	if (preset_file_loc) {
		const preset_data = JSON.parse(fs.readFileSync(preset_file_loc));
		switch (preset_data['randomizer']) {
		case 'alttp':
			return await generate_alttpr(preset_data, extra);
		case 'mystery':
			return await generate_alttpr(mystery_settings(preset_data), extra);
		case 'sm':
			return await generate_sm(preset_data, extra);
		case 'smz3':
			return await generate_smz3(preset_data, extra);
		case 'varia':
			return await generate_varia(preset_data, extra);
		}
	}
}

async function generate_varia_finetune(settings, skills, extra) {
	const preset_data = JSON.parse(fs.readFileSync(preset_file('varia')));
	preset_data['settings']['settings_preset'] = settings;
	preset_data['settings']['skills_preset'] = skills;
	return await generate_varia(preset_data, extra);
}

async function alttpr_retrieve_from_url(url) {
	const seed_hash = url.split('/').pop();
	return await axios.get(`https://alttpr.com/hash/${seed_hash}`);
}

async function sm_retrieve_from_url(url) {
	const seed_slugid = url.split('/').pop();
	const seed_uuid = slugid.decode(seed_slugid).replaceAll('-', '');
	return await axios.get(`https://samus.link/api/seed/${seed_uuid}`);
}

module.exports = { generate_from_preset, generate_varia_finetune, alttpr_retrieve_from_url, sm_retrieve_from_url };