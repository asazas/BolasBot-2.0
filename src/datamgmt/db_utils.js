const { Op, Sequelize } = require('sequelize');


/**
 * @summary Llamado en la ejecución de comandos relacionados con carreras para asegurarse que el usuario que
 * invoca el comando está registrado en base de datos.
 *
 * @description Obtiene la información del jugador con el ID de Discord especificado de la base de datos. Si no
 * existe, crea una nueva entrada para el jugador en la base de datos.
 *
 * @param {Sequelize} sequelize     Base de datos del servidor sobre el que operar.
 * @param {string}    discord_id    ID de Discord del usuario.
 * @param {string}    name          Nombre del usuario en Discord.
 * @param {string}    discriminator Discriminador del usuario en Discord.
 * @param {string}    mention       Cadena usada para mencionar al usuario en Discord.
 *
 * @returns {[Model, boolean]} Array con dos elementos: en la posición [0], los datos del jugador tal y como
 * devuelve la base de datos; y en la posición [1], un boolean que indica si el jugador ha sido creado como
 * resultado de esta operación (true) o si ya existía en base de datos (false.)
 */
async function get_or_insert_player(sequelize, discord_id, name = null, discriminator = null, mention = null) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			return await players.findOrCreate({
				where: { DiscordId: discord_id },
				defaults: {
					Name: name,
					Discriminator: discriminator,
					Mention: mention,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado en la generación de la tabla de ranking de jugadores.
 *
 * @description Devuelve la lista de todos los jugadores del servidor que hayan participado en al menos una
 * carrera puntuable, ordenados de mayor a menor puntuación.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 *
 * @returns {Model[]} Lista de jugadores ordenada por puntuación.
 */
async function get_ranked_players(sequelize) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			return await players.findAll({
				where: {
					Races: {
						[Op.gt]: 0,
					},
				},
				order: [
					['Score', 'DESC'],
					['Races', 'DESC'],
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
 * @summary Llamado al actualizar la puntuación de un jugador tras una carrera.
 *
 * @description Actualiza la puntuación de un usuario e incrementa en uno su número de carreras disputadas.
 *
 * @param {Sequelize} sequelize  Base de datos del servidor.
 * @param {string}    discord_id ID de Discord del jugador a actualizar.
 * @param {number}    score      Nueva puntuación del jugador.
 */
async function update_player_score(sequelize, discord_id, score) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			const player = await players.findOne({
				where: {
					DiscordId: discord_id,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			player.Score = score;
			player.Races += 1;
			await player.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Invocado por el comando /resetear_puntos.
 *
 * @description Resetea las puntuaciones y carreras disputadas de todos los jugadores a sus valores por defecto.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 *
 * @returns {[number]} Array con un elemento: el número de jugadores actualizados.
 */
async function reset_player_scores(sequelize) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			return await players.update({ Score: 1500, Races: 0 }, {
				where: {
					DiscordId: {
						[Op.ne]: null,
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
 * @summary Usado para leer variables globales del servidor.
 *
 * @description Devuelve la tabla de variables globales del servidor.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 *
 * @returns {?Model} Modelo incluyendo las variables globales del servidor.
 */
async function get_global_var(sequelize) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.findOne({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}


/**
 * @summary Llamado al crear la categoría para canales de envío de resultados de carreras asíncronas en un
 * servidor.
 *
 * @description Almacena el ID de la categoría para canales "submit" en la tabla de variables globales del
 * servidor.
 *
 * @param {Sequelize} sequelize       Base de datos del servidor.
 * @param {string}    submit_category ID de la categoría para canales de envío de resultados.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_async_submit_category(sequelize, submit_category) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ AsyncSubmitCategory: submit_category }, {
				where: {
					ServerId: {
						[Op.ne]: null,
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
 * @summary Llamado al crear el canal de historial de carreras asíncronas.
 *
 * @description Almacena el ID del canal de historial de carreras asíncronas en la tabla de variables globales
 * del servidor.
 *
 * @param {Sequelize} sequelize       Base de datos del servidor.
 * @param {string}    history_channel ID del canal de historial de carreras asíncronas.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_async_history_channel(sequelize, history_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ AsyncHistoryChannel: history_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
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
 * @summary Llamado al crear el canal de historial de carreras síncronas.
 *
 * @description Almacena el ID del canal de historial de carreras síncronas en la tabla de variables globales
 * del servidor.
 *
 * @param {Sequelize} sequelize       Base de datos del servidor.
 * @param {string}    history_channel ID del canal de historial de carreras síncronas.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_race_history_channel(sequelize, history_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ RaceHistoryChannel: history_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
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
 * @summary Llamado al crear el canal de ranking de jugadores.
 *
 * @description Almacena el ID del canal de ranking de jugadores en la tabla de variables globales del servidor.
 *
 * @param {Sequelize} sequelize     Base de datos del servidor.
 * @param {string}    score_channel ID del canal de ranking de jugadores.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_player_score_channel(sequelize, score_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ PlayerScoreChannel: score_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
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
 * @summary Invocado por el comando /multiworld yaml_channel.
 *
 * @description Almacena el ID del canal para ajustes de multiworld en la tabla de variables globales del servidor.
 *
 * @param {Sequelize} sequelize     Base de datos del servidor.
 * @param {string}    multi_channel ID del canal para ajustes de multiworld.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_multi_settings_channel(sequelize, multi_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ MultiworldSettingsChannel: multi_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
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

module.exports = {
	get_or_insert_player, get_ranked_players, update_player_score, reset_player_scores, get_global_var,
	set_async_submit_category, set_async_history_channel, set_race_history_channel, set_player_score_channel,
	set_multi_settings_channel,
};