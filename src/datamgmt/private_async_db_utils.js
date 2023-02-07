const { Sequelize, Model, where } = require('sequelize');


/**
 * @summary Llamado como parte de la rutina del comando /async_privada crear.
 *
 * @description Registra los datos de una nueva carrera asíncrona invitacional en la base de datos del servidor.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    name         Nombre de la carrera.
 * @param {string}    label        Etiqueta de la carrera.
 * @param {string}    creator      ID en Discord del creador de la carrera.
 * @param {boolean}   ranked       Indica si la carrera es puntuable (true) o no (false.)
 * @param {string}    preset       Nombre del preset de la seed para la carrera, incluyendo opciones extra.
 * @param {string}    seed_hash    Hash de la seed para la carrera.
 * @param {string}    seed_code    Código de la seed para la carrera.
 * @param {string}    seed_url     URL de la seed para la carrera.
 * @param {string}    race_channel ID del hilo de Discord creado para la carrera.
 *
 * @returns {Model} Modelo correspondiente a la carrera creada.
 */
async function insert_private_async(sequelize, name, label, creator, ranked, preset, seed_hash, seed_code, seed_url, race_channel) {
	const pa_races = sequelize.models.PrivateAsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await pa_races.create({
				Name: name,
				Label: label,
				Creator: creator,
				StartDate: Math.floor(new Date().getTime() / 1000),
				Ranked: ranked,
				Preset: preset,
				SeedHash: seed_hash,
				SeedCode: seed_code,
				SeedUrl: seed_url,
				RaceChannel: race_channel,
			}, { transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Usado para diversas funcionalidades, cuando es necesario buscar los datos de una carrera en base de datos.
 *
 * @description Busca una carrera asíncrona privada en base de datos a partir del ID de su hilo de Discord.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    race_channel ID del hilo de Discord correspondiente a la carrera.
 *
 * @returns {?Model} Modelo correspondiente a la carrera buscada. Devuelve null si la carrera no existe.
 */
async function get_private_async_by_channel(sequelize, race_channel) {
	const races = sequelize.models.PrivateAsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await races.findOne({
				include: [
					{
						model: sequelize.models.Players,
						as: 'creator',
					},
				],
				where: {
					RaceChannel: race_channel,
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
 * @summary Llamado como parte de las rutinas de /async_privada terminar.
 *
 * @description Marca una carrera asíncrona invitacional como terminada.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    id        ID en base de datos de la carrera asíncrona a actualizar.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function finish_private_async(sequelize, id) {
	const pa_races = sequelize.models.PrivateAsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await pa_races.update({
				Status: 1,
				EndDate: Math.floor(new Date().getTime() / 1000),
			}, {
				where: {
					Id: id,
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
 * @summary Llamado al terminar una carrera asíncrona invitacional para contruir la tabla de resultados y actualizar el
 * ranking de jugadores, en el caso de que la carrera fuese puntuable.
 *
 * @description Obtiene los resultados de todos los jugadores en la carrera, en orden ascendiente de tiempos.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    race_channel ID del hilo de Discord asociado a la carrera.
 *
 * @returns {Model[]} Array ordenado que contiene los modelos correspondientes a los resultados de la carrera.
 */
async function get_results_for_private_async(sequelize, race_channel) {
	const race_results = sequelize.models.PrivateAsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await race_results.findAll({
				include: [
					{
						model: sequelize.models.PrivateAsyncRaces,
						as: 'race',
						required: true,
						where: {
							RaceChannel: race_channel,
						},
					},
					{
						model: sequelize.models.Players,
						as: 'player',
						required: true,
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
 * @summary Llamado en carreras asíncronas invitacionales para confirmar si un jugador tiene un resultado
 * registrado.
 *
 * @description Busca el resultado de un jugador específico en una carrera asíncrona invitacional.
 *
 * @param {Sequelize} sequelize      Base de datos del servidor.
 * @param {string}    race_channel   ID del canal de Discord para envío de resultados de la carrera asíncrona.
 * @param {string}    player         ID en Discord del jugador a buscar.
 *
 * @returns {?Model} Modelo correspondiente al resultado buscado. Si este no existe, devuelve null.
 */
async function get_player_private_async_result(sequelize, race_channel, player) {
	const async_results = sequelize.models.PrivateAsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.findOne({
				include: [
					{
						model: sequelize.models.PrivateAsyncRaces,
						as: 'race',
						required: true,
						where: {
							RaceChannel: race_channel,
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
 * @summary Invocado en las rutinas de los comandos /jugar y /done (cuando se usa en carreras asíncronas privadas.)
 *
 * @description Registra o actualiza el resultado enviado por un jugador en una carrera asíncrona privada.
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
async function save_private_async_result(sequelize, race, player, time, collection_rate) {
	const async_results = sequelize.models.PrivateAsyncResults;
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
 * @summary Invocado en las rutinas de los comandos /async_privada desinvitar
 *
 * @description Elimina el resultado enviado por un jugador en una carrera asíncrona privada.
 *
 * @param {Sequelize} sequelize       Base de datos del servidor.
 * @param {number}    race            ID en base de datos de la carrera para la que se elimina el resultado.
 * @param {string}    player          ID en Discord del jugador del que se elimina el resultado.
 *
 * @returns {number} Número de entradas de base de datos eliminadas.
 */
async function delete_private_async_result(sequelize, race, player) {
	const async_results = sequelize.models.PrivateAsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.destroy(
				{
					where: {
						Race: race,
						Player: player,
					},
				}, {
					transaction: t,
				});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

module.exports = {
	insert_private_async, get_private_async_by_channel, finish_private_async, get_results_for_private_async,
	get_player_private_async_result, save_private_async_result, delete_private_async_result,
};