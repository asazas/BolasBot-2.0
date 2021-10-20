const { Permissions, MessageEmbed } = require('discord.js');

const { generate_from_preset, retrieve_from_url } = require('../seedgen/seedgen');
const { get_active_async_races, get_results_for_race, get_or_insert_player, insert_async, get_async_by_submit, update_async_status, get_private_race_by_channel, update_private_status, get_global_var, set_async_history_channel } = require('../datamgmt/db_utils');
const { seed_raw_data } = require('../seedgen/info_embeds');


async function get_results_text(db, submit_channel) {
	const results = await get_results_for_race(db, submit_channel);
	let msg = '```\n';
	msg += '+' + '-'.repeat(41) + '+\n';
	msg += '| Rk | Jugador           | Tiempo   | CR  |\n';

	if (results) {
		msg += '|' + '-'.repeat(41) + '|\n';
		let pos = 1;
		for (const res of results) {
			let time_str = 'Forfeit ';
			if (res.Time < 359999) {
				const s = res.Time % 60;
				let m = Math.floor(res.Time / 60);
				const h = Math.floor(m / 60);
				m = m % 60;

				const h_str = '0'.repeat(2 - h.toString().length) + h.toString();
				const m_str = '0'.repeat(2 - m.toString().length) + m.toString();
				const s_str = '0'.repeat(2 - s.toString().length) + s.toString();
				time_str = `${h_str}:${m_str}:${s_str}`;
			}
			const pos_str = ' '.repeat(2 - pos.toString().length) + pos.toString();
			let pl_name = res.player.Name.substring(0, 17);
			pl_name = pl_name + ' '.repeat(17 - pl_name.length);
			let col_rate = res.CollectionRate.toString();
			col_rate = ' '.repeat(3 - col_rate.length) + col_rate;
			msg += `| ${pos_str} | ${pl_name} | ${time_str} | ${col_rate} |\n`;
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
		.addField('Fecha de inicio (UTC)', `<t:${my_async.StartDate}>`)
		.setTimestamp();
	if (my_async.EndDate) {
		data_embed.addField('Fecha de cierre (UTC)', `<t:${my_async.EndDate}>`);
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

async function async_cerrar(interaction, db) {
	const race = await get_async_by_submit(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status == 0) {
		const creator = interaction.user;
		await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
		await update_async_status(db, race.Id, 1);
		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('Esta carrera ha sido cerrada.')
			.setTimestamp();
		await interaction.reply({ embeds: [ans_embed] });
	}
	else {
		throw { 'message': 'Esta carrera no está abierta.' };
	}
}

async function async_reabrir(interaction, db) {
	const race = await get_async_by_submit(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status == 1) {
		const creator = interaction.user;
		await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
		await update_async_status(db, race.Id, 0);
		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('Esta carrera ha sido reabierta.')
			.setTimestamp();
		await interaction.reply({ embeds: [ans_embed] });
	}
	else {
		throw { 'message': 'Esta carrera no está cerrada.' };
	}
}

async function async_purgar(interaction, db) {
	let race = await get_async_by_submit(db, interaction.channelId);
	if (!race) {
		race = get_private_race_by_channel(db, interaction.channelId);
		if (race) {
			if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS) && interaction.user.id != race.Creator) {
				throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
			}

			const ans_embed = new MessageEmbed()
				.setColor('#0099ff')
				.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
				.setDescription('Purgando...')
				.setTimestamp();
			await interaction.reply({ embeds: [ans_embed] });

			const creator = interaction.user;
			await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
			await update_private_status(db, race.Id, 2);

			const race_channel = interaction.guild.channels.resolve(race.PrivateChannel);
			await race_channel.delete();
			return;
		}
		else {
			throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
		}
	}

	if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_CHANNELS) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status == 1) {
		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('Purgando...')
			.setTimestamp();
		await interaction.reply({ embeds: [ans_embed] });

		const creator = interaction.user;
		await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
		await update_async_status(db, race.Id, 2);

		// Copia de resultados al historial, si los hay
		const submit_channel = interaction.guild.channels.cache.get(`${race.SubmitChannel}`);
		const results = await get_results_for_race(db, submit_channel.id);
		if (results && results.length > 0) {
			const global_var = await get_global_var(db);
			let my_hist_channel = null;
			if (!global_var.AsyncHistoryChannel || !interaction.guild.channels.cache.get(`${global_var.AsyncHistoryChannel}`)) {
				my_hist_channel = await interaction.guild.channels.create('async-historico', {
					permissionOverwrites: [
						{
							id: interaction.guild.roles.everyone,
							deny: [Permissions.FLAGS.SEND_MESSAGES],
						},
						{
							id: interaction.guild.me,
							allow: [Permissions.FLAGS.SEND_MESSAGES],
						},
					],
				});
				await set_async_history_channel(db, my_hist_channel.id);
			}
			else {
				my_hist_channel = interaction.guild.channels.cache.get(`${global_var.AsyncHistoryChannel}`);
			}

			const results_text = await get_results_text(db, submit_channel.id);
			const data_embed = await get_async_data_embed(db, submit_channel.id);
			await my_hist_channel.send({ content: results_text, embeds: [data_embed] });
		}

		if (race.RoleId) {
			const async_role = interaction.guild.roles.cache.get(`${race.RoleId}`);
			await async_role.delete();
		}
		const category = submit_channel.parent;
		await submit_channel.delete();
		const results_channel = interaction.guild.channels.cache.get(`${race.ResultsChannel}`);
		await results_channel.delete();
		const spoilers_channel = interaction.guild.channels.cache.get(`${race.SpoilersChannel}`);
		await spoilers_channel.delete();
		await category.delete();
	}
	else {
		throw { 'message': 'La carrera debe cerrarse antes de ser purgada.' };
	}
}

module.exports = { random_words, async_crear, async_cerrar, async_reabrir, async_purgar, get_results_text };