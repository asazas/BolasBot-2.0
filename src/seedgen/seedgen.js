const fs = require('fs');
const glob = require('glob');
const gaxios = require('gaxios');
const slugid = require('slugid');

const { mystery_settings } = require('./mystery');


/**
 * @summary Buscar un archivo de preset.
 *
 * @description A partir del nombre de un preset, devuelve la ruta al archivo de preset correspondiente.
 *
 * @param {string} preset Nombre del preset a buscar.
 *
 * @returns {?string} Ruta al archivo de preset buscado. Devuelve null si el preset no existe.
 */
function preset_file(preset) {
	const search_files = glob.sync(`rando-settings/**/${preset}.json`);
	if (search_files.length == 1) {
		return search_files[0];
	}
	else {
		return null;
	}
}


/**
 * @summary Añadir opciones de customizer por defecto.
 *
 * @description Añade a un preset de ALTTPR las opciones de customizer con sus valores por defecto. Si el preset
 * ya contiene opciones de customizer, esta función no hace nada.
 *
 * @param {object} preset_data Contenidos del archivo de preset de ALTTPR.
 *
 * @returns {object} Archivo de preset con las opciones de customizer añadidas.
 */
function add_default_customizer(preset_data) {
	if (!('l' in preset_data['settings'])) {
		const default_customizer = JSON.parse(fs.readFileSync('res/default-customizer.json'));
		preset_data['settings'] = { ...preset_data['settings'], ...default_customizer };
	}
	return preset_data;
}


/**
 * @summary Distribuye ítems en localizaciones forzadas.
 *
 * @description Útil presets de customizer en los que se indiquen ítems en localizaciones forzadas. Procesa
 * dichas localizaciones y distribuye los ítems adecuados de acuerdo a las indicaciones del preset.
 *
 * @param {object} preset_data Contenidos del archivo de preset de ALTTPR.
 *
 * @returns {object} Archivo de preset con objetos en localizaciones forzadas añadidos.
 */
function place_forced_locations(preset_data) {
	preset_data = add_default_customizer(preset_data);

	for (const entry of preset_data['forced_locations']) {
		if (!entry['quantity']) entry['quantity'] = 1;
		entry['quantity'] = Math.min(entry['quantity'], entry['locations'].length);
		if (!entry['chance']) entry['chance'] = 100;
		if (!entry['override']) entry['override'] = true;

		for (let i = 0; i < entry['quantity']; ++i) {
			if (Math.random() * 100 <= entry['chance']) {
				while (entry['locations'].length > 0) {
					const choice = Math.floor(Math.random() * entry['locations'].length);
					const loc = entry['locations'][choice];
					entry['locations'].splice(choice, 1);
					if (loc in preset_data['settings']['l']) continue;
					preset_data['settings']['l'][loc] = entry['item'];
					break;
				}
			}
		}
	}

	return preset_data;
}


/**
 * @summary Genera una seed de ALTTPR.
 *
 * @description Hace una solicitud a la API de ALTTPR para generar una seed a partir de los datos de preset especificados.
 *
 * @param {object} preset_data Contenido del archivo correspondiente al preset especificado.
 * @param {string} extra       Lista de opciones extra, separadas por espacios.
 *
 * @returns {object} Objeto con los datos de la seed generada, tal y como lo devuelve la API de ALTTPR.
 */
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
		if (extra_params.includes('keys')) {
			preset_data['settings']['dungeon_items'] = 'full';
		}
		if (extra_params.includes('pseudobotas')) {
			preset_data['settings']['pseudoboots'] = true;
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
		if (preset_data['forced_locations']) {
			preset_data = place_forced_locations(preset_data);
		}
		return await gaxios.request({ url: 'https://alttpr.com/api/customizer', method: 'POST', data: preset_data['settings'], retry: true });
	}
	return await gaxios.request({ url: 'https://alttpr.com/api/randomizer', method: 'POST', data: preset_data['settings'], retry: true });
}


/**
 * @summary Generación de una seed de SM.
 *
 * @summary Hace una solicitud a la API de SM para generar una seed a partir de los datos de preset especificados.
 *
 * @param {object} preset_data Contenido del archivo correspondiente al preset especificado.
 * @param {string} extra       Lista de opciones extra, separadas por espacios.
 * @param {number} jugadores   Número de jugadores (solo relevante para multiworld.)
 * @param {string} nombres     Lista de nombres de jugadores, separados por comas (solo relevante para multiworld.)
 *
 * @returns {object} Objeto con los datos de la seed generada, tal y como lo devuelve la API de SM.
 */
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


