const fs = require('fs');
const glob = require('glob');
const gaxios = require('gaxios');
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
	}
	return preset_data;
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
					if (preset_data['settings']['custom']['item']['count']['TwentyRupees2']) {
						preset_data['settings']['custom']['item']['count']['TwentyRupees2'] += 1;
					}
					else {
						preset_data['settings']['custom']['item']['count']['TwentyRupees2'] = 1;
					}
				}
			}
		}
	}

	if (preset_data['customizer']) {
		return await gaxios.request({ url: 'https://alttpr.com/api/customizer', method: 'POST', data: preset_data['settings'], retry: true });
	}
	return await gaxios.request({ url: 'https://alttpr.com/api/randomizer', method: 'POST', data: preset_data['settings'], retry: true });
}

async function generate_sm(preset_data, extra, jugadores = 1, nombres = '') {
	if (jugadores > 1) {
		preset_data['settings']['gamemode'] = 'multiworld';
		preset_data['settings']['players'] = `${jugadores}`;
		let cuenta_jugadores = 0;
		if (nombres) {
			const lista_nombres = nombres.split(',');
			for (const n of lista_nombres) {
				if (cuenta_jugadores >= jugadores) break;
				preset_data['settings'][`player-${cuenta_jugadores}`] = n;
				cuenta_jugadores++;
			}
		}
		while (cuenta_jugadores < jugadores) {
			preset_data['settings'][`player-${cuenta_jugadores}`] = `Jugador ${cuenta_jugadores + 1}`;
			cuenta_jugadores++;
		}
	}

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
	return await gaxios.request({ url: 'https://samus.link/api/randomizers/sm/generate', method: 'POST', data: preset_data['settings'], retry: true });
}

async function generate_smz3(preset_data, extra, jugadores = 1, nombres = '') {
	if (jugadores > 1) {
		preset_data['settings']['gamemode'] = 'multiworld';
		preset_data['settings']['players'] = `${jugadores}`;
		let cuenta_jugadores = 0;
		if (nombres) {
			const lista_nombres = nombres.split(',');
			for (const n of lista_nombres) {
				if (cuenta_jugadores >= jugadores) break;
				preset_data['settings'][`player-${cuenta_jugadores}`] = n.trim();
				cuenta_jugadores++;
			}
		}
		while (cuenta_jugadores < jugadores) {
			preset_data['settings'][`player-${cuenta_jugadores}`] = `Jugador ${cuenta_jugadores + 1}`;
			cuenta_jugadores++;
		}
	}

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
	return await gaxios.request({ url: 'https://samus.link/api/randomizers/smz3/generate', method: 'POST', data: preset_data['settings'], retry: true });
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
		settings_preset = await gaxios.request({ url: 'https://randommetroidsolver.pythonanywhere.com/randoPresetWebService',
			method: 'POST', data: settings, retry: true });
	}
	catch (error) {
		throw { 'message': 'El preset de ajustes indicado no existe.' };
	}
	try {
		skills_preset = await gaxios.request({ url: 'https://randommetroidsolver.pythonanywhere.com/presetWebService',
			method: 'POST', data: skills, retry: true });
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

	return await gaxios.request({ url: 'https://randommetroidsolver.pythonanywhere.com/randomizerWebService',
		method: 'POST', data: my_preset, retry: true });
}

async function generate_random(preset_data, extra, recursion = 0) {
	if (recursion > 3) {
		throw { 'message': 'Superado límite de recursión.' };
	}

	const options = [];
	let chance_total = 0;
	for (const option of preset_data['presets']) {
		if (option['preset'] && preset_file(option['preset']) && option['chance']) {
			options.push(option);
			chance_total += option['chance'];
		}
	}

	const rng = Math.random() * chance_total;
	let accum = 0;
	for (const o of options) {
		accum += o['chance'];
		if (rng < accum) {
			if (o['extra']) extra = extra ? o['extra'] + ' ' + extra : o['extra'];
			return await generate_from_preset(o['preset'], extra, undefined, undefined, recursion + 1);
		}
	}
}

async function generate_from_preset(preset, extra, jugadores = 1, nombres = '', recursion = 0) {
	const full_preset = extra ? preset + ' ' + extra : preset;
	const preset_file_loc = preset_file(preset);
	if (preset_file_loc) {
		const preset_data = JSON.parse(fs.readFileSync(preset_file_loc));
		switch (preset_data['randomizer']) {
		case 'alttp':
			return [full_preset, await generate_alttpr(preset_data, extra)];
		case 'mystery':
			return [full_preset, await generate_alttpr(mystery_settings(preset_data), extra)];
		case 'sm':
			return [full_preset, await generate_sm(preset_data, extra, jugadores, nombres)];
		case 'smz3':
			return [full_preset, await generate_smz3(preset_data, extra, jugadores, nombres)];
		case 'varia':
			return [full_preset, await generate_varia(preset_data, extra)];
		case 'random':
			return await generate_random(preset_data, extra, recursion);
		}
	}
}

async function generate_varia_finetune(settings, skills, extra) {
	const preset_data = JSON.parse(fs.readFileSync(preset_file('varia')));
	preset_data['settings']['settings_preset'] = settings;
	preset_data['settings']['skills_preset'] = skills;
	return await generate_varia(preset_data, extra);
}

const ALTTPR_URL_REGEX = /^https:\/\/alttpr\.com\/([a-z]{2}\/)?h\/\w{10}$/;
const SMZ3_URL_REGEX = /^https:\/\/(sm\.)?samus\.link\/seed\/[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$/;

async function retrieve_from_url(url) {
	if (ALTTPR_URL_REGEX.test(url)) {
		const seed_hash = url.split('/').pop();
		return await gaxios.request({ url: `https://alttpr.com/hash/${seed_hash}`, retry: true });
	}
	else if (SMZ3_URL_REGEX.test(url)) {
		const seed_slugid = url.split('/').pop();
		const seed_uuid = slugid.decode(seed_slugid).replaceAll('-', '');
		return await gaxios.request({ url: `https://samus.link/api/seed/${seed_uuid}`, retry: true });
	}
	return null;
}

module.exports = { preset_file, generate_from_preset, generate_varia_finetune, retrieve_from_url };