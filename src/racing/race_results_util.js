const { EmbedBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');
const { get_async_by_submit, get_results_for_async } = require('../datamgmt/async_db_utils');
const { update_player_score, get_ranked_players } = require('../datamgmt/db_utils');
const { get_race_by_channel, get_results_for_race } = require('../datamgmt/race_db_utils');


/**
 * @summary Llamado como parte de la rutina de los comandos /async crear, /async purgar y /done (cuando se usa
 * en carreras asíncronas.)
 *
 * @description Genera una tabla formateada con los resultados ordenados de los jugadores de la carrera asíncrona,
 * incluyendo posiciones, nombres, tiempos y tasas de colección de ítems.
 *
 * @param {Sequelize} db             Base de datos del servidor en el que se invocó el comando.
 * @param {string}    submit_channel ID del canal de envío de resultados de la carrera asíncrona.
 *
 * @returns {string} Tabla formateada de resultados, en forma de cadena de texto.
 */
async function get_async_results_text(db, submit_channel) {
	const results = await get_results_for_async(db, submit_channel);
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


/**
 * @summary Llamado como parte de las rutinas de los comandos /async crear, /async purgar y /jugar.
 *
 * @description Genera un embed con información sobre una carrera asíncrona: creador, fechas de inicio y cierre,
 * descripción, seed y hash.
 *
 * @param {Sequelize} db             Base de datos del servidor en el que se invocó el comando.
 * @param {string}    submit_channel ID del canal de envío de resultados de la carrera asíncrona.
 *
 * @returns {EmbedBuilder} Embed con los datos de la carrera asíncrona.
 */
async function get_async_data_embed(db, submit_channel) {
	const my_async = await get_async_by_submit(db, submit_channel);

	const data_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle(`Carrera asíncrona: ${my_async.Name}`)
		.addFields([
			{ name: 'Creador', value: my_async.creator.Name },
			{ name: 'Fecha de inicio', value: `<t:${my_async.StartDate}>` }])
		.setTimestamp();
	if (my_async.EndDate) {
		data_embed.addFields([{ name: 'Fecha de cierre', value: `<t:${my_async.EndDate}>` }]);
	}
	if (my_async.Preset) {
		data_embed.addFields([{ name: 'Descripción', value: my_async.Preset }]);
	}
	if (my_async.SeedUrl) {
		data_embed.addFields([{ name: 'Seed', value:my_async.SeedUrl }]);
	}
	if (my_async.SeedCode) {
		data_embed.addFields([{ name: 'Hash', value: my_async.SeedCode }]);
	}
	return data_embed;
}


/**
 * @summary Llamado como parte de la rutina del comando /async crear en carreras puntuables.
 *
 * @description Genera un embed con información sobre una carrera asíncrona, similar a get_async_data_embed(),
 * pero ocultando los datos de la seed. Dirigido a su uso en la creación de carreras asíncronas puntuables.
 *
 * @param {Sequelize} db             Base de datos del servidor en el que se invocó el comando.
 * @param {string}    submit_channel ID del canal de envío de resultados de la carrera asíncrona.
 *
 * @returns {EmbedBuilder} Embed con los datos de la carrera asíncrona.
 */
async function get_reduced_async_data_embed(db, submit_channel) {
	const my_async = await get_async_by_submit(db, submit_channel);

	const data_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle(`Carrera asíncrona: ${my_async.Name}`)
		.addFields([
			{ name: 'Creador', value: my_async.creator.Name },
			{ name: 'Fecha de inicio', value: `<t:${my_async.StartDate}>` }])
		.setTimestamp();
	if (my_async.EndDate) {
		data_embed.addField([{ name: 'Fecha de cierre', value: `<t:${my_async.EndDate}>` }]);
	}
	if (my_async.Preset) {
		data_embed.addField([{ name: 'Descripción', value: my_async.Preset }]);
	}
	return data_embed;
}


/**
 * @summary Llamado como parte de la rutina de los comandos /carrera crear, /carrera forzar final, y /done y
 * /forfeit (si es el último jugador de una carrera el que lo invoca.)
 *
 * @description Genera un embed con información sobre una carrera síncrona: creador, fechas de inicio y cierre,
 * descripción, seed y hash.
 *
 * @param {Sequelize} db             Base de datos del servidor en el que se invocó el comando.
 * @param {string}    submit_channel ID del hilo de envío de resultados de la carrera.
 *
 * @returns {EmbedBuilder} Embed con los datos de la carrera.
 */
async function get_race_data_embed(db, race_channel) {
	const my_race = await get_race_by_channel(db, race_channel);

	const data_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle(`Carrera: ${my_race.Name}`)
		.addFields([
			{ name: 'Creador', value: my_race.creator.Name },
			{ name: 'Fecha de creación', value: `<t:${my_race.CreationDate}>` }])
		.setTimestamp();
	if (my_race.StartDate) {
		data_embed.addFields([{ name: 'Fecha de inicio', value: `<t:${my_race.StartDate}>` }]);
	}
	if (my_race.EndDate) {
		data_embed.addFields([{ name: 'Fecha de cierre', value: `<t:${my_race.EndDate}>` }]);
	}
	if (my_race.Preset) {
		data_embed.addFields([{ name: 'Descripción', value: my_race.Preset }]);
	}
	if (my_race.SeedUrl) {
		data_embed.addFields([{ name: 'Seed', value: my_race.SeedUrl }]);
	}
	if (my_race.SeedCode) {
		data_embed.addFields([{ name: 'Hash', value: my_race.SeedCode }]);
	}
	return data_embed;
}


/**
 * @summary Función auxiliar para conversión de tiempos a formato hh:mm:ss.
 *
 * @description Convierte un timestamp numérico a formato hh:mm:ss.
 *
 * @param {number} timestamp Timestamp númerico, en segundos.
 *
 * @returns {string} Cadena en formato hh:mm:ss correspondiente al timestamp dado.
 */
function calcular_tiempo(timestamp) {
	let time_str = 'Forfeit ';
	if (timestamp < 359999) {
		const s = timestamp % 60;
		let m = Math.floor(timestamp / 60);
		const h = Math.floor(m / 60);
		m = m % 60;

		const h_str = '0'.repeat(2 - h.toString().length) + h.toString();
		const m_str = '0'.repeat(2 - m.toString().length) + m.toString();
		const s_str = '0'.repeat(2 - s.toString().length) + s.toString();
		time_str = `${h_str}:${m_str}:${s_str}`;
	}
	return time_str;
}


/**
 * @summary Llamado como parte de la rutina del comando /carrera forzar final y de /done y /forfeit (en carreras
 * síncronas, si es el último jugador de la carrera el que lo invoca.)
 *
 * @description Genera una tabla formateada con los resultados ordenados de los jugadores de la carrera,
 * incluyendo posiciones, nombres y tiempos.
 *
 * @param {Sequelize} db             Base de datos del servidor en el que se invocó el comando.
 * @param {string}    submit_channel ID del canal de envío de resultados de la carrera.
 *
 * @returns {string} Tabla formateada de resultados, en forma de cadena de texto.
 */
async function get_race_results_text(db, submit_channel) {
	const results = await get_results_for_race(db, submit_channel);
	let msg = '```\n';
	msg += '+' + '-'.repeat(35) + '+\n';
	msg += '| Rk | Jugador           | Tiempo   |\n';

	if (results) {
		msg += '|' + '-'.repeat(35) + '|\n';
		let pos = 1;
		for (const res of results) {
			const time_str = calcular_tiempo(res.Time);
			const pos_str = ' '.repeat(2 - pos.toString().length) + pos.toString();
			let pl_name = res.player.Name.substring(0, 17);
			pl_name = pl_name + ' '.repeat(17 - pl_name.length);
			msg += `| ${pos_str} | ${pl_name} | ${time_str} |\n`;
			pos += 1;
		}
		msg += '+' + '-'.repeat(35) + '+\n';
		msg += '```';
		return msg;
	}
}


/**
 * @summary Llamado como parte de la rutina de finalización de carreras puntuables, síncronas o asíncronas.
 *
 * @description Genera una tabla formateada con el ranking de jugadores según su rendimiento en carreras
 * puntuables, incluyendo posiciones, nombres, puntuaciones y número de carreras disputadas.
 *
 * @param {Sequelize} db Base de datos del servidor en el que se invocó inicialmente el comando.
 *
 * @returns {string} Tabla formateada de ranking de jugadores, en forma de cadena de texto.
 */
async function get_player_ranking_text(db) {
	const players = await get_ranked_players(db);
	let msg = '```\n';
	msg += '+' + '-'.repeat(41) + '+\n';
	msg += '| Rk | Jugador           | Puntos | Part. |\n';

	if (players) {
		msg += '|' + '-'.repeat(41) + '|\n';
		let pos = 1;
		for (const p of players) {
			const pos_str = ' '.repeat(2 - pos.toString().length) + pos.toString();
			let pl_name = p.Name.substring(0, 17);
			pl_name = pl_name + ' '.repeat(17 - pl_name.length);
			const score_int = Math.round(p.Score);
			const score_str = ' '.repeat(6 - score_int.toString().length) + score_int.toString();
			const part_str = ' '.repeat(5 - p.Races.toString().length) + p.Races.toString();
			msg += `| ${pos_str} | ${pl_name} | ${score_str} | ${part_str} |\n`;
			pos += 1;
		}
		msg += '+' + '-'.repeat(41) + '+\n';
		msg += '```';
		return msg;
	}
}


/**
 * @summary Función auxiliar para el cálculo de variaciones Elo en calculate_player_scores().
 *
 * @description Calcula el cambio de puntuación Elo de un jugador en un duelo directo con otro participante en
 * una carrera puntuable.
 *
 * @param {number} my_player_score    Puntuación original del jugador a actualizar.
 * @param {number} other_player_score Puntuación del adversario.
 * @param {number} result             Resultado del duelo (1: gana jugador, 0: gana adversario, puede tomar
 *                                    valores decimales intermedios.)
 *
 * @returns {number} Cambio de puntuación del jugador como resultado del duelo.
 */
function calculate_score_change(my_player_score, other_player_score, result) {
	// factor K, máximo cambio de puntos en un solo duelo
	const K = 100;
	const diff_ratio = (other_player_score - my_player_score) / 400;
	const my_expected = (1 + 10 ** diff_ratio) ** -1;
	return K * (result - my_expected);
}


/**
 * @summary Llamado como parte de la rutina de finalización de carreras puntuables, síncronas o asíncronas.
 *
 * @description Actualiza las puntuaciones Elo de todos los jugadores participantes en la carrera puntuable. Para
 * ello, se consideran los resultados de cada jugador en los duelos directos contra cada uno de los otros
 * participantes. En el caso de jugadores que se hayan retirado, se considera que pierden contra todos los que
 * hayan terminado, y se ignoran duelos contra otros jugadores que se hayan retirado.
 *
 * @param {Sequelize} db             Base de datos del servidor en el que se invocó el comando.
 * @param {string}    submit_channel ID del canal de envío de resultados de la carrera.
 * @param {boolean}   async          Parámetro que indica si se trata de una carrera asíncrona (true) o
 *                                   síncrona (false.)
 */
async function calculate_player_scores(db, race_channel, async) {
	let results = null;
	if (async) {
		results = await get_results_for_async(db, race_channel);
	}
	else {
		results = await get_results_for_race(db, race_channel);
	}

	for (const my_res of results) {
		let score_change = 0;

		// player forfeited
		if (my_res.Time == 359999) {
			for (const other_res of results) {
				if (my_res.Id == other_res.Id) {
					continue;
				}
				if (other_res.Time == 359999) {
					continue;
				}
				score_change += calculate_score_change(my_res.player.Score, other_res.player.Score, 0);
			}
		}

		// player did not forfeit
		else {
			for (const other_res of results) {
				if (my_res.Id == other_res.Id) {
					continue;
				}
				if (other_res.Time > my_res.Time) {
					score_change += calculate_score_change(my_res.player.Score, other_res.player.Score, 1);
				}
				else if (other_res.Time < my_res.Time) {
					score_change += calculate_score_change(my_res.player.Score, other_res.player.Score, 0);
				}
				else {
					score_change += calculate_score_change(my_res.player.Score, other_res.player.Score, 0.5);
				}
			}
		}
		await update_player_score(db, my_res.player.DiscordId, my_res.player.Score + score_change);
	}
}


module.exports = {
	get_async_results_text, get_async_data_embed, get_reduced_async_data_embed, get_race_data_embed,
	get_race_results_text, calcular_tiempo, get_player_ranking_text, calculate_player_scores,
};