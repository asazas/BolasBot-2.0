const { EmbedBuilder, PermissionsBitField, CommandInteraction } = require('discord.js');
const { Sequelize, Model } = require('sequelize');

const { get_or_insert_player, get_global_var, set_race_history_channel, set_player_score_channel } = require('../datamgmt/db_utils');
const { get_race_by_channel, insert_race, get_or_insert_race_player, delete_race_player_if_present, set_player_ready, set_race_started,
	set_player_unready, set_all_ready_for_force_start, set_all_forfeit_for_force_end, set_race_finished } = require('../datamgmt/race_db_utils');
const { countdown_en_canal } = require('../otros/countdown_util');
const { random_words } = require('./async_util');
const { get_race_data_embed, get_race_results_text, calculate_player_scores, get_player_ranking_text } = require('./race_results_util');
const { seed_in_create_race } = require('./race_seed_util');


/**
 * @summary Llamado como parte de la rutina del comando /carrera forzar final y de /done y /forfeit (si es el
 * último jugador de la carrera el que lo invoca.)
 *
 * @description Cierra una carrera: bloquea la ejecución de más comandos por parte de los jugadores, copia los
 * resultados al historial y actualiza las puntuaciones de los jugadores (si la carrera es puntuable.)
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 * @param {Model}              race        Carrera a cerrar, tal y como figura en base de datos.
 */
