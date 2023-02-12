const { PermissionsBitField, EmbedBuilder, CommandInteraction, ChannelType } = require('discord.js');
const { Sequelize, Model } = require('sequelize');

const { get_or_insert_player, get_global_var, set_async_history_channel, set_player_score_channel } = require('../datamgmt/db_utils');
const { calculate_player_scores, get_player_ranking_text, get_private_async_data_embed, get_reduced_private_async_data_embed, get_private_async_results_text } = require('./race_results_util');
const { seed_in_create_race } = require('./race_seed_util');

const { random_words } = require('./async_util');
const { insert_private_async, get_private_async_by_channel, finish_private_async, get_player_private_async_result, save_private_async_result, get_results_for_private_async } = require('../datamgmt/private_async_db_utils');


/**
 * @summary Llamado en async_privada terminar una vez se ha verificado que la carrera puede archivarse.
 *
 * @description Cierra una carrera asíncrona: actualiza historial, ranking y archiva canales asociados.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 * @param {Model}              race        Entrada de base de datos (PrivateAsyncRaces) correspondiente a la carrera.
 */
async function cerrar_async_privada(interaction, db, race) {

	// Marcar async como purgada
	await finish_private_async(db, race.Id);

	// Copia de resultados al historial, si los hay
	const submit_channel = await interaction.guild.channels.fetch(`${race.RaceChannel}`);
	const results = await get_results_for_private_async(db, submit_channel.id);

	// Crear canal de historial si no existe
	if (results && results.length > 1) {
		const global_var = await get_global_var(db);
		let my_hist_channel = null;
		if (global_var.AsyncHistoryChannel) {
			my_hist_channel = await interaction.guild.channels.fetch(`${global_var.AsyncHistoryChannel}`);
		}
		if (!my_hist_channel) {
			my_hist_channel = await interaction.guild.channels.create({
				name: 'async-historico',
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionsBitField.Flags.SendMessages],
					},
					{
						id: interaction.guild.members.me,
						allow: [PermissionsBitField.Flags.SendMessages],
					},
				],
			});
			await set_async_history_channel(db, my_hist_channel.id);
		}

		const results_text = await get_private_async_results_text(db, submit_channel.id);
		const data_embed = await get_private_async_data_embed(db, submit_channel.id);
		const hist_msg = await my_hist_channel.send({ content: results_text, embeds: [data_embed] });

		// Actualización de puntuaciones si la carrera es ranked
		// Crear canal de puntuaciones si no existe
		if (race.Ranked) {
			let my_score_channel = null;
			if (global_var.PlayerScoreChannel) {
				my_score_channel = await interaction.guild.channels.fetch(`${global_var.PlayerScoreChannel}`);
			}
			if (!my_score_channel) {
				my_score_channel = await interaction.guild.channels.create({
					name: 'ranking-jugadores',
					permissionOverwrites: [
						{
							id: interaction.guild.roles.everyone,
							deny: [PermissionsBitField.Flags.SendMessages],
						},
						{
							id: interaction.guild.members.me,
							allow: [PermissionsBitField.Flags.SendMessages],
						},
					],
				});
				await set_player_score_channel(db, my_score_channel.id);
			}
			const score_embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
				.setTitle(`Ranking tras ${race.Name}`)
				.setURL(hist_msg.url)
				.setTimestamp();
			await calculate_player_scores(db, interaction.channelId, 2);
			const score_text = await get_player_ranking_text(db);
			await my_score_channel.send({ content: score_text, embeds: [score_embed] });
		}
	}

	// Archivar hilo de la carrera asíncrona.
	await submit_channel.setLocked(true);
	await submit_channel.setArchived(true);
}


