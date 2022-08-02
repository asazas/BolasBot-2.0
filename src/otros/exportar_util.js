const { DateTime } = require('luxon');
const { Sequelize, Model } = require('sequelize');
const { Workbook, Worksheet } = require('exceljs');
const { get_past_races } = require('../datamgmt/async_db_utils');
const { calcular_tiempo, calculate_score_change } = require('../racing/race_results_util');


const RACE_PROPERTIES = ['Name', 'CreationDate', 'StartDate', 'EndDate', 'Preset', 'SeedUrl'];
const PROPERTIES_TEXT = { 'Name': 'Nombre', 'CreationDate': 'Fecha de creación', 'StartDate': 'Fecha de inicio',
	'EndDate': 'Fecha de final', 'Preset': 'Descripción', 'SeedUrl': 'Seed' };


/**
 * @summary Función auxiliar para el procesado de resultados de carreras tras obtenerlas de base de datos.
 *
 * @description Convierte un único array de modelos Sequelize "RaceResults" o "AsyncResults" en un array de arrays,
 * agrupados por carreras, y omitiendo carreras que no tengan un mínimo de dos resultados registrados. Esta función
 * se utiliza como callback del método Array.reduce().
 *
 * @param {[Model[][], Model[]]} arr_de_arrays Array con dos elementos: en la posición [0], array de arrays incluyendo
 *                                             los resultados agrupados por carreras. En la posición [1], array de
 *                                             resultados correspondiente a la carrera procesada en la última invocación
 *                                             del método.
 * @param {Model}                res           Resultado procesado en la iteración actual.
 * @param {number}               i             Índice del resultado actual en el array de resultados inicial.
 * @param {Model[]}              res_carreras  Array de resultados inicial, tal y como se obtuvo de base de datos.
 *
 * @returns {[Model[][], Model[]]} El estado final de arr_de_arrays tras procesar el resultado.
 */
