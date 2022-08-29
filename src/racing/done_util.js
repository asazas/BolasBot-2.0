const { EmbedBuilder, CommandInteraction } = require('discord.js');
const { Sequelize, Model } = require('sequelize');
const { save_async_result, get_player_result } = require('../datamgmt/async_db_utils');
const { get_or_insert_player } = require('../datamgmt/db_utils');
const { set_player_forfeit, set_player_done, set_player_undone } = require('../datamgmt/race_db_utils');
const { cerrar_carrera } = require('./carrera_util');
const { get_async_results_text, calcular_tiempo } = require('./race_results_util');


/**
 * @summary Invocado por el comando /done en carreras asíncronas.
 *
 * @description Registra el resultado de un jugador en una carrera asíncrona. Da acceso al jugador a los canales
 * de resultados y spoilers.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 * @param {Model}              race        Carrera asíncrona para la que se registra el resultado, tal y como
 *                                         figura en base de datos.
 */
async function done_async(interaction, db, race) {

	const author = interaction.user;
	const creator_in_db = await get_or_insert_player(db, author.id, author.username, author.discriminator, `${author}`);
	if (creator_in_db[0].Banned) {
		throw { 'message': 'Este usuario no puede participar en carreras porque está vetado.' };
	}

	if (race.Status != 0) {
		throw { 'message': 'Esta carrera no está abierta.' };
	}

	await interaction.deferReply({ ephemeral: true });
	if (race.Ranked) {
		const player_result = await get_player_result(db, race.SubmitChannel, author.id);
		if (!player_result) {
			throw { 'message': 'Debes apuntarte a esta carrera antes de poder registrar un resultado.' };
		}
	}

	// Procesar tiempo y collection.
	let collection = interaction.options.getInteger('collection');
	if (!collection) {
		collection = 0;
	}
	let time = interaction.options.getString('tiempo');
	if (!time) {
		if (interaction.commandName === 'forfeit') {
			time = '99:59:59';
			collection = 0;
		}
		else {
			const error_embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
				.setDescription(`${interaction.user}, tu resultado no se ha registrado. Asegúrate de rellenar los parámetros del comando correctamente.`)
				.setTimestamp();
			await interaction.editReply({ embeds: [error_embed], ephemeral: true });
			return;
		}
	}

	if (collection < 0 || !(/^\d?\d:[0-5]\d:[0-5]\d$/.test(time))) {
		throw { 'message': 'Parámetros inválidos.' };
	}

	// Registrar tiempo y collection.
	const time_arr = time.split(':');
	const time_s = 3600 * parseInt(time_arr[0]) + 60 * parseInt(time_arr[1]) + parseInt(time_arr[2]);

	await save_async_result(db, race.Id, author.id, time_s, collection);

	// Actualizar tabla de resultados.
	const results_text = await get_async_results_text(db, race.SubmitChannel);
	const results_channel = await interaction.guild.channels.fetch(`${race.ResultsChannel}`);
	const results_message = await results_channel.messages.fetch(`${race.ResultsMessage}`);
	await results_message.edit(results_text);

	// Dar rol de carrera.
	if (race.RoleId) {
		const async_role = await interaction.guild.roles.fetch(`${race.RoleId}`);
		await interaction.member.roles.add(async_role);
	}

	// Respuesta al comando.
	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`GG ${author}, tu resultado se ha registrado.`)
		.addFields(
			{ name: 'Tiempo', value: `${calcular_tiempo(time_s)}`, inline: true },
			{ name: 'CR', value: `${collection}`, inline: true },
		)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed], ephemeral: true });
	await interaction.channel.send(`${author} ha registrado un resultado.`);

	console.log(`${author.username} ha registrado un resultado para la carrera ${race.Name} en el servidor ${interaction.guild.name}`);
}


/**
 * @summary Invocado por el comando /done en carreras síncronas.
 *
 * @description Registra el resultado de un participante en una carrera síncrona. Si es el último participante
 * en terminar, cierra también la carrera.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 * @param {Model}              race        Carrera para la que se registra el resultado, tal y como figura en
 *                                         base de datos.
 * @param {boolean}            forfeit     Valor que indica si el resultado se trata de un abandono.
 */
async function done_race(interaction, db, race, forfeit = false) {

	const author = interaction.user;
	const creator_in_db = await get_or_insert_player(db, author.id, author.username, author.discriminator, `${author}`);
	if (creator_in_db[0].Banned) {
		throw { 'message': 'Este usuario no puede participar en carreras porque está vetado.' };
	}

	// Registrar resultado.
	let done_code = null;
	if (forfeit) {
		done_code = await set_player_forfeit(db, race.Id, interaction.user.id);
	}
	else {
		done_code = await set_player_done(db, race.Id, interaction.user.id);
	}

	// Responder al comando.
	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (done_code == -1) {
		text_ans = text_ans.setDescription(`${interaction.user} no está en la carrera.`);
	}
	else if (done_code == -2) {
		text_ans = text_ans.setDescription(`${interaction.user} no está participando en la carrera.`);
	}
	else if (done_code == -3) {
		text_ans = text_ans.setDescription('La carrera no está en curso.');
	}
	else if (done_code == -4) {
		text_ans = text_ans.setDescription(`${interaction.user} ya ha terminado.`);
	}
	else if (done_code == -5) {
		text_ans = text_ans.setDescription('¡La carrera aún no ha comenzado');
	}
	else {
		let time_text = null;
		if (done_code['result'].Time == 359999) {
			time_text = `${interaction.user} se ha retirado de la carrera.`;
		}
		else {
			time_text = `${interaction.user} ha terminado en el puesto ${done_code['position']} con un tiempo de: ${calcular_tiempo(done_code['result'].Time)}.`;
		}
		text_ans = text_ans.setDescription(time_text);
	}
	await interaction.reply({ embeds: [text_ans] });

	// Terminar la carrera si el último jugador ha acabado.
	if (typeof done_code == 'object' && done_code['done_count'] == done_code['player_count']) {
		text_ans = new EmbedBuilder()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('Todos los jugadores han terminado. Cerrando la carrera. ¡GG!')
			.setTimestamp();
		await interaction.channel.send({ embeds: [text_ans] });

		cerrar_carrera(interaction, db, race);
	}
}


/**
 * @summary Invocado por el comando /undone.
 *
 * @description Anula los efectos de un comando /done previo de un jugador en una carrera síncrona, permitiéndole
 * continuar la carrera.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 * @param {Model}              race        Carrera para la que se anula el resultado, tal y como figura en base
 *                                         de datos.
 */
async function undone_race(interaction, db, race) {
	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const undone_code = await set_player_undone(db, race.Id, interaction.user.id);

	let text_ans = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();
	if (undone_code == -1) {
		text_ans = text_ans.setDescription(`${interaction.user} no está en la carrera.`);
	}
	else if (undone_code == -2) {
		text_ans = text_ans.setDescription(`${interaction.user} no está participando en la carrera.`);
	}
	else if (undone_code == -3) {
		text_ans = text_ans.setDescription('La carrera no está en curso.');
	}
	else if (undone_code == -4) {
		text_ans = text_ans.setDescription(`${interaction.user} aún no ha terminado.`);
	}
	else {
		text_ans = text_ans.setDescription(`${interaction.user} continúa la carrera.`);
	}
	await interaction.reply({ embeds: [text_ans] });
}

module.exports = { done_async, done_race, undone_race };