/**
 * @summary Generación de una seed de SMZ3.
 *
 * @summary Hace una solicitud a la API de SMZ3 para generar una seed a partir de los datos de preset especificados.
 *
 * @param {object} preset_data Contenido del archivo correspondiente al preset especificado.
 * @param {string} extra       Lista de opciones extra, separadas por espacios.
 * @param {number} jugadores   Número de jugadores (solo relevante para multiworld.)
 * @param {string} nombres     Lista de nombres de jugadores, separados por comas (solo relevante para multiworld.)
 *
 * @returns {object} Objeto con los datos de la seed generada, tal y como lo devuelve la API de SMZ3.
 */
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
		if (extra_params.includes('ad')) {
			preset_data['settings']['goal'] = 'alldungeonsdefeatmotherbrain';
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


/**
 * @summary Generación de una seed de SM VARIA randomizer, desde /seed crear o /seed varia.
 *
 * @description Hace una solicitud a la API de SM VARIA randomizer para generar una seed a partir de los presets
 *              de ajustes y de habilidades especificados.
 *
 * @param {object} preset_data Contenido del archivo de preset 'varia' especificado, o pasado por
 *                             generate_varia_finetune().
 * @param {string} extra       Parámetros extra especificados en el comando, separados por espacios.
 *
 * @returns {object} Objeto con los datos de la seed generada, tal y como devuelve la web de SM VARIA randomizer.
 */
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
		settings_preset = await gaxios.request({
			url: 'https://randommetroidsolver.pythonanywhere.com/randoPresetWebService',
			method: 'POST', data: settings, retry: true,
		});
	}
	catch (error) {
		throw { 'message': 'El preset de ajustes indicado no existe.' };
	}
	try {
		skills_preset = await gaxios.request({
			url: 'https://randommetroidsolver.pythonanywhere.com/presetWebService',
			method: 'POST', data: skills, retry: true,
		});
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

	return await gaxios.request({
		url: 'https://randommetroidsolver.pythonanywhere.com/randomizerWebService',
		method: 'POST', data: my_preset, retry: true,
	});
}


/**
 * @summary Creación de seeds a partir de presets de tipo 'random'.
 *
 * @description Escoge un preset al azar (teniendo en cuenta pesos) de entre los especificados en el archivo de
 * preset 'random' dado, y vuelve a llamar a generate_from_preset() usando el preset elegido.
 *
 * @param {object} preset_data Contenido del archivo de preset 'random' deseado.
 * @param {string} extra       Opciones extra, separadas por espacio. Se aplicarán siempre, sea cual sea el
 *                             preset elegido.
 * @param {number} recursion   Número de niveles de recursión, que aumenta si dentro del preset 'random' se elige
 *                             otro preset 'random'. La generación de seed falla si se superan los 3 niveles de
 *                             recursión.
 *
 * @returns {[string, object]} Un array con dos elementos: en la posición [0], un string que contiene el preset y
 * opciones extra especificadas en el comando; y en la posición [1], un objeto que contiene los datos de la seed
 * generada, tal y como lo devuelve la API del randomizer correspondiente.
 */
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


/**
 * @summary Inicio de la generación de una seed mediante archivo de preset, llamado en /seed crear, /seed multi,
 * /async crear y /carrera crear.
 *
 * @description Llama a la rutina de generación de seed correspondiente al archivo de preset dado.
 *
 * @param {object} cont_preset   Objeto que incluye los contenidos del archivo de preset.
 * @param {string} nombre_preset Nombre del preset.
 * @param {string} extra         Lista de opciones extra, separadas por espacios.
 * @param {number} jugadores     Número de jugadores (solo relevante en /seed multi.)
 * @param {string} nombres       Lista de nombres de jugadores, separados por comas (solo relevante en
 *                               /seed multi.)
 * @param {number} recursion     Niveles de recursión, solo relevante en presets de tipo 'random' para evitar un
 *                               potencial bucle infinito en la generación de la seed.
 *
 * @returns {[string, object]} Un array con dos elementos: en la posición [0], un string que contiene el preset y
 * opciones extra especificadas en el comando; y en la posición [1], un objeto que contiene los datos de la seed
 * generada, tal y como lo devuelve la API del randomizer correspondiente.
 */
