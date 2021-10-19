const util = require('util');
const { Permissions, MessageEmbed } = require('discord.js');

const { generate_from_preset, retrieve_from_url } = require('../seedgen/seedgen');
const { get_active_async_races, get_results_for_race, get_or_insert_player, insert_async, get_async_by_submit } = require('../datamgmt/db_utils');
const { seed_raw_data } = require('../seedgen/info_embeds');

async function get_results_text(db, submit_channel) {
	const results = await get_results_for_race(db, submit_channel);
	let msg = '```\n';
	msg += '+' + '-'.repeat(41) + '+\n';
	msg += '| Rk | Jugador           | Tiempo   | CR  |\n';

	if (results) {
		msg += '|' + '-'.repeat(41) + '|\n';
		let pos = 1;
		for (const res in results) {
			let time_str = 'Forfeit ';
			if (res.Time < 359999) {
				const s = res.Time % 60;
				let m = Math.floor(res.Time / 60);
				const h = Math.floor(m / 60);
				m = m % 60;
				time_str = util.format('%02d:%02d:%02d', h, m, s);
			}
			msg += util.format('| %2d | %17s | %s | %3d |', pos, res.player.Name.substring(0, 17), time_str, res.CollectionRate);
			pos += 1;
		}
		msg += '+' + '-'.repeat(41) + '+\n';
		msg += '```';
		return msg;
	}
}

async function get_async_data_embed(db, submit_channel) {
	const my_async = await get_async_by_submit(db, submit_channel);

	const data_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(`Carrera asíncrona: ${my_async.Name}`)
		.addField('Creador', my_async.creator.Name)
		.addField('Fecha de inicio (UTC)', my_async.StartDate)
		.setTimestamp();
	if (my_async.EndDate) {
		data_embed.addField('Fecha de cierre (UTC)', my_async.EndDate);
	}
	if (my_async.Preset) {
		data_embed.addField('Descripción', my_async.Preset);
	}
	if (my_async.SeedUrl) {
		data_embed.addField('Seed', my_async.SeedUrl);
	}
	if (my_async.SeedCode) {
		data_embed.addField('Hash', my_async.SeedCode);
	}
	return data_embed;
}

const random_words = ['Asazas', 'DiegoA', 'Vilxs', 'Diegolazo', 'Matkap', 'Kitsune', 'Eolina', 'Kaede',
	'Kodama', 'Akuma', 'Cougars', 'Fantasma', 'Marco', 'Jim', 'Gio', 'Midget',

	'Campeón', 'Scrub', 'Noob',	'Casual', 'Fernando', 'Almeida', 'Genio', 'Fenómeno', 'Lento', 'Trampas',
	'Sus', 'Memes', 'México', 'Waifu', 'Gamer', 'VTuber', '5Head', 'Larpas', 'Magcargo'];


async function async_crear(interaction, db) {
	await interaction.deferReply();

	// Límite de carreras asíncronas: máximo 10 en el servidor
	const asyncs = await get_active_async_races(db);
	if (asyncs && asyncs.length >= 10) {
		throw { 'message': 'Demasiadas asíncronas activas en el servidor. Contacta a un moderador para purgar alguna.' };
	}

	// Nombre de la carrera
	let name = interaction.options.getString('nombre');
	if (!name) {
		name = `${random_words[Math.floor(Math.random() * random_words.length)]}${random_words[Math.floor(Math.random() * random_words.length)]}`;
	}
	name = name.substring(0, 20);

	// Crear o recuperar seed
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
			full_preset = extra ? preset + ' ' + extra : preset;
			seed = await generate_from_preset(preset, extra);
			if (!seed) {
				throw { 'message': 'Error al crear la seed a partir del preset.' };
			}
		}
	}
	if (seed) {
		seed_info = seed_raw_data(seed, interaction, full_preset);
	}

	// Crear canales y rol para la async
	let async_role = null;
	let async_category = null;
	let submit_channel = null;
	let results_channel = null;
	let spoilers_channel = null;

	const blind = interaction.options.getBoolean('blind');

	if (blind) {
		async_category = await interaction.guild.channels.create(name, {
			type: 'GUILD_CATEGORY',
		});
		submit_channel = await interaction.guild.channels.create(`${name}-submit`, {
			parent: async_category,
		});
		results_channel = await interaction.guild.channels.create(`${name}-results`, {
			parent: async_category,
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone,
					deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
				},
				{
					id: interaction.guild.me,
					allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
				},
			],
		});
		spoilers_channel = await interaction.guild.channels.create(`${name}-spoilers`, {
			parent: async_category,
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone,
					deny: [Permissions.FLAGS.VIEW_CHANNEL],
				},
				{
					id: interaction.guild.me,
					allow: [Permissions.FLAGS.VIEW_CHANNEL],
				},
			],
		});
	}

	else {
		async_role = await interaction.guild.roles.create({ name: name });
		async_category = await interaction.guild.channels.create(name, {
			type: 'GUILD_CATEGORY',
		});
		submit_channel = await interaction.guild.channels.create(`${name}-submit`, {
			parent: async_category,
		});
		results_channel = await interaction.guild.channels.create(`${name}-results`, {
			parent: async_category,
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone,
					deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
				},
				{
					id: interaction.guild.me,
					allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
				},
				{
					id: async_role,
					allow: [Permissions.FLAGS.VIEW_CHANNEL],
				},
			],
		});
		spoilers_channel = await interaction.guild.channels.create(`${name}-spoilers`, {
			parent: async_category,
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone,
					deny: [Permissions.FLAGS.VIEW_CHANNEL],
				},
				{
					id: interaction.guild.me,
					allow: [Permissions.FLAGS.VIEW_CHANNEL],
				},
				{
					id: async_role,
					allow: [Permissions.FLAGS.VIEW_CHANNEL],
				},
			],
		});
	}

	const results_text = await get_results_text(db, submit_channel.id);
	const results_msg = await results_channel.send(results_text);

	const creator = interaction.user;
	await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
	if (blind) {
		await insert_async(db, name, creator.id, full_preset, seed_info ? seed_info['hash'] : null, seed_info ? seed_info['code'] : null,
			seed_info ? seed_info['url'] : null, null, submit_channel.id, results_channel.id, results_msg.id, spoilers_channel.id);
	}
	else {
		await insert_async(db, name, creator.id, full_preset, seed_info ? seed_info['hash'] : null, seed_info ? seed_info['code'] : null,
			seed_info ? seed_info['url'] : null, async_role.id, submit_channel.id, results_channel.id, results_msg.id, spoilers_channel.id);
	}

	const async_data = await get_async_data_embed(db, submit_channel.id);
	let data_msg = null;
	if (seed_info && seed_info['spoiler_attachment']) {
		data_msg = await submit_channel.send({ embeds: [async_data], files: [seed_info['spoiler_attachment']] });
	}
	else {
		data_msg = await submit_channel.send({ embeds: [async_data] });
	}
	await data_msg.pin();

	const text_ans = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
		.setDescription(`Abierta carrera asíncrona con nombre: ${name}. Envía resultados en ${submit_channel}.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [text_ans] });
}

module.exports = { async_crear };