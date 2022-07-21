const { DateTime } = require('luxon');
const { Sequelize, Model } = require('sequelize');
const { Workbook } = require('exceljs');
const { get_past_races, get_results_for_async } = require('../datamgmt/async_db_utils');
const { get_results_for_race } = require('../datamgmt/race_db_utils');
const { calcular_tiempo, calculate_score_change } = require('../racing/race_results_util');


/**
 * @summary Función auxiliar en la rutina del comando /exportar.
 *
 * @description Calcula la variación en la puntuación Elo de los jugadores tras una carrera.
 *
 * @param {Model[]} results    Resultados completos de la carrera.
 * @param {object}  jugadores  Objeto de información de jugadores, igual que en el método procesar_resultados_de_carrera.
 *                             Se actualiza tras la ejecución de esta función.
 */
function actualizar_puntuaciones(results, jugadores) {

	// puntuaciones antes de esta carrera
	const starting_scores = {};
	for (const my_res of results) {
		starting_scores[my_res.player.DiscordId] = my_res.player.Score;
	}

	// procesar cambios de puntuaciones para cada jugador
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
				score_change += calculate_score_change(starting_scores[my_res.player.DiscordId], starting_scores[other_res.player.DiscordId], 0);
			}
		}

		// player did not forfeit
		else {
			for (const other_res of results) {
				if (my_res.Id == other_res.Id) {
					continue;
				}
				if (other_res.Time > my_res.Time) {
					score_change += calculate_score_change(starting_scores[my_res.player.DiscordId], starting_scores[other_res.player.DiscordId], 1);
				}
				else if (other_res.Time < my_res.Time) {
					score_change += calculate_score_change(starting_scores[my_res.player.DiscordId], starting_scores[other_res.player.DiscordId], 0);
				}
				else {
					score_change += calculate_score_change(starting_scores[my_res.player.DiscordId], starting_scores[other_res.player.DiscordId], 0.5);
				}
			}
		}

		// actualizar puntuación
		jugadores[my_res.player.DiscordId]['score'] += score_change;
	}
}


/**
 * @summary Función auxiliar en la rutina del comando /exportar
 *
 * @description Procesa los resultados de una carrera, actualizando los datos de jugadores, resultados y
 * puntuaciones según sea necesario. Añade una hoja al Excel incluyendo los resultados de la carrera.
 *
 * @param {number}   num        Número de la carrera dentro de la secuencia de carreras encontradas.
 * @param {Model[]}  carreras   Datos de las carreras, tal y como se obtuvieron de base de datos.
 * @param {Model[]}  res        Array de modelos con los resultados de la carrera para cada jugador.
 * @param {object}   jugadores  Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                              objetos que incluyen sus nombres de usuario, número de carreras disputadas y sus
 *                              puntuaciones Elo. Se actualiza tras la ejecución de esta función.
 * @param {object}   resultados Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                              arrays de objetos. Tamaño del array es el número total de carreras encontradas.
 *                              En cada posición del array, si el jugador participó en la carrera correspondiente,
 *                              hay un objeto que contiene su posición, tiempo y tasa de colección. Se actualiza
 *                              tras la ejecución de esta función.
 */
function procesar_resultados_de_carrera(num, carreras, res, jugadores, resultados) {
	for (let i = 0; i < res.length; ++i) {
		const player_id = res[i].player.DiscordId;
		if (!(player_id in jugadores)) {
			jugadores[player_id] = { name: res[i].player.Name, races: 0, score: 1500 };
		}
		if (!(player_id in resultados)) {
			resultados[player_id] = new Array(carreras.length);
		}

		jugadores[player_id]['races'] += 1;

		// Registrar resultado del jugador en vector de resultados
		if (res[i].Time == 359999) {
			resultados[player_id][num] = { position: 'DNF', time: 'Forfeit' };
		}
		else {
			resultados[player_id][num] = { position: i + 1, time: calcular_tiempo(res[i].Time) };
		}
		if ('SubmitChannel' in carreras[num]) {
			resultados[player_id][num]['cr'] = res[i].CollectionRate;
		}
	}

	// Actualizar Elo de los jugadores
	actualizar_puntuaciones(res, jugadores);
}


/**
 * @summary Función auxiliar en la rutina del comando /exportar.
 *
 * @description Añade una hojas al Excel con los resultados de las carreras consultadas.
 *
 * @param {Workbook} excel      Hoja de cálculo de Excel a la que añadir los resultados de la carrera.
 * @param {Model[]}  carreras   Datos de las carreras, tal y como se obtuvieron de base de datos.
 * @param {object}   jugadores  Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                              objetos que incluyen sus nombres de usuario, número de carreras disputadas y sus
 *                              puntuaciones Elo. Se actualiza tras la ejecución de esta función.
 * @param {object}   resultados Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                              arrays de objetos. Tamaño del array es el número total de carreras encontradas.
 *                              En cada posición del array, si el jugador participó en la carrera correspondiente,
 *                              hay un objeto que contiene su posición, tiempo y tasa de colección. Se actualiza
 *                              tras la ejecución de esta función.
 */
