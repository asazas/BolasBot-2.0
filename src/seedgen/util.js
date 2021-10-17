const { MessageEmbed } = require('discord.js');
const slugid = require('slugid');

const code_map = { 0: 'Bow', 1: 'Boomerang', 2: 'Hookshot', 3: 'Bombs',
	4: 'Mushroom', 5: 'Magic Powder', 6: 'Ice Rod', 7: 'Pendant',
	8: 'Bombos', 9: 'Ether', 10: 'Quake', 11: 'Lamp',
	12: 'Hammer', 13: 'Shovel', 14: 'Flute', 15: 'Bugnet', 16: 'Book',
	17: 'Empty Bottle', 18: 'Green Potion', 19: 'Somaria', 20: 'Cape',
	21: 'Mirror', 22: 'Boots', 23: 'Gloves', 24: 'Flippers',
	25: 'Moon Pearl', 26: 'Shield', 27: 'Tunic', 28: 'Heart',
	29: 'Map', 30: 'Compass', 31: 'Big Key' };

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

function get_seed_code(seed) {
	const code = search_in_patch(seed.data.patch, 1573397, 5);
	for (let i = 0; i < code.length; i++) {
		code[i] = code_map[code[i]];
	}
	return code;
}


function sm_info_embed(seed, interaction, preset = '') {
	let seed_guid = seed['data']['guid'];
	seed_guid = `${seed_guid.substring(0, 8)}-${seed_guid.substring(8, 12)}-${seed_guid.substring(12, 16)}-${seed_guid.substring(16, 20)}-${seed_guid.substring(20, 32)}`;
	const slug = slugid.encode(seed_guid);
	let url;
	if (seed['data']['gameId'] == 'sm') {
		url = `https://sm.samus.link/seed/${slug}`;
	}
	else {
		url = `https://samus.link/seed/${slug}`;
	}

	let embed;
	if (preset) {
		embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(preset)
			.setURL(url)
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.addField('Autor', interaction.user.username)
			.addField('URL', url)
			.addField('Hash', seed['data']['hash'])
			.setTimestamp();
	}
	else {
		embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(slug)
			.setURL(url)
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.addField('Solicitado por', interaction.user.username)
			.addField('URL', url)
			.addField('Hash', seed['data']['hash'])
			.setTimestamp();
	}
	return embed;
}

function alttpr_info_embed(seed, interaction, preset = '') {
	const code = get_seed_code(seed).join(' | ');
	const url = `https://alttpr.com/h/${seed.data.hash}`;
	let embed;

	if (preset) {
		embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(preset)
			.setURL(url)
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.addField('Autor', interaction.user.username)
			.addField('URL', url)
			.addField('Hash', code)
			.setTimestamp();
	}
	else {
		embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(seed.data.hash)
			.setURL(url)
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.addField('Solicitado por', interaction.user.username)
			.addField('URL', url)
			.addField('Hash', code)
			.setTimestamp();
	}
	return embed;
}

function varia_info_embed(seed, interaction, preset = '') {
	const url = `https://randommetroidsolver.pythonanywhere.com/customizer/${seed.data.seedKey}`;

	let embed;
	if (preset) {
		embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(preset)
			.setURL(url)
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.addField('Autor', interaction.user.username)
			.addField('URL', url)
			.setTimestamp();
	}
	else {
		embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(seed.data.seedkey)
			.setURL(url)
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.addField('Solicitado por', interaction.user.username)
			.addField('URL', url)
			.setTimestamp();
	}
	return embed;
}

module.exports = { get_seed_code, search_in_patch, alttpr_info_embed, sm_info_embed, varia_info_embed };