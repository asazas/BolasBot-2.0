const { Client } = require('discord.js');

const code_map = { 0: 'Bow', 1: 'Boomerang', 2: 'Hookshot', 3: 'Bombs',
	4: 'Mushroom', 5: 'Magic Powder', 6: 'Ice Rod', 7: 'Pendant',
	8: 'Bombos', 9: 'Ether', 10: 'Quake', 11: 'Lamp',
	12: 'Hammer', 13: 'Shovel', 14: 'Flute', 15: 'Bugnet', 16: 'Book',
	17: 'Empty Bottle', 18: 'Green Potion', 19: 'Somaria', 20: 'Cape',
	21: 'Mirror', 22: 'Boots', 23: 'Gloves', 24: 'Flippers',
	25: 'Moon Pearl', 26: 'Shield', 27: 'Tunic', 28: 'Heart',
	29: 'Map', 30: 'Compass', 31: 'Big Key' };

const code_map_emojis = {};


/**
 * @summary Se llama en la rutina de inicialización del bot para asociar emojis a cada posible componente de
 * un código (hash) de seed de ALTTPR.
 *
 * @description Construye el mapa code_map_emojis, que asocia un emoji a cada uno de los elementos que pueden
 * aparecer en un código (hash) de ALTTPR.
 *
 * @param {Client} client   Cliente de discord.js para interactuar con la API de Discord.
 * @param {string} guild_id ID del servidor de Discord en el que buscar los emojis.
 */
async function initialize_code_emojis(client, guild_id) {
	const emoji_guild = await client.guilds.fetch(guild_id);
	if (!emoji_guild) {
		return;
	}
	const emojis = await emoji_guild.emojis.fetch();
	for (const key in code_map) {
		const my_emoji = emojis.find(emoji => emoji.name == code_map[key].replaceAll(' ', ''));
		if (my_emoji && !my_emoji.managed) {
			code_map_emojis[key] = `${my_emoji}`;
		}
	}
}


/**
 * @summary Busca una sección del parche correspondiente a una seed de ALTTPR.
 *
 * @description Dados unos valores de offset y longitud, obtiene la sección correspondiente del parche de una
 * seed de ALTTPR.
 *
 * @param {object[]} patch  Parche de la seed de ALTTPR, tal y como lo devuelve la API.
 * @param {number}   offset Valor inicial de la sección del parche buscada.
 * @param {number}   length Longitud de la sección del parche buscada.
 *
 * @returns {number[]}
 */
function search_in_patch(patch, offset, length) {
	for (let i = 0; i < patch.length - 1; i++) {
		const next_pos = parseInt(Object.getOwnPropertyNames(patch[i + 1])[0]);
		if (offset < next_pos) {
			const curr_pos = Object.getOwnPropertyNames(patch[i])[0];
			const offset_in_array = offset - parseInt(curr_pos);
			return patch[i][curr_pos].slice(offset_in_array, offset_in_array + length);
		}
	}
	return null;
}


/**
 * @summary Calcula el código (hash) de una seed de ALTTPR.
 *
 * @description Examina los datos del parche de la seed de ALTTPR dada y obtiene la cadena de cinco ítems que
 * conforma su código (hash.)
 *
 * @param {object} seed Datos de la seed de ALTTPR, tal y como se obtienen desde la API.
 *
 * @returns {string} Los cinco emojis de ítems (o sus nombres, si los emojis no están disponibles) que forman
 * parte del código de la seed.
 */
function get_seed_code(seed) {
	const code = search_in_patch(seed.data.patch, 1573397, 5);
	if (Object.keys(code_map_emojis).length == Object.keys(code_map).length) {
		for (let i = 0; i < code.length; i++) {
			code[i] = code_map_emojis[code[i]];
		}
		return code.join(' ');
	}

	for (let i = 0; i < code.length; i++) {
		code[i] = code_map[code[i]];
	}
	return code.join(' | ');
}

module.exports = { initialize_code_emojis, get_seed_code, search_in_patch };