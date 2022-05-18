const gaxios = require('gaxios');
const YAML = require('yaml');
const { CommandInteraction } = require('discord.js');
const { seed_raw_data } = require('../seedgen/info_embeds');
const { retrieve_from_url, generate_from_preset, generate_from_file } = require('../seedgen/seedgen');


/**
 * @summary Llamado en /async crear y /carrera crear.
 *
 * @description Genera una seed a partir de un preset (de archivo o de BolasBot), o la recupera a partir de una
 * URL, para su uso en una carrera síncrona o asíncrona.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 *
 * @returns {object} Un objeto con tres atributos: la seed (tal y como devuelve la API del randomizer
 * correspondiente), el preset con opciones extra, y la información de la seed (tal y como devuelve la función
 * seed_raw_data().) En caso de seeds obtenidas a partir de URL, devuelve el valor null para el atributo
 * "full_preset", y devuelve null para el atributo "seed" si no es una URL de ALTTPR, SM o SMZ3.
 */
async function seed_in_create_race(interaction) {
	let seed = null;
	let full_preset = null;
	let seed_info = null;

	let extra = interaction.options.getString('extra');
	if (extra) {
		extra = extra.toLowerCase();
	}

	const archivo = interaction.options.getAttachment('archivo');
	const url = interaction.options.getString('url');
	let preset = interaction.options.getString('preset');

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
		[full_preset, seed] = await generate_from_file(settings_data, archivo.name, extra);
		if (!seed) {
			throw { 'message': 'Error al crear la seed a partir del archivo de preset.' };
		}
	}

	else if (url) {
		seed = await retrieve_from_url(url);
		// failsafe para URL que no son ALTTPR / SM / SMZ3
		if (!seed) {
			seed_info = {};
			seed_info['url'] = url;
			seed_info['author'] = interaction.user.username;
		}
	}

	else if (preset) {
		preset = preset.toLowerCase();
		[full_preset, seed] = await generate_from_preset(preset, extra);
		if (!seed) {
			throw { 'message': 'Error al crear la seed a partir del preset.' };
		}
	}
	if (seed) {
		seed_info = seed_raw_data(seed, interaction, full_preset);
	}
	return { 'seed': seed, 'full_preset': full_preset, 'seed_info': seed_info };
}

module.exports = { seed_in_create_race };