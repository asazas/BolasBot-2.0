const { Sequelize, Model } = require('sequelize');


/**
 * @summary Llamado como parte de la rutina del comando /carrera crear.
 *
 * @description Registra los datos de una nueva carrera síncrona en la base de datos del servidor.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    name         Nombre de la carrera.
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
async function insert_race(sequelize, name, creator, ranked, preset, seed_hash, seed_code, seed_url, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			return await races.create({
				Name: name,
				Creator: creator,
				CreationDate: Math.floor(new Date().getTime() / 1000),
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
 * @description Busca una carrera síncrona en base de datos a partir del ID de su hilo de Discord.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    race_channel ID del hilo de Discord correspondiente a la carrera.
 *
 * @returns {?Model} Modelo correspondiente a la carrera buscada. Devuelve null si la carrera no existe.
 */
async function get_race_by_channel(sequelize, race_channel) {
	const races = sequelize.models.Races;
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
 * @summary Llamado como parte de la rutina de /carrera entrar.
 *
 * @description Registra en base de datos a un jugador como participante en una carrera síncrona.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {number}  Devuelve 0 si la operación se completa con éxito, -1 si la operación falla porque la
 * carrera no está abierta, o -2 si el jugador ya había entrado en la carrera previamente.
 */
async function get_or_insert_race_player(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: { Id: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (my_race.Status != 0) return -1;

			const this_player = await race_results.findOrCreate({
				where: {
					Race: race,
					Player: player,
					Timestamp: Math.floor(new Date().getTime() / 1000),
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!this_player[1]) return -2;
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de la rutina del comando /carrera salir.
 *
 * @description Elimina a un jugador como participante de una carrera síncrona.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {number} Devuelve 0 si la operación se completa con éxito, -1 si la operación falla porque el jugador
 * no está registrado en la carrera, -2 si la operación falla porque el jugador trata de salir mientras está
 * listo para comenzar, o -3 si la operación falla porque la carrera ya ha comenzado.
 */
async function delete_race_player_if_present(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 0) {
				return -3;
			}
			if (race_player.Status != 0) {
				return -2;
			}
			await race_player.destroy({ transaction: t });
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de la rutina del comando /carrera listo.
 *
 * @description Establece a un participante de una carrera síncrona como listo para comenzar.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {object|number} Si la operación tiene éxito, devuelve un objeto con dos atributos: "all", el número
 * total de participantes en la carrera; y "ready", el número de jugadores que están listos para comenzar. Si la
 * operación falla, devuelve -1 si el jugador no está registrado en la carrera, -2 si el jugador ya se había
 * declarado previamente como listo para comenzar, o -3 si la carrera no está abierta.
 */
async function set_player_ready(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 0) {
				return -3;
			}
			if (race_player.Status != 0) {
				return -2;
			}
			race_player.Status = 1;
			race_player.Timestamp = Math.floor(new Date().getTime() / 1000);
			await race_player.save({ transaction: t });

			const all_player_count = await race_results.findAndCountAll({
				where: { Race: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			let ready_player_count = 0;
			for (const p of all_player_count.rows) {
				if (p.Status == 1) ready_player_count += 1;
			}
			return { 'all': all_player_count.count, 'ready': ready_player_count };
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de la rutina de /carrera forzar inicio.
 *
 * @description Establece a todos los jugadores de una carrera como listos para comenzar.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 *
 * @returns {number} Devuelve 0 si la operación se completa con éxito, -1 si la operación falla porque no hay al
 * menos dos jugadores apuntados a la carrera, o -2 si la operación falla porque la carrera no está abierta.
 */
async function set_all_ready_for_force_start(sequelize, race) {
	const race_results = sequelize.models.RaceResults;
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					Id: race,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			const race_players = await race_results.findAndCountAll({
				where: { Race: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});

			if (race_players.count < 2) {
				return -1;
			}
			if (my_race.Status != 0) {
				return -2;
			}

			await race_results.update({ Status: 1, Timestamp: Math.floor(new Date().getTime() / 1000) }, {
				where: { Status: 0 },
				transaction: t,
			});

			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Invocado como parte de la rutina del comando /carrera no_listo.
 *
 * @description Retira el estado de listo para empezar la carrera a un jugador.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {number} Devuelve 0 si la operación se completa con éxito, -1 si la operación falla porque el jugador
 * no está registrado en la carrera, -2 si la operación falla porque el jugador no está listo para comenzar, o -3
 * si la operación falla porque la carrera no está abierta.
 */
async function set_player_unready(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 0) {
				return -3;
			}
			if (race_player.Status != 1) {
				return -2;
			}
			race_player.Status = 0;
			race_player.Timestamp = Math.floor(new Date().getTime() / 1000);
			await race_player.save({ transaction: t });
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado cuando comienza una carrera síncrona.
 *
 * @description Establece el estado de una carrera como "en curso". Actualiza su fecha de inicio.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    race_channel ID del hilo de Discord correspondiente a la carrera.
 *
 * @returns {Model} Modelo en base de datos correspondiente a la carrera actualizada.
 */
async function set_race_started(sequelize, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					RaceChannel: race_channel,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			my_race.Status = 1;
			my_race.StartDate = Math.floor(new Date().getTime() / 1000) + 10;
			return await my_race.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Invocado como parte de la rutina del comando /done usado en carreras síncronas.
 *
 * @description Registra el tiempo de un jugador en una carrera síncrona y establece si estado como "terminado".
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {object|number} Si la operación tiene éxito, devuelve un objeto con los siguientes atributos:
 * "result", un modelo de base de datos RaceResults que representa el resultado del jugador; "position",
 * la posición en la carrera conseguida por el jugador; "done_count", el total de jugadores que han terminado
 * la carrera (incluyendo forfeits); y "player_count", el número total de participantes en la carrera. Si la
 * operación falla, devuelve -1 si el jugador no está registrado en la carrera, -2 si el jugador no está
 * participando en la carrera, -3 si la carrera aún está abierta, -4 si la carrera ya ha terminado, o -5 si
 * la carrera está en su cuenta atrás inicial.
 */
async function set_player_done(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 1) {
				return -3;
			}
			if (race_player.Status == 0) {
				return -2;
			}
			if (race_player.Status == 2) {
				return -4;
			}
			race_player.Status = 2;
			const tstamp = Math.floor(new Date().getTime() / 1000);
			const new_time = tstamp - race_player.race.StartDate;
			if (new_time <= 0) {
				return -5;
			}
			race_player.Time = new_time;
			race_player.Timestamp = tstamp;
			const updated_res = await race_player.save({ transaction: t });

			const all_player_count = await race_results.findAndCountAll({
				where: { Race: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			let done_player_count = 0;
			let pos = 0;
			for (const p of all_player_count.rows) {
				if (p.Status == 2) done_player_count += 1;
				if (p.Status == 2 && p.Time < 359999) pos += 1;
			}
			return { 'result': updated_res, 'position': pos, 'done_count': done_player_count, 'player_count': all_player_count.count };
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Invocado como parte de la rutina del comando /forfeit en carreras síncronas.
 *
 * @description Registra el abandono de un jugador en la carrera y establece su estado como "terminado".
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {object|number} Si la operación tiene éxito, devuelve un objeto con los siguientes atributos:
 * "result", un modelo de base de datos RaceResults que representa el resultado del jugador; "done_count", el
 * total de jugadores que han terminado la carrera (incluyendo forfeits); y "player_count", el número total de
 * participantes en la carrera. Si la operación falla, devuelve -1 si el jugador no está registrado en la
 * carrera, -2 si el jugador no está participando en la carrera, -3 si la carrera aún está abierta, o -4 si la
 * carrera ya ha terminado.
 */
async function set_player_forfeit(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 1) {
				return -3;
			}
			if (race_player.Status == 0) {
				return -2;
			}
			if (race_player.Status == 2) {
				return -4;
			}
			race_player.Status = 2;
			race_player.Time = 359999;
			race_player.Timestamp = Math.floor(new Date().getTime() / 1000);
			const updated_res = await race_player.save({ transaction: t });

			const all_player_count = await race_results.findAndCountAll({
				where: { Race: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			let done_player_count = 0;
			for (const p of all_player_count.rows) {
				if (p.Status == 2) done_player_count += 1;
			}
			return { 'result': updated_res, 'done_count': done_player_count, 'player_count': all_player_count.count };
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado como parte de la rutina del comando /carrera forzar final.
 *
 * @description Registra abandonos como resultado de todos los jugadores que todavía están participando en la
 * carrera.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 *
 * @returns {number} Devuelve 0 si la operación se completa con éxito, o -1 si la operación falla porque la
 * carrera no está en curso.
 */
async function set_all_forfeit_for_force_end(sequelize, race) {
	const race_results = sequelize.models.RaceResults;
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					Id: race,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});

			if (my_race.Status != 1) {
				return -1;
			}

			await race_results.update({ Status: 2, Time: 359999, Timestamp: Math.floor(new Date().getTime() / 1000) }, {
				where: { Status: 1 },
				transaction: t,
			});

			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado al cerrar una carrera síncrona.
 *
 * @description Establece una carrera como terminada, acualizando su fecha de final.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    race_channel ID del hilo de Discord asociado a la carrera.
 *
 * @returns {Model} Modelo de base de datos correspondiente a la carrera actualizada.
 */
async function set_race_finished(sequelize, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					RaceChannel: race_channel,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			my_race.Status = 2;
			my_race.EndDate = Math.floor(new Date().getTime() / 1000);
			return await my_race.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Invocado como parte de la rutina del comando /undone.
 *
 * @description Revierte el estado "terminado" de un jugador en la carrera, volviéndolo a marcar como "en curso".
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {number}    race      ID en base de datos de la carrera.
 * @param {string}    player    ID en Discord del jugador que entra en la carrera.
 *
 * @returns {number} Devuelve 0 si la operación se completa con éxito. Si la operación falla, devuelve -1 si el
 * jugador no está apuntado en la carrera, -2 si el jugador no está participando en la carrera, -3 si la carrera
 * no está en curso, o -4 si el jugador no se había establecido como terminado.
 */
async function set_player_undone(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 1) {
				return -3;
			}
			if (race_player.Status == 0) {
				return -2;
			}
			if (race_player.Status == 1) {
				return -4;
			}
			race_player.Status = 1;
			race_player.Time = null;
			race_player.Timestamp = Math.floor(new Date().getTime() / 1000);
			await race_player.save({ transaction: t });
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado al terminar una carrera síncrona para contruir la tabla de resultados y actualizar el
 * ranking de jugadores, en el caso de que la carrera fuese puntuable.
 *
 * @description Obtiene los resultados de todos los jugadores en la carrera, en orden ascendiente de tiempos.
 *
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    race_channel ID del hilo de Discord asociado a la carrera.
 *
 * @returns {Model[]} Array ordenado que contiene los modelos correspondientes a los resultados de la carrera.
 */
async function get_results_for_race(sequelize, race_channel) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await race_results.findAll({
				include: [
					{
						model: sequelize.models.Races,
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

module.exports = {
	insert_race, get_race_by_channel, get_or_insert_race_player, delete_race_player_if_present,
	set_player_ready, set_all_ready_for_force_start, set_player_unready, set_race_started, set_player_done,
	set_player_forfeit, set_all_forfeit_for_force_end, set_race_finished, set_player_undone, get_results_for_race,
};