function resultado_excel(excel, carreras, jugadores, resultados) {
	// iterar para todas las carreras
	let num_race = 1;
	for (let i = 0; i < carreras.length; ++i) {
		const rows = [];

		// construir array de resultados para la carrera
		for (const player of Object.keys(resultados)) {
			if (resultados[player][i]) {
				const my_res = resultados[player][i];
				if ('SubmitChannel' in carreras[i]) {
					rows.push([my_res['position'], jugadores[player]['name'], my_res['time'], my_res['cr']]);
				}
				else {
					rows.push([my_res['position'], jugadores[player]['name'], my_res['time']]);
				}
			}
		}

		// omitir carreras que no tienen al menos dos resultados
		if (rows.length < 2) continue;

		// ordenar array de resultados
		rows.sort((a, b) => {
			if (typeof a[0] === 'number' && typeof b[0] === 'number') return a[0] - b[0];
			if (typeof a[0] === 'number' && typeof b[0] === 'string') return -1;
			if (typeof a[0] === 'string' && typeof b[0] === 'number') return 1;
			return 0;
		});

		// crear tabla en hoja de cálculo
		const cols = [{ name: 'Posición' }, { name: 'Jugador' }, { name: 'Tiempo' }];
		if ('SubmitChannel' in carreras[i]) {
			cols.push({ name: 'Colección' });
		}

		const ws = excel.addWorksheet(`${num_race} - ${carreras[i].Name}`);
		ws.addTable({
			name: `${num_race} - ${carreras[i].Name}`,
			ref: 'A1',
			style: {
				showRowStripes: true,
			},
			columns: cols,
			rows: rows,
		});
		ws.columns.forEach(column => {
			const lengths = column.values.map(v => v.toString().length);
			const maxLength = Math.max(...lengths.filter(v => typeof v === 'number'));
			column.width = maxLength + 1;
		});

		num_race++;
	}
}


/**
 * @summary Invocado con /exportar.
 *
 * @description Exporta los resultados de carreras disputadas en un periodo de tiempo determinado.
 *
 * @param {Sequelize} db     Base de datos del servidor en el que se invocó el comando.
 * @param {DateTime}  inicio Buscar carreras cerradas tras esta fecha de inicio.
 * @param {DateTime}  final  Buscar carreras cerradas antes de esta fecha final.
 * @param {number}    tipo   Tipo de carreras a incluir. 0 = asíncronas, 1 = síncronas, 2 = ambas.
 *
 * @returns {Workbook} Hoja de cálculo Excel con los resultados de las carreras solicitadas.
 */
async function exportar_resultados(db, inicio, final, tipo) {
	const carreras = await get_past_races(db, inicio.toSeconds(), final.toSeconds(), tipo, true);
	if (carreras.length == 0) {
		throw { 'message': 'No hay resultados de carreras en el rango de fechas especificado.' };
	}
	if (carreras.length > 40) {
		throw { 'message': 'Hay demasiadas carreras en el rango especificado. Solo se pueden recuperar un máximo de 40 de cada vez.' };
	}


	// jugadores: clave es el ID de Discord del jugador, valor es un objeto que incluye el nombre del jugador,
	// su número de carreras disputadas y su puntuación Elo.
	const jugadores = {};

	// resultados: clave es el ID de Discord del jugador, valor es un array de objetos. Tamaño del array es el
	// número total de carreras encontradas. En cada posición del array, si el jugador participó en la carrera
	// correspondiente, hay un objeto que contiene su posición, tiempo y tasa de colección.
	const resultados = {};

	const excel = new Workbook();
	excel.addWorksheet('Resumen');

	for (let i = 0; i < carreras.length; ++i) {
		let resultado_carrera = null;

		// carrera asíncrona
		if ('SubmitChannel' in carreras[i]) {
			resultado_carrera = await get_results_for_async(db, carreras[i].SubmitChannel);
		}

		// carrera síncrona
		else {
			resultado_carrera = await get_results_for_race(db, carreras[i].RaceChannel);
		}

		procesar_resultados_de_carrera(i, carreras, resultado_carrera, jugadores, resultados);
	}

	// Añadir hojas de resultados en el Excel
	resultado_excel(excel, carreras, jugadores, resultados);

	return excel;
}


module.exports = { exportar_resultados };