async function cerrar_carrera(interaction, db, race) {

	await set_race_finished(db, interaction.channelId);

	// Copia de resultados al historial
	// Crear canal de historial si no existe
	const global_var = await get_global_var(db);
	let my_hist_channel = null;
	if (global_var.RaceHistoryChannel) {
		my_hist_channel = await interaction.guild.channels.fetch(`${global_var.RaceHistoryChannel}`);
	}
	if (!my_hist_channel) {
		my_hist_channel = await interaction.guild.channels.create({
			name: 'carrera-historico',
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
		await set_race_history_channel(db, my_hist_channel.id);
	}

	const results_text = await get_race_results_text(db, interaction.channelId);
	const data_embed = await get_race_data_embed(db, interaction.channelId);
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
		await calculate_player_scores(db, interaction.channelId, 1);
		const score_text = await get_player_ranking_text(db);
		await my_score_channel.send({ content: score_text, embeds: [score_embed] });
	}
}


/**
 * @summary Invocado por el comando /carrera crear.
 *
 * @description Crea un hilo de Discord para gestionar una nueva carrera. Genera una seed para la carrera si es
 * necesario.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_crear(interaction, db) {
	if (interaction.channel.isThread()) {
		throw { 'message': 'Este comando no puede ser usado en hilos.' };
	}

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
		autoArchiveDuration: 1440,
	});

	await insert_race(db, name, label, creator.id, ranked, full_preset, seed_info ? seed_info['hash'] : null, seed_info ? seed_info['code'] : null,
		seed_info ? seed_info['url'] : null, race_channel.id);

	const async_data = await get_race_data_embed(db, race_channel.id);
	let data_msg = null;
	if (seed_info && seed_info['spoiler_attachment']) {
		data_msg = await race_channel.send({ embeds: [async_data], files: [seed_info['spoiler_attachment']] });
	}
	else {
		data_msg = await race_channel.send({ embeds: [async_data] });
	}
	await data_msg.pin();

	const text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Abierta carrera con nombre: ${name}. Participa en ${race_channel}.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [text_ans] });
}


/**
 * @summary Invocado por el comando /carrera entrar.
 *
 * @description Registra al jugador que utilizó el comando en la carrera.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_entrar(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	const creator = interaction.user;
	const creator_in_db = await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
	if (creator_in_db[0].Banned) {
		throw { 'message': 'Este usuario no puede participar en carreras porque está vetado.' };
	}

	const race_player = await get_or_insert_race_player(db, race.Id, interaction.user.id);
	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (race_player == -1) {
		text_ans = text_ans.setDescription('Esta carrera no está abierta.');
	}
	else if (race_player == -2) {
		text_ans = text_ans.setDescription(`${interaction.user} ya está en la carrera.`);
	}
	else {
		text_ans = text_ans.setDescription(`${interaction.user} se ha unido a la carrera.`);
	}
	await interaction.reply({ embeds: [text_ans] });
}


/**
 * @summary Invocado por el comando /carrera salir.
 *
 * @description Retira al jugador que utilizó el comando de la carrera, siempre y cuando esta no haya empezado.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_salir(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const delete_code = await delete_race_player_if_present(db, race.Id, interaction.user.id);

	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (delete_code == -1) {
		text_ans = text_ans.setDescription(`${interaction.user} no está en la carrera.`);
	}
	else if (delete_code == -2) {
		text_ans = text_ans.setDescription(`${interaction.user} no puede salir de la carrera si está listo para comenzar.`);
	}
	else if (delete_code == -3) {
		text_ans = text_ans.setDescription('No se puede salir de una carrera ya comenzada.');
	}
	else {
		text_ans = text_ans.setDescription(`${interaction.user} ha salido de la carrera.`);
	}
	await interaction.reply({ embeds: [text_ans] });
}


/**
 * @summary Invocado por el comando /carrera listo.
 *
 * @description Declara al jugador que utilizó el comando como listo para iniciar la carrera.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_listo(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const ready_code = await set_player_ready(db, race.Id, interaction.user.id);

	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (ready_code == -1) {
		text_ans = text_ans.setDescription(`${interaction.user} no está en la carrera.`);
	}
	else if (ready_code == -2) {
		text_ans = text_ans.setDescription(`${interaction.user} ya está listo.`);
	}
	else if (ready_code == -3) {
		text_ans = text_ans.setDescription('No se puede realizar esta acción una carrera ya comenzada.');
	}
	else {
		text_ans = text_ans.setDescription(`${interaction.user} está listo para empezar. Quedan ${ready_code['all'] - ready_code['ready']} participantes.`);
	}
	await interaction.reply({ embeds: [text_ans] });

	if (typeof ready_code == 'object' && ready_code['all'] >= 2 && ready_code['ready'] == ready_code['all']) {
		text_ans = new EmbedBuilder()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('Todos los jugadores están listos. Iniciando cuenta atrás. ¡Buena suerte!')
			.setTimestamp();
		await interaction.editReply({ embeds: [text_ans] });

		await set_race_started(db, interaction.channelId);
		await countdown_en_canal(interaction.channel, 10);
	}
}


/**
 * @summary Invocado por el comando /carrera no_listo.
 *
 * @description Retira el estado de listo para empezar la carrera al jugador que utilizó el comando.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_no_listo(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const unready_code = await set_player_unready(db, race.Id, interaction.user.id);

	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (unready_code == -1) {
		text_ans = text_ans.setDescription(`${interaction.user} no está en la carrera.`);
	}
	else if (unready_code == -2) {
		text_ans = text_ans.setDescription(`${interaction.user} aún no está listo.`);
	}
	else if (unready_code == -3) {
		text_ans = text_ans.setDescription('No se puede realizar esta acción una carrera ya comenzada.');
	}
	else {
		text_ans = text_ans.setDescription(`${interaction.user} no está listo.`);
	}
	await interaction.reply({ embeds: [text_ans] });
}


/**
 * @summary Invocado por el comando /carrera forzar inicio.
 *
 * @description Considera todos los jugadores como listos e inicia inmediatamente la carrera.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_forzar_inicio(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const force_start_code = await set_all_ready_for_force_start(db, race.Id, interaction.user.id);

	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (force_start_code == -1) {
		text_ans = text_ans.setDescription('No hay suficientes jugadores para iniciar la carrera.');
	}
	else if (force_start_code == -2) {
		text_ans = text_ans.setDescription('Esta carrera no está abierta.');
	}
	else {
		text_ans = text_ans.setDescription('Forzado inicio de la carrera.');
	}

	await interaction.reply({ embeds: [text_ans] });

	if (force_start_code == 0) {
		await set_race_started(db, interaction.channelId);
		await countdown_en_canal(interaction.channel, 10);
	}
}


/**
 * @summary Invocado por el comando /carrera forzar final.
 *
 * @description Finaliza una carrera en curso, asignando forfeits a los jugadores que no hayan terminado.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_forzar_final(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const force_end_code = await set_all_forfeit_for_force_end(db, race.Id, interaction.user.id);

	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (force_end_code == -1) {
		text_ans = text_ans.setDescription('Esta carrera no está en curso.');
	}
	else {
		text_ans = text_ans.setDescription('Forzado final de la carrera.');
	}

	await interaction.reply({ embeds: [text_ans] });

	if (force_end_code == 0) {
		cerrar_carrera(interaction, db, race);
	}
}


/**
 * @summary Invocado por el comando /carrera forzar cancelar.
 *
 * @description Anula una carrera que aún no ha empezado.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function carrera_forzar_cancelar(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels) && interaction.user.id != race.Creator) {
		throw { 'message': 'Solo el creador de la carrera o un moderador pueden ejecutar este comando.' };
	}

	if (race.Status != 0) {
		throw { 'message': 'Solo se pueden anular carreras no empezadas.' };
	}

	const text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription('Anulando carrera...')
		.setTimestamp();

	await interaction.reply({ embeds: [text_ans] });

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	await set_race_finished(db, interaction.channelId);
	await interaction.channel.delete();
}

module.exports = {
	cerrar_carrera, carrera_crear, carrera_entrar, carrera_salir, carrera_listo, carrera_no_listo, carrera_forzar_inicio,
	carrera_forzar_final, carrera_forzar_cancelar,
};