async function generate_from_file(cont_preset, nombre_preset, extra, jugadores = 1, nombres = '', recursion = 0) {
	const full_preset = extra ? nombre_preset + ' ' + extra : nombre_preset;
	if (cont_preset['randomizer']) {
		switch (cont_preset['randomizer'].toLowerCase()) {
		case 'alttp':
		case 'alttpr':
			return [full_preset, await generate_alttpr(cont_preset, extra)];
		case 'mystery':
			return [full_preset, await generate_alttpr(mystery_settings(cont_preset), extra)];
		case 'sm':
			return [full_preset, await generate_sm(cont_preset, extra, jugadores, nombres)];
		case 'smz3':
			return [full_preset, await generate_smz3(cont_preset, extra, jugadores, nombres)];
		case 'varia':
			return [full_preset, await generate_varia(cont_preset, extra)];
		case 'random':
			return await generate_random(cont_preset, extra, recursion);
		}
	}

	// Algunos presets en SahasrahBot no tienen un parámetro "randomizer"
	// Presets de ALTTPR tienen un parámetro "customizer" cuyo valor es true/false
	if (cont_preset['customizer'] !== undefined && typeof cont_preset['customizer'] == 'boolean') {
		return [full_preset, await generate_alttpr(cont_preset, extra)];
	}

	// Presets de Mystery no tienen un parámetro "settings"
	if (cont_preset['settings'] === undefined) {
		return [full_preset, await generate_alttpr(mystery_settings(cont_preset), extra)];
	}

	// Si no se retornó ningún valor todavía, el preset no es válido
	throw { 'message': 'El archivo de preset proporcionado no es válido.' };
}


/**
 * @summary Inicio de la generación de una seed mediante nombre de preset, llamado en /seed crear, /seed multi,
 * /async crear y /carrera crear.
 *
 * @description Comprueba que existe el archivo del preset invocado y llama a la rutina de generación
 * correspondiente, dependiendo del tipo de seed solicitado.
 *
 * @param {string} preset    Nombre del preset solicitado.
 * @param {string} extra     Lista de opciones extra, separadas por espacios.
 * @param {number} jugadores Número de jugadores (solo relevante en /seed multi.)
 * @param {string} nombres   Lista de nombres de jugadores, separados por comas (solo relevante en /seed multi.)
 * @param {number} recursion Niveles de recursión, solo relevante en presets de tipo 'random' para evitar un
 *                           potencial bucle infinito en la generación de la seed.
 *
 * @returns {[string, object]} Un array con dos elementos: en la posición [0], un string que contiene el preset y
 * opciones extra especificadas en el comando; y en la posición [1], un objeto que contiene los datos de la seed
 * generada, tal y como lo devuelve la API del randomizer correspondiente.
 */
async function generate_from_preset(preset, extra, jugadores = 1, nombres = '', recursion = 0) {
	const preset_file_loc = preset_file(preset);
	if (preset_file_loc) {
		const preset_data = JSON.parse(fs.readFileSync(preset_file_loc));
		return await generate_from_file(preset_data, preset, extra, jugadores, nombres, recursion);
	}
}


/**
 * @summary Invocado por /seed varia.
 *
 * @description Genera una seed de SM VARIA randomizer a partir de los presets de settings y skills especificados.
 *
 * @param {string} settings Preset de ajustes de SM VARIA randomizer.
 * @param {string} skills   Preset de habilidades de SM VARIA randomizer.
 * @param {string} extra    Opciones extra especificadas en el comando.
 *
 * @returns {object} Objeto con los datos de la seed generada, tal y como devuelve la web de SM VARIA randomizer.
 */
async function generate_varia_finetune(settings, skills, extra) {
	const preset_data = JSON.parse(fs.readFileSync(preset_file('varia')));
	preset_data['settings']['settings_preset'] = settings;
	preset_data['settings']['skills_preset'] = skills;
	return await generate_varia(preset_data, extra);
}


const ALTTPR_URL_REGEX = /^https:\/\/alttpr\.com\/([a-z]{2}\/)?h\/\w{10}$/;
const SMZ3_URL_REGEX = /^https:\/\/(sm\.)?samus\.link\/seed\/[A-Za-z0-9_-]{8}[Q-T][A-Za-z0-9_-][CGKOSWaeimquy26-][A-Za-z0-9_-]{10}[AQgw]$/;


/**
 * @summary Datos de la seed a partir de su URL, llamado en /seed info, /jugar (en carreras asíncronas puntuables),
 * y /async crear y /carrera crear (si se especifica una URL de seed al crear la carrera o async.)
 *
 * @description Envía una solicitud a la API de ALTTPR o SMZ3 para obtener los datos de la seed correspondiente a
 * la URL dada.
 *
 * @param {string} url URL correspondiente a la seed de la que obtener información.
 *
 * @returns {?object} Objeto con la información de la seed, tal cual devuelve la API consultada. Puede devolver
 * null si la URL dada no es de una seed de ALTTP, SM o SMZ3.
 */
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

module.exports = { preset_file, generate_from_file, generate_from_preset, generate_varia_finetune, retrieve_from_url };