const { Op } = require('sequelize');

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


module.exports = { set_reaction_roles_channel, create_reaction_role_category, delete_reaction_role_category,
	create_reaction_role, delete_reaction_role, get_all_role_categories, get_role_category, get_role_by_name,
	get_role_by_emoji_id, get_roles_for_category };