function results_reduce(arr_de_arrays, res, i, res_carreras) {
	// caso particular primer resultado
	if (i == 0) {
		arr_de_arrays[1].push(res);
		return arr_de_arrays;
	}

	const channel_actual = res.race.SubmitChannel || res.race.RaceChannel;
	const channel_anterior = res_carreras[i - 1].race.SubmitChannel || res_carreras[i - 1].race.RaceChannel;

	// caso particular último resultado
	if (i == res_carreras.length - 1) {
		// resultado en misma carrera que el resultado anterior
		// (si es en carrera distinta, se descarta automáticamente)
		if (channel_actual == channel_anterior) {
			arr_de_arrays[1].push(res);
		}
		if (arr_de_arrays[1].length > 1) {
			arr_de_arrays[0].push(arr_de_arrays[1]);
		}
		return arr_de_arrays;
	}

	// resultado en misma carrera que el resultado anterior
	if (channel_actual == channel_anterior) {
		arr_de_arrays[1].push(res);
	}

	// resultado en carrera distinta que el resultado anterior
	else {
		if (arr_de_arrays[1].length > 1) {
			arr_de_arrays[0].push(arr_de_arrays[1]);
		}
		arr_de_arrays[1] = [res];
	}
	return arr_de_arrays;
}


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
	for (const player in jugadores) {
		starting_scores[player] = jugadores[player].score;
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
 * puntuaciones según sea necesario.
 *
 * @param {number}    num        Índice la carrera dentro de la secuencia de carreras encontradas.
 * @param {Model[][]} arr_res    Array de arrays incluyento todos los resultados agrupados por carreras.
 * @param {object}    jugadores  Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                               objetos que incluyen sus nombres de usuario, número de carreras disputadas y sus
 *                               puntuaciones Elo. Se actualiza tras la ejecución de esta función.
 * @param {object}    resultados Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                               arrays de objetos. Tamaño del array es el número total de carreras encontradas.
 *                               En cada posición del array, si el jugador participó en la carrera correspondiente,
 *                               hay un objeto que contiene su posición, tiempo y tasa de colección. Se actualiza
 *                               tras la ejecución de esta función.
 */
function procesar_resultados_de_carrera(num, arr_res, jugadores, resultados) {
	const resultados_carrera = arr_res[num];
	for (let i = 0; i < resultados_carrera.length; ++i) {
		const res_jugador = resultados_carrera[i];
		const player_id = res_jugador.player.DiscordId;
		if (!(player_id in jugadores)) {
			jugadores[player_id] = { name: res_jugador.player.Name, races: 0, score: 1500 };
		}
		if (!(player_id in resultados)) {
			resultados[player_id] = new Array(arr_res.length);
		}

		jugadores[player_id]['races'] += 1;

		// Registrar resultado del jugador en vector de resultados
		if (res_jugador.Time == 359999) {
			resultados[player_id][num] = { position: 'DNF', time: 'Forfeit' };
		}
		else {
			resultados[player_id][num] = { position: i + 1, time: calcular_tiempo(res_jugador.Time) };
		}
		if ('CollectionRate' in res_jugador) {
			resultados[player_id][num]['cr'] = res_jugador.CollectionRate;
		}
	}

	// Actualizar Elo de los jugadores
	actualizar_puntuaciones(resultados_carrera, jugadores);
}


/**
 * @summary Función auxiliar en la rutina del comando /exportar.
 *
 * @description Añade información general acerca de la carrera en la hoja de Excel correspondiente.
 *
 * @param {Worksheet} ws      Hoja de Excel a la que añadir la información.
 * @param {Model}     carrera Información general de la carrera, tal y como figura en base de datos.
 */
function info_carrera(ws, carrera) {
	const base_row = 2, base_col = 6;
	let i = 0;
	for (const prop of RACE_PROPERTIES) {
		if (prop in carrera) {
			const key_cell = ws.getCell(base_row + i, base_col);
			key_cell.value = PROPERTIES_TEXT[prop];
			key_cell.font = { bold: true };
			let my_prop = carrera[prop];
			const value_cell = ws.getCell(base_row + i, base_col + 1);
			if (prop.includes('Date')) {
				my_prop = new Date(parseInt(my_prop) * 1000);
				value_cell.numFmt = 'dd/mm/yyyy hh:mm:ss';
				value_cell.alignment = { horizontal: 'left' };
			}
			ws.getCell(base_row + i, base_col + 1).value = my_prop;
			i += 1;
		}
	}
}


/**
 * @summary Función auxiliar en la rutina del comando /exportar.
 *
 * @description Añade una hoja al Excel con los resultados de una carrera.
 *
 * @param {Workbook} excel      Hoja de cálculo de Excel a la que añadir los resultados de las carreras.
 * @param {number}   num        Índice la carrera dentro de la secuencia de carreras encontradas.
 * @param {Model}    carrera    Información general de la carrera, tal y como figura en base de datos.
 * @param {object}   jugadores  Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                              objetos que incluyen sus nombres de usuario, número de carreras disputadas y sus
 *                              puntuaciones Elo. Se actualiza tras la ejecución de esta función.
 * @param {object}   resultados Objeto cuyas claves son los IDs de Discord de los jugadores y cuyos valores son
 *                              arrays de objetos. Tamaño del array es el número total de carreras encontradas.
 *                              En cada posición del array, si el jugador participó en la carrera correspondiente,
 *                              hay un objeto que contiene su posición, tiempo y tasa de colección. Se actualiza
 *                              tras la ejecución de esta función.
 */
function resultados_excel(excel, num, carrera, jugadores, resultados) {

	const rows = [];

	// construir array de resultados para la carrera
	for (const player of Object.keys(resultados)) {
		if (resultados[player][num]) {
			const my_res = resultados[player][num];
			if ('SubmitChannel' in carrera) {
				rows.push([my_res['position'], jugadores[player]['name'], my_res['time'], my_res['cr']]);
			}
			else {
				rows.push([my_res['position'], jugadores[player]['name'], my_res['time']]);
			}
		}
	}

	// ordenar array de resultados
	rows.sort((a, b) => {
		// ambos jugadores terminan
		if (typeof a[0] === 'number' && typeof b[0] === 'number') return a[0] - b[0];
		// uno de los jugadores se retira
		if (typeof a[0] === 'number' && typeof b[0] === 'string') return -1;
		if (typeof a[0] === 'string' && typeof b[0] === 'number') return 1;
		return 0;
	});

	// crear tabla en hoja de cálculo
	const cols = [{ name: 'Posición' }, { name: 'Jugador' }, { name: 'Tiempo' }];
	if ('SubmitChannel' in carrera) {
		cols.push({ name: 'Colección' });
	}

	const ws = excel.addWorksheet(`${num + 1} - ${carrera.Name}`);
	ws.addTable({
		name: `Race${num + 1}`,
		ref: 'A1',
		headerRow: true,
		style: {
			showRowStripes: true,
		},
		columns: cols,
		rows: rows,
	});
	info_carrera(ws, carrera);
	ws.columns.forEach(column => {
		const lengths = column.values.map(v => v.toString().length);
		let maxLength = Math.max(...lengths.filter(v => typeof v === 'number'));
		if (maxLength < 6) maxLength = 6;
		if (maxLength > 45) maxLength = 45;
		column.width = maxLength + 1;
	});
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
	const res_carreras = await get_past_races(db, inicio.toSeconds(), final.toSeconds(), tipo, true);

	// resultados de las carreras como array de arrays, descartando carreras con menos de dos resultados
	const [arrays_resultados, _] = res_carreras.reduce(results_reduce, [[], []]);
	if (arrays_resultados.length == 0) {
		throw { 'message': 'No hay resultados de carreras en el rango de fechas especificado.' };
	}
	if (arrays_resultados.length > 50) {
		throw { 'message': 'Demasiadas carreras encontradas. Reduce el rango de fechas.' };
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

	// Procesar resultados y registrar en el Excel
	for (let i = 0; i < arrays_resultados.length; ++i) {
		procesar_resultados_de_carrera(i, arrays_resultados, jugadores, resultados);
		resultados_excel(excel, i, arrays_resultados[i][0].race, jugadores, resultados);
	}

	return excel;
}


module.exports = { exportar_resultados };