const { CommandInteraction } = require('discord.js');
const { seed_raw_data } = require('../seedgen/info_embeds');
const { retrieve_from_url, generate_from_preset } = require('../seedgen/seedgen');


/**
 * @summary Llamado en /async crear y /carrera crear.
 *
 * @description Genera una seed a partir de un preset, o la recupera a partir de una URL, para su uso en una
 * carrera síncrona o asíncrona.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 *
 * @returns {object} Un objeto con tres atributos: la seed (tal y como devuelve la API del randomizer
 * correspondiente), el preset con opciones extra, y la información de la seed (tal y como devuelve la función
 * seed_raw_data().)
 */
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