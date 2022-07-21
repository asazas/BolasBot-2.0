const { Op, Sequelize, Model } = require('sequelize');


/**
 * @summary Llamado como parte de la rutina del comando /async crear.
 *
 * @description Registra los datos de una nueva carrera asíncrona en la base de datos del servidor.
 *
 * @param {Sequelize} sequelize        Base de datos del servidor.
 * @param {string}    name             Nombre de la carrera asíncrona.
 * @param {string}    creator          ID en Discord del creador de la carrera asíncrona.
 * @param {boolean}   ranked           Indica si la carrera asíncrona es puntuable (true) o no (false.)
 * @param {string}    preset           Nombre del preset de la seed para la carrera, incluyendo opciones extra.
 * @param {string}    seed_hash        Hash de la seed para la carrera.
 * @param {string}    seed_code        Código de la seed para la carrera.
 * @param {string}    seed_url         URL de la seed para la carrera.
 * @param {string}    role_id          ID del rol de Discord que se asigna a usuarios que registran resultados.
 * @param {string}    submit_channel   ID del canal de Discord para envío de resultados de la carrera.
 * @param {string}    results_channel  ID del canal de Discord para mostrar los resultados de la carrera.
 * @param {string}    results_message  ID del mensaje en Discord que contiene los resultados de la carrera.
 * @param {string}    spoilers_channel ID del canal de Discord para discusión de spoilers post-carrera.
 *
 * @returns {Model} Modelo correspondiente a la nueva carrera asíncrona.
 */