/**
 * @summary Invocado con /async_privada crear.
 *
 * @description Crea una nueva carrera asíncrona invitacional.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function async_privada_crear(interaction, db) {
	await interaction.deferReply();

	const creator = interaction.user;
	const creator_in_db = await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
	if (creator_in_db[0].Banned) {
		throw { 'message': 'Este usuario no puede crear carreras porque está vetado.' };
	}

	let ranked = interaction.options.getBoolean('ranked');
	if (!ranked) ranked = false;
	if (ranked && !interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
		throw { 'message': 'Solo un moderador puede crear carreras puntuables.' };
	}

	let label = interaction.options.getString('etiqueta');
	if (label && !interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
		throw { 'message': 'Solo un moderador puede etiquetar carreras.' };
	}
	if (label && label.length > 20) {
		throw { 'message': 'La etiqueta es demasiado larga.' };
	}
	if (label) label = label.toLowerCase();

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

	// Crear hilo para la carrera
	const race_channel = await interaction.channel.threads.create({
		name: channel_name,
		type: ChannelType.GuildPrivateThread,
		autoArchiveDuration: 1440,
		invitable: false,
	});
	await race_channel.members.add(creator.id);

	// Registrar async en base de datos.
	await insert_private_async(db, name, label, creator.id, ranked, full_preset, seed_info ? seed_info['hash'] : null, seed_info ? seed_info['code'] : null,
		seed_info ? seed_info['url'] : null, race_channel.id);

	// Enviar seed al canal de submit, si la carrera no es ranked.
	if (!ranked) {
		const async_data = await get_private_async_data_embed(db, race_channel.id);
		let data_msg = null;
		if (seed_info && seed_info['spoiler_attachment']) {
			data_msg = await race_channel.send({ embeds: [async_data], files: [seed_info['spoiler_attachment']] });
		}
		else {
			data_msg = await race_channel.send({ embeds: [async_data] });
		}
		await data_msg.pin();
	}
	else {
		const reduced_async_data = await get_reduced_private_async_data_embed(db, race_channel.id);
		const data_msg = await race_channel.send({ embeds: [reduced_async_data] });
		await data_msg.pin();
	}

	// Enviar instrucciones al canal de submit.
	const instructions = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle(`Envío de resultados: ${name}`)
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Enviad resultados usando el comando \`/done\`, rellenando el tiempo y colección de ítems en los campos correspondientes; o \`/forfeit\` para registrar un abandono.
		Usad preferiblemente tiempo real, no in-game time.
		Por favor, mantened este canal lo más limpio posible y SIN SPOILERS mientras no todos los jugadores terminen la carrera.`)
		.setTimestamp();
	if (ranked) {
		instructions.addFields([{
			name: 'Carrera asíncrona puntuable vinculante',
			value: 'Para participar en esta carrera asíncrona debes introducir el comando `/jugar` en este canal. Al hacerlo tendrás acceso a los detalles de la partida.',
		}]);
	}
	await race_channel.send({ embeds: [instructions] });

	// Responder al comando
	const text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Abierta carrera asíncrona invitacional con nombre: ${name}.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [text_ans] });
}


/**
 * @summary Invocado con /async_privada invitar.
 *
 * @description Invita a un usuario a participar en una carrera asíncrona privada, permitiéndole ver el
 * hilo de la carrera y enviar resultados a la misma.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function async_privada_invitar(interaction, db) {
	await interaction.deferReply();

	const race = await get_private_async_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras asíncronas invitacionales.' };
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status != 0) {
		throw { 'message': 'Esta carrera ya ha sido cerrada.' };
	}

	const jugador = interaction.options.getUser('jugador');
	if (!jugador) {
		throw { 'message': 'No se reconoce al jugador indicado.' };
	}

	const player_in_db = await get_or_insert_player(db, jugador.id, jugador.username, jugador.discriminator, `${jugador}`);
	if (player_in_db[0].Banned) {
		throw { 'message': 'Este jugador no puede participar en carreras porque está vetado.' };
	}

	const player_result = await get_player_private_async_result(db, race.RaceChannel, jugador.id);
	if (player_result && (player_result.Status === 0 || player_result.Status === 2)) {
		throw { 'message': 'Este jugador ya está invitado a la carrera.' };
	}

	if (!player_result) {
		await save_private_async_result(db, race.Id, jugador.id, 359999, 0, 0);
	}
	else {
		await save_private_async_result(db, player_result.Race, player_result.Player, player_result.Time, player_result.CollectionRate, player_result.Status - 1);
	}
	const race_channel = await interaction.guild.channels.fetch(`${race.RaceChannel}`);
	if (jugador.id !== race.Creator) {
		await race_channel.members.add(jugador.id);
	}

	const msg = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`${jugador} ha sido invitado a la carrera.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [msg] });
}


/**
 * @summary Invocado con /async_privada desinvitar.
 *
 * @description Elimina a un usuario de una carrera asíncrona privada, impidiéndole ver el
 * hilo de la carrera y enviar resultados a la misma.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function async_privada_desinvitar(interaction, db) {
	await interaction.deferReply();

	const race = await get_private_async_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras asíncronas invitacionales.' };
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status != 0) {
		throw { 'message': 'Esta carrera ya ha sido cerrada.' };
	}

	const jugador = interaction.options.getUser('jugador');
	if (!jugador) {
		throw { 'message': 'No se reconoce al jugador indicado.' };
	}

	await get_or_insert_player(db, jugador.id, jugador.username, jugador.discriminator, `${jugador}`);

	const player_result = await get_player_private_async_result(db, race.RaceChannel, jugador.id);
	if (!player_result) {
		throw { 'message': 'Este jugador no está invitado a la carrera.' };
	}

	await save_private_async_result(db, player_result.Race, player_result.Player, player_result.Time, player_result.CollectionRate, player_result.Status + 1);
	const race_channel = await interaction.guild.channels.fetch(`${race.RaceChannel}`);
	if (jugador.id !== race.Creator) {
		await race_channel.members.remove(jugador.id);
	}

	const msg = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`${jugador} ha sido eliminado de la carrera.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [msg] });
}


/**
 * @summary Invocado con /async_privada resultados.
 *
 * @description Obtiene los resultados provisionales de la carrera asíncrona privada. La respuesta solo es visible
 * para el usuario que invocó el comando, y solo se mostrará si el jugador ha enviado un resultado.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function async_privada_resultados(interaction, db) {
	await interaction.deferReply();

	const race = await get_private_async_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras asíncronas invitacionales.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);

	const player_result = await get_player_private_async_result(db, race.RaceChannel, interaction.user.id);
	if (!player_result || player_result.Status !== 2) {
		const msg = new EmbedBuilder()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('Para poder consultar los resultados de la carrera, debes estar invitado a la misma y haber enviado un resultado.')
			.setTimestamp();
		await interaction.editReply({ embeds: [msg], ephemeral: true });
		return;
	}

	const results_text = await get_private_async_results_text(db, race.RaceChannel);
	await interaction.editReply({ content: results_text, ephemeral: true });
}


/**
 * @summary Invocado con /async_privada terminar.
 *
 * @description Cierra definitivamente una carrera asíncrona privada, archivando sus canales.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function async_privada_terminar(interaction, db) {
	const race = await get_private_async_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras asíncronas invitacionales.' };
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status != 0) {
		throw { 'message': 'Esta carrera ya ha sido cerrada.' };
	}

	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription('La carrera ha sido cerrada.')
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed] });

	const creator = interaction.user;
	await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);

	cerrar_async_privada(interaction, db, race);
}

module.exports = { async_privada_crear, async_privada_invitar, async_privada_desinvitar, async_privada_resultados, async_privada_terminar };