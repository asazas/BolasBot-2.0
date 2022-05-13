const { Op, Sequelize, Model } = require('sequelize');


/**
 * @summary Llamado al crear el canal para roles reaccionables.
 * 
 * @description Almacena el ID del canal para roles reaccionables en la tabla de variables globales del servidor.
 * 
 * @param {Sequelize} sequelize    Base de datos del servidor.
 * @param {string}    role_channel ID del canal para roles reaccionables.
 * 
 * @returns {[number]} Array con un elemento: el número de filas afectadas por la operación.
 */
async function set_reaction_roles_channel(sequelize, role_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ ReactionRolesChannel: role_channel }, {
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
 * @summary Llamado como parte de la rutina del comando /roles crear categoria.
 * 
 * @description Registra en base de datos una nueva categoría para roles reaccionables.
 * 
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    name      Nombre de la categoría de roles.
 * @param {string}    message   ID del mensaje de Discord asociado a la categoría de roles.
 * 
 * @returns {Model} Modelo correspondiente a la categoría creada.
 */
async function create_reaction_role_category(sequelize, name, message) {
	const reaction_role_categories = sequelize.models.ReactionRoleCategories;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_role_categories.create({
				Name: name,
				Message: message,
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
 * @summary Llamado como parte de la rutina del comando /roles eliminar categoria.
 * 
 * @description Elimina una categoría para roles reaccionables de la base de datos.
 * 
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    name      Nombre de la categoría de roles a eliminar.
 * 
 * @returns {number} Número de entradas de base de datos eliminadas.
 */
async function delete_reaction_role_category(sequelize, name) {
	const reaction_role_categories = sequelize.models.ReactionRoleCategories;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_role_categories.destroy(
				{
					where: {
						Name: name,
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
 * @summary Invocado como parte de la rutina de /roles crear rol.
 * 
 * @description Registra en base de datos un nuevo rol reaccionable.
 * 
 * @param {Sequelize} sequelize   Base de datos del servidor.
 * @param {string}    description Descripción del nuevo rol.
 * @param {string}    emoji_id    ID en Discord del emoji asociado al rol.
 * @param {string}    emoji_name  Nombre del emoji asociado al rol.
 * @param {string}    role_name   Nombre del rol en Discord.
 * @param {string}    role_id     ID del rol en Discord.
 * @param {string}    category    Nombre de la categoría a la que el rol está asociado.
 * 
 * @returns {Model} Modelo correspondiente al rol creado.
 */
async function create_reaction_role(sequelize, description, emoji_id, emoji_name, role_name, role_id, category) {
	const reaction_roles = sequelize.models.ReactionRoles;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_roles.create({
				RoleName: role_name,
				RoleId: role_id,
				Description: description,
				EmojiId: emoji_id,
				EmojiName: emoji_name,
				Category: category,
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
 * @summary Llamado como parte de la rutina del comando /roles eliminar rol.
 * 
 * @description Elimina un rol reaccionable de la base de datos.
 * 
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    role_name Nombre del rol a eliminar.
 * 
 * @returns {number} Número de entradas de base de datos eliminadas.
 */
async function delete_reaction_role(sequelize, role_name) {
	const reaction_roles = sequelize.models.ReactionRoles;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_roles.destroy(
				{
					where: {
						RoleName: role_name,
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
 * @summary Llamado como parte de la rutina de /roles crear categoria.
 * 
 * @description Devuelve todas las categorías para roles reaccionables registradas en el servidor.
 * 
 * @param {Sequelize} sequelize Base de datos del servidor.
 * 
 * @returns {Model[]} Array incluyendo los modelos correspondientes a las categorías para roles reaccionables 
 * del servidor.
 */
async function get_all_role_categories(sequelize) {
	const reaction_role_categories = sequelize.models.ReactionRoleCategories;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_role_categories.findAll({
				order: [
					['Id', 'ASC'],
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
 * @summary Llamado como parte de las rutinas de /roles eliminar categoria y /roles crear rol.
 * 
 * @description Busca el modelo correspondiente a una categoría para roles reaccionables.
 * 
 * @param {Sequelize} sequelize     Base de datos del servidor.
 * @param {string}    category_name Nombre de la categoría para roles reaccionables.
 * 
 * @returns {?Model} Modelo correspondiente a la categoría buscada.
 */
async function get_role_category(sequelize, category_name) {
	const reaction_role_categories = sequelize.models.ReactionRoleCategories;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_role_categories.findOne({
				where: {
					Name: category_name,
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
 * @summary Llamado como parte de la rutina de /roles crear rol y /roles eliminar rol.
 * 
 * @description Busca un rol reaccionable en la base de datos del servidor a partir de su nombre.
 * 
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    role_name Nombre del rol a buscar.
 * 
 * @returns {?Model} Modelo correspondiente al rol buscado.
 */
async function get_role_by_name(sequelize, role_name) {
	const reaction_roles = sequelize.models.ReactionRoles;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_roles.findOne({
				include: [
					{
						model: sequelize.models.ReactionRoleCategories,
						as: 'category',
					},
				],
				where: {
					RoleName: role_name,
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
 * @summary Llamado como parte de las rutinas para asignar y retirar roles como respuesta a reacciones.
 * 
 * @description Busca un rol reaccionable en la base de datos del servidor a partir del ID de su emoji asociado.
 * 
 * @param {Sequelize} sequelize Base de datos del servidor.
 * @param {string}    emoji_id  ID del emoji asociado al rol a buscar.
 * 
 * @returns {?Model} Modelo correspondiente al rol buscado.
 */
async function get_role_by_emoji_id(sequelize, emoji_id) {
	const reaction_roles = sequelize.models.ReactionRoles;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_roles.findOne({
				include: [
					{
						model: sequelize.models.ReactionRoleCategories,
						as: 'category',
					},
				],
				where: {
					EmojiId: emoji_id,
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
 * @summary Llamado en las rutinas de los comandos /roles eliminar categoria, /roles crear rol y /roles eliminar rol.
 * 
 * @description Busca todos los roles reaccionables asociados a una categoría determinada.
 * 
 * @param {Sequelize} sequelize     Base de datos del servidor.
 * @param {string}    category_name Nombre de la categoría cuyos roles buscar.
 * 
 * @returns {Model[]} Array que contiene los modelos asociados a los roles reaccionables de la categoría buscada.
 */
async function get_roles_for_category(sequelize, category_name) {
	const reaction_roles = sequelize.models.ReactionRoles;
	try {
		return await sequelize.transaction(async (t) => {
			return await reaction_roles.findAll({
				include: [
					{
						model: sequelize.models.ReactionRoleCategories,
						as: 'category',
					},
				],
				where: {
					Category: category_name,
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
	set_reaction_roles_channel, create_reaction_role_category, delete_reaction_role_category,
	create_reaction_role, delete_reaction_role, get_all_role_categories, get_role_category, get_role_by_name,
	get_role_by_emoji_id, get_roles_for_category
};