async function insert_async(sequelize, name, creator, ranked, preset, seed_hash, seed_code, seed_url,
	role_id, submit_channel, results_channel, results_message, spoilers_channel) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.create({
				Name: name,
				Creator: creator,
				StartDate: Math.floor(new Date().getTime() / 1000),
				Ranked: ranked,
				Preset: preset,
				SeedHash: seed_hash,
				SeedCode: seed_code,
				SeedUrl: seed_url,
				RoleId: role_id,
				SubmitChannel: submit_channel,
				ResultsChannel: results_channel,
				ResultsMessage: results_message,
				SpoilersChannel: spoilers_channel,
			}, { transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de la rutina de /async crear.
 *
 * @description Busca todas las carreras asíncronas activas (no purgadas) en el servidor.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 *
 * @returns {Model[]} Array que contiene los modelos asociados a las carreras asíncronas activas.
 */
async function get_active_async_races(sequelize) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.findAll({
				where: {
					Status: {
						[Op.or]: [0, 1],
					},
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Actualmente esta función no se utiliza en ningún sitio.
 *
 * @description Busca carreras asíncronas por nombre.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    name      Nombre de la/s carrera/s asíncrona/s a buscar.
 *
 * @returns {Model[]} Array que contiene las carreras asíncronas cuyo nombre es igual al buscado.
 */
async function search_async_by_name(sequelize, name) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.findAll({
				where: {
					Name: {
						[Op.like]: name,
					},
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado en múltiples operaciones en las que se necesitan obtener los datos de una carrera asíncrona.
 *
 * @description Busca en el servidor los datos de una carrera asíncrona a partir del ID de su canal de envío de
 * resultados.
 *
 * @param {Sequelize} sequelize      Base de datos del servidor.
 * @param {string}    submit_channel ID del canal de envío de resultados de la carrera asíncrona.
 *
 * @returns {?Model} Modelo correspondiente a la carrera asíncrona buscada.
 */
async function get_async_by_submit(sequelize, submit_channel) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.findOne({
				include: [
					{
						model: sequelize.models.Players,
						as: 'creator',
					},
				],
				where: {
					SubmitChannel: submit_channel,
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de las rutinas de /async cerrar, /async reabrir y /async purgar.
 *
 * @description Actualiza el estado de una carrera asíncrona.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    id        ID en base de datos de la carrera asíncrona a actualizar.
 * @param {number}    status    Nuevo estado de la carrera asíncrona (0: abierta, 1: cerrada, 2: purgada.)
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function update_async_status(sequelize, id, status) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			await async_races.findOne({
				where: {
					Id: id,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (status == 1) {
				return await async_races.update({
					Status: status,
					EndDate: Math.floor(new Date().getTime() / 1000),
				}, {
					where: {
						Id: id,
					},
					transaction: t,
				});
			}
			else {
				return await async_races.update({
					Status: status,
				}, {
					where: {
						Id: id,
					},
					transaction: t,
				});
			}
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Invocado en las rutinas de los comandos /jugar y /done (cuando se usa en carreras asíncronas.)
 *
 * @description Registra o actualiza el resultado enviado por un jugador en una carrera asíncrona.
 *
 * @param {Sequelize} sequelize       Base de datos del servidor.
 * @param {number}    race            ID en base de datos de la carrera para la que se guarda el resultado.
 * @param {string}    player          ID en Discord del jugador que registra el resultado.
 * @param {number}    time            Tiempo registrado por el jugador, en segundos.
 * @param {number}    collection_rate Tasa de colección de ítems registrada por el jugador.
 *
 * @returns {[Model, null]} Array cuyo primer elemento es el modelo correspondiente al resultado de carrera
 * asíncrona registrado o actualizado.
 */
async function save_async_result(sequelize, race, player, time, collection_rate) {
	const async_results = sequelize.models.AsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.upsert({
				Race: race,
				Player: player,
				Timestamp: Math.floor(new Date().getTime() / 1000),
				Time: time,
				CollectionRate: collection_rate,
			}, {
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado cuando se envían los resultados de una carrera asíncrona como mensaje en Discord y cuando se
 * actualizan las puntuaciones de los jugadores.
 *
 * @description Obtiene todos los resultados enviados por los jugadores a una carrera asíncrona determinada, en
 * orden ascendiente de tiempo.
 *
 * @param {Sequelize} sequelize      Base de datos del servidor.
 * @param {string}    submit_channel ID del canal de Discord para envío de resultados de la carrera asíncrona a
 *                                   buscar.
 *
 * @returns {Model[]} Array que contiene los modelos de los resultados para la carrera asíncrona buscada.
 */
async function get_results_for_async(sequelize, submit_channel) {
	const async_results = sequelize.models.AsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.findAll({
				include: [
					{
						model: sequelize.models.AsyncRaces,
						as: 'race',
						required: true,
						where: {
							SubmitChannel: submit_channel,
						},
					},
					{
						model: sequelize.models.Players,
						as: 'player',
					},
				],
				order: [
					['Time', 'ASC'],
					['Timestamp', 'ASC'],
				],
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado en carreras asíncronas puntuables para confirmar que un jugador ha usado el comando /jugar
 * antes de registrar un resultado.
 *
 * @description Busca el resultado de un jugador específico en una carrera asíncrona.
 *
 * @param {Sequelize} sequelize      Base de datos del servidor.
 * @param {string}    submit_channel ID del canal de Discord para envío de resultados de la carrera asíncrona.
 * @param {string}    player         ID en Discord del jugador a buscar.
 *
 * @returns {?Model} Modelo correspondiente al resultado buscado. Si este no existe, devuelve null.
 */
async function get_player_result(sequelize, submit_channel, player) {
	const async_results = sequelize.models.AsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.findOne({
				include: [
					{
						model: sequelize.models.AsyncRaces,
						as: 'race',
						required: true,
						where: {
							SubmitChannel: submit_channel,
						},
					},
					{
						model: sequelize.models.Players,
						as: 'player',
						required: true,
						where: {
							DiscordId: player,
						},
					},
				],
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de la rutina del comando /exportar.
 *
 * @description Devuelve la información y resultados de todas las carreras asíncronas en el rango temporal solicitado.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    start     Timestamp que representa el momento inicial de la ventana temporal a buscar.
 * @param {number}    end       Timestamp que representa el momento final de la ventana temporal a buscar.
 * @param {number}    type      Tipo de carreras a incluir en la búsqueda. 0 = asíncronas, 1 = síncronas, 2 = ambas.
 * @param {boolean}   ranked    Si es true, devuelve solo resultados de carreras puntuables. Si es false, devuelve
 *                              resultados de todas las carreras.
 *
 * @returns {Model[]} Array de modelos conteniendo la información de las carreras buscadas. Si se buscan tanto
 * carreras asíncronas como síncronas, se devuelven todas en el mismo array, en orden ascendente de fecha de cierre.
 */
async function get_past_races(sequelize, start, end, type, ranked) {
	const async_races = sequelize.models.AsyncRaces;
	const races = sequelize.models.Races;

	let my_asyncs = null, my_races = null;

	const condition = {
		EndDate: {
			[Op.between]: [start, end],
		},
		Status: 2,
	};
	if (ranked) condition['Ranked'] = true;

	try {
		return await sequelize.transaction(async (t) => {
			if (type == 0 || type == 2) {
				my_asyncs = await async_races.findAll({
					where: condition,
					order: [
						['EndDate', 'ASC'],
					],
					transaction: t,
				});
				if (type == 0) return my_asyncs;
			}

			if (type == 1 || type == 2) {
				my_races = await races.findAll({
					where: condition,
					order: [
						['EndDate', 'ASC'],
					],
					transaction: t,
				});
				if (type == 1) return my_races;
			}

			// type == 2
			const all_races = [...my_asyncs, ...my_races];
			all_races.sort((a, b) => a.EndDate - b.EndDate);
			return all_races;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

module.exports = {
	insert_async, get_active_async_races, search_async_by_name, get_async_by_submit,
	update_async_status, save_async_result, get_results_for_async, get_player_result, get_past_races,
};