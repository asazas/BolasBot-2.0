const { Sequelize, Model, Op } = require('sequelize');


/**
 * @summary Llamado como parte de la rutina del comando /comandos crear.
 *
 * @description Crea un nuevo comando específico de servidor, o actualiza uno existente.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    name      Nombre del comando.
 * @param {string}    text      Texto de respuesta al comando.
 * @param {string}    commandId ID del comando en Discord.
 *
 * @returns {[Model, null]} Array cuyo primer elemento es el modelo correspondiente al comando registrado o
 * actualizado.
 */
async function create_command(sequelize, name, text, commandId) {
	const comandos = sequelize.models.Comandos;
	try {
		return await sequelize.transaction(async (t) => {
			return await comandos.upsert({
				Name: name,
				Text: text,
				CommandId: commandId,
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
 * @summary Llamado como parte de la rutina del comando /comandos eliminar.
 *
 * @description Elimina un comando de texto específico de servidor.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    name      Nombre del comando a eliminar.
 *
 * @returns {number} Número de entradas de base de datos eliminadas.
 */
async function delete_command(sequelize, name) {
	const comandos = sequelize.models.Comandos;
	try {
		return await sequelize.transaction(async (t) => {
			return await comandos.destroy(
				{
					where: {
						Name: {
							[Op.like]: name,
						},
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
 * @summary Llamado en /comandos crear, /comandos eliminar y en la invocación de un comando de servidor.
 *
 * @description Busca en el servidor los datos de un comando de texto específico de servidor.
 *
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    name      Nombre del comando a buscar.
 *
 * @returns {?Model} Modelo correspondiente al comando buscado, o null si este no existe.
 */
async function get_command(sequelize, name) {
	const comandos = sequelize.models.Comandos;
	try {
		return await sequelize.transaction(async (t) => {
			return await comandos.findOne({
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

module.exports = { create_command, delete_command, get_command };