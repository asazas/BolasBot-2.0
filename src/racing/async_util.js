const { Permissions, MessageEmbed } = require('discord.js');
const { get_results_for_async, get_async_by_submit, get_active_async_races, insert_async, update_async_status } = require('../datamgmt/async_db_utils');

const { get_or_insert_player, get_global_var, set_async_history_channel, set_player_score_channel } = require('../datamgmt/db_utils');
const { get_async_results_text, get_async_data_embed, calculate_player_scores, get_player_ranking_text } = require('./race_results_util');
const { seed_in_create_race } = require('./race_seed_util');


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
	const channel_name = name.substring(0, 20);

	// Crear o recuperar seed
	const seed_details = await seed_in_create_race(interaction);
	const full_preset = seed_details['full_preset'];
	const seed_info = seed_details['seed_info'];

	// Crear canales y rol para la async
	let async_role = null;
	let async_category = null;
	let submit_channel = null;
	let results_channel = null;
	let spoilers_channel = null;

	const blind = interaction.options.getBoolean('blind');

	if (blind) {
		async_category = await interaction.guild.channels.create(channel_name, {
			type: 'GUILD_CATEGORY',
		});
		submit_channel = await interaction.guild.channels.create(`${channel_name}-submit`, {
			parent: async_category,
		});
		results_channel = await interaction.guild.channels.create(`${channel_name}-results`, {
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
		spoilers_channel = await interaction.guild.channels.create(`${channel_name}-spoilers`, {
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
		async_role = await interaction.guild.roles.create({ name: channel_name });
		async_category = await interaction.guild.channels.create(channel_name, {
			type: 'GUILD_CATEGORY',
		});
		submit_channel = await interaction.guild.channels.create(`${channel_name}-submit`, {
			parent: async_category,
		});
		results_channel = await interaction.guild.channels.create(`${channel_name}-results`, {
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
		spoilers_channel = await interaction.guild.channels.create(`${channel_name}-spoilers`, {
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

	const results_text = await get_async_results_text(db, submit_channel.id);
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

	const instructions = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(`Envío de resultados: ${name}`)
		.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
		.setDescription(`Enviad resultados usando el comando \`/done\`, rellenando el tiempo y colección de ítems en los campos correspondientes; o \`/forfeit\` para registrar un abandono.
		Usad preferiblemente tiempo real, no in-game time.
		Por favor, mantened este canal lo más limpio posible y SIN SPOILERS.`)
		.setTimestamp();
	if (blind) {
		instructions.addField('Retransmisión de carrera asíncrona',
			`Al cierre de esta carrera, se eligirán hasta un máximo de 4 jugadores para su retransmisión.
			Para poder ser elegible, el VOD de la partida debe cumplir las siguientes condiciones:
			- El temporizador debe tener el valor inicial de -2 minutos.
			- El VOD debe terminar en la pantalla final de los créditos.
			- El ALTTPR Community Tracker debe estar visible → https://alttprtracker.dunka.net/
			- Únicamente el audio del juego debe estar presente.
			- El VOD debe ser subido a YouTube como vídeo no listado.`);
	}
	await submit_channel.send({ embeds: [instructions] });

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
	const race = await get_async_by_submit(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
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
		const submit_channel = await interaction.guild.channels.fetch(`${race.SubmitChannel}`);
		const results = await get_results_for_async(db, submit_channel.id);
		if (results && results.length > 0) {
			const global_var = await get_global_var(db);
			let my_hist_channel = null;
			if (global_var.AsyncHistoryChannel) {
				my_hist_channel = await interaction.guild.channels.fetch(`${global_var.AsyncHistoryChannel}`);
			}
			if (!my_hist_channel) {
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

			const results_text = await get_async_results_text(db, submit_channel.id);
			const data_embed = await get_async_data_embed(db, submit_channel.id);
			const hist_msg = await my_hist_channel.send({ content: results_text, embeds: [data_embed] });

			let my_score_channel = null;
			if (global_var.PlayerScoreChannel) {
				my_score_channel = await interaction.guild.channels.fetch(`${global_var.PlayerScoreChannel}`);
			}
			if (!my_score_channel) {
				my_score_channel = await interaction.guild.channels.create('ranking-jugadores', {
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
				await set_player_score_channel(db, my_score_channel.id);
			}
			const score_embed = new MessageEmbed()
				.setColor('#0099ff')
				.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
				.setTitle(`Ranking tras ${race.Name}`)
				.setURL(hist_msg.url)
				.setTimestamp();
			await calculate_player_scores(db, interaction.channelId, true);
			const score_text = await get_player_ranking_text(db);
			await my_score_channel.send({ content: score_text, embeds: [score_embed] });
		}

		if (race.RoleId) {
			const async_role = await interaction.guild.roles.fetch(`${race.RoleId}`);
			await async_role.delete();
		}
		const category = submit_channel.parent;
		await submit_channel.delete();
		const results_channel = await interaction.guild.channels.fetch(`${race.ResultsChannel}`);
		await results_channel.delete();
		const spoilers_channel = await interaction.guild.channels.fetch(`${race.SpoilersChannel}`);
		await spoilers_channel.delete();
		await category.delete();
	}
	else {
		throw { 'message': 'La carrera debe cerrarse antes de ser purgada.' };
	}
}

module.exports = { random_words, async_crear, async_cerrar, async_reabrir, async_purgar, get_async_results_text };