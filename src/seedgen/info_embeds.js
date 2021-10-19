const { MessageEmbed, MessageAttachment } = require('discord.js');
const slugid = require('slugid');

const { get_formatted_spoiler } = require('./spoiler');
const { get_seed_code } = require('./util');

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
		const spoiler_attachment = new MessageAttachment(Buffer.from(spoiler), 'spoiler.json');
		spoiler_attachment.setSpoiler(true);
		return [alttpr_info_embed(seed, interaction, preset), spoiler_attachment];
	}
	else {
		return [alttpr_info_embed(seed, interaction, preset), null];
	}
}

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
		output['code'] = get_seed_code(seed).join(' | ');
		output['url'] = `https://alttpr.com/h/${seed.data.hash}`;
		output['hash'] = seed.data.hash;

		if (seed['data']['spoiler']['meta']['spoilers'] == 'on' || seed['data']['spoiler']['meta']['spoilers'] == 'generate') {
			const spoiler = JSON.stringify(get_formatted_spoiler(seed), null, 4);
			const spoiler_attachment = new MessageAttachment(Buffer.from(spoiler), 'spoiler.json');
			spoiler_attachment.setSpoiler(true);
			output['spoiler'] = spoiler;
			output['spoiler_attachment'] = spoiler_attachment;
		}
	}

	return output;
}

module.exports = { seed_info_embed, varia_info_embed, seed_raw_data };