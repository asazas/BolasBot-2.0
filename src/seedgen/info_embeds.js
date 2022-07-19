const { EmbedBuilder, AttachmentBuilder, CommandInteraction } = require('discord.js');
const slugid = require('slugid');

const { get_formatted_spoiler } = require('./spoiler');
const { get_seed_code } = require('./seedgen_util');


/**
 * @summary Llamado cuando se solicita información de una seed de Super Metroid o SMZ3.
 *
 * @description Genera un mensaje que contiene los detalles de la seed de Super Metroid o SMZ3 pasada como parámetro.
 *
 * @param {object}             seed        Objeto que contiene los datos de la seed, tal cual lo devuelve la web
 *                                         de SMZ3.
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             preset      Preset y opciones extra indicados en el comando inicialmente invocado.
 *
 * @returns {EmbedBuilder} Embed que contiene los datos disponibles de la seed: preset, URL, autor y hash.
 */
function sm_info_embed(seed, interaction, preset = '') {
	let seed_guid = seed['data']['guid'];
	seed_guid = `${seed_guid.substring(0, 8)}-${seed_guid.substring(8, 12)}-${seed_guid.substring(12, 16)}-${seed_guid.substring(16, 20)}-${seed_guid.substring(20, 32)}`;
	const slug = slugid.encode(seed_guid);
	let url;
	if (seed['data']['gameId'] == 'sm') {
		if (seed['data']['mode'] == 'multiworld') {
			preset += ' multi';
			url = `https://sm.samus.link/multiworld/${slug}`;
		}
		else {
			url = `https://sm.samus.link/seed/${slug}`;
		}
	}
	else if (seed['data']['mode'] == 'multiworld') {
		preset += ' multi';
		url = `https://samus.link/multiworld/${slug}`;
	}
	else {
		url = `https://samus.link/seed/${slug}`;
	}

	let embed;
	if (preset) {
		embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(preset)
			.setURL(url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addFields([
				{ name: 'Autor', value: interaction.user.username },
				{ name: 'URL', value: url },
				{ name: 'Hash', value: seed['data']['hash'] }])
			.setTimestamp();
	}
	else {
		embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(slug)
			.setURL(url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addFields([
				{ name: 'Solicitado por', value: interaction.user.username },
				{ name: 'URL', value: url },
				{ name: 'Hash', value: seed['data']['hash'] }])
			.setTimestamp();
	}
	return embed;
}


/**
 * @summary Llamado cuando se solicita información de una seed de ALTTPR.
 *
 * @description Genera un mensaje que contiene los detalles de la seed de ALTTPR pasada como parámetro.
 *
 * @param {object}             seed        Objeto que contiene los datos de la seed, tal cual lo devuelve la web
 *                                         de ALTTPR.
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             preset      Preset y opciones extra indicados en el comando inicialmente invocado.
 *
 * @returns {EmbedBuilder} Embed que contiene los datos disponibles de la seed: preset, URL, autor y hash.
 */
function alttpr_info_embed(seed, interaction, preset = '') {
	const code = get_seed_code(seed);
	const url = `https://alttpr.com/h/${seed.data.hash}`;
	let embed;

	if (preset) {
		embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(preset)
			.setURL(url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addFields([
				{ name: 'Autor', value: interaction.user.username },
				{ name: 'URL', value: url },
				{ name: 'Hash', value: code }])
			.setTimestamp();
	}
	else {
		embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(seed.data.hash)
			.setURL(url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addFields([
				{ name: 'Solicitado por', value: interaction.user.username },
				{ name: 'URL', value: url },
				{ name: 'Hash', value: code }])
			.setTimestamp();
	}
	return embed;
}


/**
 * @summary Llamado cuando se solicita información de una seed de Super Metroid VARIA.
 *
 * @description Genera un mensaje que contiene los detalles de la seed de VARIA pasada como parámetro.
 *
 * @param {object}             seed        Objeto que contiene los datos de la seed, tal cual lo devuelve la web
 *                                         de VARIA.
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             preset      Preset y opciones extra indicados en el comando inicialmente invocado.
 *
 * @returns {EmbedBuilder} Embed que contiene los datos disponibles de la seed: preset, URL y autor.
 */
function varia_info_embed(seed, interaction, preset = '') {
	const url = `https://randommetroidsolver.pythonanywhere.com/customizer/${seed.data.seedKey}`;

	let embed;
	if (preset) {
		embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(preset)
			.setURL(url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addFields([
				{ name: 'Autor', value: interaction.user.username },
				{ name: 'URL', value: url }])
			.setTimestamp();
	}
	else {
		embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(seed.data.seedkey)
			.setURL(url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addFields([
				{ name: 'Solicitado por', value: interaction.user.username },
				{ name: 'URL', value: url }])
			.setTimestamp();
	}
	return embed;
}


/**
 * @summary Llamado en los comandos /seed crear, /seed info y /jugar.
 *
 * @description Llama a la rutina correspondiente para generar un embed conteniendo la información de una seed
 * de ALTTPR, SM, SMZ3 o VARIA. Para ALTTPR, genera también el spoiler log si este está disponible.
 *
 * @param {object}             seed        Objeto con los datos de la seed, tal y como lo devuelve la API del
 *                                         randomizer correspondiente.
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             preset      Preset de la seed generada y opciones extra, separadas por espacios.
 *
 * @returns {[EmbedBuilder, ?AttachmentBuilder]} Array con dos elementos: en la posición [0], el EmbedBuilder
 * con los datos de la seed pasada como argumento; y en la posición [1], el archivo 'spoiler.json' como
 * AttachmentBuilder para seeds de ALTTPR que generen spoiler log (devuelve null en la posición [1] en cualquier
 * otro caso.)
 */
function seed_info_embed(seed, interaction, preset = '') {
	// super metroid varia randomizer
	if (seed['data']['seedKey']) {
		return [varia_info_embed(seed, interaction, preset), null];
	}

	// super metroid randomizer / combo randomizer
	else if (seed['data']['gameId'] == 'sm' || seed['data']['gameId'] == 'smz3') {
		return [sm_info_embed(seed, interaction, preset), null];
	}

	else if (seed['data']['spoiler']['meta']['spoilers'] == 'on' || seed['data']['spoiler']['meta']['spoilers'] == 'generate') {
		const spoiler = JSON.stringify(get_formatted_spoiler(seed), null, 4);
		const spoiler_attachment = new AttachmentBuilder(Buffer.from(spoiler), { name: 'spoiler.json' });
		spoiler_attachment.setSpoiler(true);
		return [alttpr_info_embed(seed, interaction, preset), spoiler_attachment];
	}
	else {
		return [alttpr_info_embed(seed, interaction, preset), null];
	}
}


/**
 * @summary Llamado por el método seed_in_create_race(), usado a su vez en los comandos /carrera crear y
 * /async crear.
 *
 * @description Devuelve los datos de la seed dada como atributos de un objeto.
 *
 * @param {object}             seed        Objeto con los datos de la seed, tal y como lo devuelve la API del
 *                                         randomizer correspondiente.
 * @param {CommandInteraction} interaction Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             preset      Preset de la seed generada y opciones extra, separadas por espacios.
 *
 * @returns {object} Objeto con los datos de la seed. Puede contener los siguientes atributos: 'author', 'preset',
 * 'url', 'hash', 'code', 'spoiler' y 'spoiler_attachment'.
 */
function seed_raw_data(seed, interaction, preset = '') {
	const output = {};
	output['author'] = interaction.user.username;
	if (preset) {
		output['preset'] = preset;
	}

	// super metroid varia randomizer
	if (seed['data']['seedKey']) {
		output['url'] = `https://randommetroidsolver.pythonanywhere.com/customizer/${seed.data.seedKey}`;
		output['hash'] = seed['data']['seedKey'];
	}

	// super metroid randomizer / combo randomizer
	else if (seed['data']['gameId'] == 'sm' || seed['data']['gameId'] == 'smz3') {
		output['code'] = seed['data']['hash'];

		let seed_guid = seed['data']['guid'];
		seed_guid = `${seed_guid.substring(0, 8)}-${seed_guid.substring(8, 12)}-${seed_guid.substring(12, 16)}-${seed_guid.substring(16, 20)}-${seed_guid.substring(20, 32)}`;
		const slug = slugid.encode(seed_guid);
		output['hash'] = slug;
		if (seed['data']['gameId'] == 'sm') {
			output['url'] = `https://sm.samus.link/seed/${slug}`;
		}
		else {
			output['url'] = `https://samus.link/seed/${slug}`;
		}
	}

	else {
		output['code'] = get_seed_code(seed);
		output['url'] = `https://alttpr.com/h/${seed.data.hash}`;
		output['hash'] = seed.data.hash;

		if (seed['data']['spoiler']['meta']['spoilers'] == 'on' || seed['data']['spoiler']['meta']['spoilers'] == 'generate') {
			const spoiler = JSON.stringify(get_formatted_spoiler(seed), null, 4);
			const spoiler_attachment = new AttachmentBuilder(Buffer.from(spoiler), { name: 'spoiler.json' });
			spoiler_attachment.setSpoiler(true);
			output['spoiler'] = spoiler;
			output['spoiler_attachment'] = spoiler_attachment;
		}
	}

	return output;
}

module.exports = { seed_info_embed, varia_info_embed, seed_raw_data };