const { Op, Model, Sequelize } = require('sequelize');


/**
 * @summary Llamado al crear el canal para alertas de stream.
 *
 * @description Almacena el ID del canal para alertas de stream en la tabla de variables globales del servidor.
 *
 * @param {Sequelize} sequelize      Base de datos del servidor.
 * @param {string}    stream_channel ID del canal para alertas de stream.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_stream_alerts_channel(sequelize, stream_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ StreamAlertsChannel: stream_channel }, {
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
 * @summary Llamado al crear el rol para notificaciones cuando hay alertas de stream.
 *
 * @description Almacena el ID del rol para avisos de stream en la tabla de variables globales del servidor.
 *
 * @param {Sequelize} sequelize   Base de datos del servidor.
 * @param {string}    stream_role ID del rol para avisos de stream.
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_stream_alerts_role(sequelize, stream_role) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ StreamAlertsRole: stream_role }, {
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
 * @summary Llamado como parte de la rutina del comando /streams alta.
 *
 * @description Añade o actualiza la información de un stream de Twitch a la tabla de alertas de stream.
 *
 * @param {Sequelize} sequelize   Base de datos del servidor.
 * @param {string}    owner       ID en Discord del propietario del canal de Twitch.
 * @param {string}    twitch_user Nombre de usuario en Twitch del propietario del canal.
 *
 * @returns {[Model, null]} Array cuyo primer elemento es el modelo correspondiente al stream registrado o
 * actualizado.
 */
async function register_stream(sequelize, owner, twitch_user) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.upsert({
				Owner: owner,
				TwitchUser: twitch_user,
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
 * @summary Llamado como parte de la rutina del comando /streams baja.
 *
 * @description Elimina un stream de Twitch de la tabla de alertas de stream.
 *
 * @param {Sequelize} sequelize   Base de datos del servidor.
 * @param {string}    twitch_user Nombre de usuario en Twitch del propietario del canal a eliminar.
 *
 * @returns {number} Número de entradas de base de datos eliminadas.
 */
async function unregister_stream(sequelize, twitch_user) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.destroy(
				{
					where: {
						TwitchUser: twitch_user,
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


/**
 * @summary Llamado como parte de la rutina periódica para anunciar streams en vivo.
 *
 * @description Obtiene las entradas de todos los streams registrados para alertas en el servidor.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 *
 * @returns {Model[]} Array que contiene los modelos correspondientes a los streams registrados.
 */
async function get_streams(sequelize) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.findAll({
				include: [
					{
						model: sequelize.models.Players,
						as: 'owner',
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
 * @summary Llamado como parte de la rutina periódica para anunciar streams en vivo.
 *
 * @description Actualiza el estado de un stream monitorizado (si está emitiendo o no.)
 *
 * @param {Sequelize} sequelize   Base de datos del servidor.
 * @param {string}    twitch_user Nombre de usuario en Twitch del propietario del canal.
 * @param {boolean}   status      Estado del canal (true: en vivo, false: desconectado.)
 *
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function update_stream_live(sequelize, twitch_user, status) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.update(
				{
					Live: status,
				}, {
					where: {
						TwitchUser: twitch_user,
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
	set_stream_alerts_channel, set_stream_alerts_role, register_stream,
	unregister_stream, get_streams, update_stream_live,
};