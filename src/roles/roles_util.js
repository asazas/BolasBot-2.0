const { Permissions, MessageEmbed, Guild, CommandInteraction, User, ReactionEmoji, Message } = require('discord.js');
const { Sequelize } = require('sequelize');
const { get_global_var } = require('../datamgmt/db_utils');
const { set_reaction_roles_channel, get_role_category, create_reaction_role_category, get_roles_for_category, delete_reaction_role_category, get_all_role_categories, get_role_by_name, create_reaction_role, delete_reaction_role, get_role_by_emoji_id } = require('../datamgmt/role_db_utils');

const UNICODE_EMOJI_REGEX = /^\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]$/;
const DISCORD_CUSTOM_EMOJI_REGEX = /^(?:<a?)?:\w+:(?:(\d{18})>)?$/;


/**
 * @summary Función auxiliar para obtener el ID de un emoji.
 *
 * @description Computa el ID de un emoji (unicode o propio de servidor) a partir de su representación textual.
 *
 * @param {Guild}  guild        Servidor en el que buscar el emoji.
 * @param {string} nombre_emoji Representación textual del emoji.
 *
 * @returns {?string} ID del emoji. Puede ser null si es un emoji de servidor que no se encuentra.
 */
async function resolver_id_emoji(guild, nombre_emoji) {
	let id_emoji = null;
	if (UNICODE_EMOJI_REGEX.test(nombre_emoji)) {
		id_emoji = nombre_emoji;
	}
	else {
		const emoji_regex_res = DISCORD_CUSTOM_EMOJI_REGEX.exec(nombre_emoji);
		if (emoji_regex_res) {
			const emoji_obj = await guild.emojis.fetch(emoji_regex_res[1]);
			if (emoji_obj && !emoji_obj.managed) {
				id_emoji = emoji_regex_res[1];
			}
		}
	}
	return id_emoji;
}


/**
 * @summary Llamado cuando se crea o se elimina un rol reaccionable.
 *
 * @description Actualiza la el mensaje de una categoría de roles reaccionables para registrar la creación o
 * eliminación de un rol.
 *
 * @param {Message} cat_msg      Mensaje de categoría de roles a actualizar.
 * @param {Model[]} roles_en_cat Nueva lista de roles existentes en la categoría.
 */
async function actualizar_mensaje_roles(cat_msg, roles_en_cat) {
	let desc = '';
	for (const rol of roles_en_cat) {
		if (desc) {
			desc += '\n\n';
		}
		desc += `${rol.EmojiName} : ${rol.Description}`;
	}
	const embed = cat_msg.embeds[0];
	embed.setDescription(desc);
	await cat_msg.edit({ embeds: [embed] });
}


/**
 * @summary Invocado por /roles crear categoria.
 *
 * @description Crea una nueva categoría para roles reaccionables.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function crear_categoria_roles(interaction, db) {
	const todas_cats = await get_all_role_categories(db);
	if (todas_cats && todas_cats.length > 10) {
		throw { 'message': 'Demasiadas categorías de roles definidas en este servidor.' };
	}

	const nombre_cat = interaction.options.getString('nombre');
	const cat_existente = await get_role_category(db, nombre_cat.toLowerCase());
	if (cat_existente) {
		throw { 'message': 'Ya existe una categoría de roles con este nombre.' };
	}

	await interaction.deferReply();

	const global_var = await get_global_var(db);
	let roles_channel = null;
	if (global_var.ReactionRolesChannel) {
		try {
			roles_channel = await interaction.guild.channels.fetch(`${global_var.ReactionRolesChannel}`);
		}
		catch (error) {
			roles_channel = null;
		}
	}
	if (!roles_channel) {
		roles_channel = await interaction.guild.channels.create('roles', {
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone,
					deny: [Permissions.FLAGS.SEND_MESSAGES],
				},
				{
					id: interaction.guild.me,
					allow: [Permissions.FLAGS.SEND_MESSAGES],
				},
			],
		});
		await set_reaction_roles_channel(db, roles_channel.id);
	}

	const role_cat_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(nombre_cat);

	const cat_msg = await roles_channel.send({ embeds: [role_cat_embed] });
	await create_reaction_role_category(db, nombre_cat.toLowerCase(), cat_msg.id);

	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Creada la categoría de roles: \`${nombre_cat}\`.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado por /roles eliminar categoria.
 *
 * @description Elimina una categoría para roles reaccionables.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function eliminar_categoria_roles(interaction, db) {
	const nombre_cat = interaction.options.getString('nombre');
	const categoria = await get_role_category(db, nombre_cat.toLowerCase());
	if (!categoria) {
		throw { 'message': 'No existe una categoría de roles con este nombre.' };
	}

	await interaction.deferReply();

	const cat_roles = await get_roles_for_category(db, nombre_cat.toLowerCase());
	for (const rol of cat_roles) {
		const rol_obj = await interaction.guild.roles.fetch(`${rol.RoleId}`);
		await rol_obj.delete();
	}

	const global_var = await get_global_var(db);
	const roles_channel = await interaction.guild.channels.fetch(`${global_var.ReactionRolesChannel}`);
	const cat_msg = await roles_channel.messages.fetch(`${categoria.Message}`);
	await cat_msg.delete();

	await delete_reaction_role_category(db, nombre_cat.toLowerCase());

	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Eliminada la categoría de roles: \`${nombre_cat}\`.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado por /roles crear rol.
 *
 * @description Crea un nuevo rol reaccionable dentro de una categoría existente.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function crear_rol(interaction, db) {
	const nombre_cat = interaction.options.getString('categoria');
	const categoria = await get_role_category(db, nombre_cat.toLowerCase());
	if (!categoria) {
		throw { 'message': 'No existe una categoría de roles con este nombre.' };
	}
	let roles_en_cat = await get_roles_for_category(db, categoria.Name);
	if (roles_en_cat && roles_en_cat > 10) {
		throw { 'message': 'Demasiados roles en esta categoría.' };
	}

	const nombre_rol = interaction.options.getString('nombre');
	const rol = await get_role_by_name(db, nombre_rol.toLowerCase());
	if (rol) {
		throw { 'message': 'Ya existe un rol con este nombre.' };
	}

	const nombre_emoji = interaction.options.getString('emoji');
	const emoji = await resolver_id_emoji(interaction.guild, nombre_emoji);
	if (!emoji) {
		throw { 'message': 'No puedo usar este emoji.' };
	}
	if (await get_role_by_emoji_id(db, emoji)) {
		throw { 'message': 'Ya existe un rol con este emoji.' };
	}

	await interaction.deferReply();

	const descripcion = interaction.options.getString('descripcion');

	const busca_rol = (await interaction.guild.roles.fetch()).find(role => role.name.toLowerCase() == nombre_rol.toLowerCase());
	if (busca_rol) {
		await create_reaction_role(db, descripcion, emoji, nombre_emoji, nombre_rol.toLowerCase(), busca_rol.id, categoria.Name);
	}
	else {
		const nuevo_rol = await interaction.guild.roles.create({ name: nombre_rol });
		await create_reaction_role(db, descripcion, emoji, nombre_emoji, nombre_rol.toLowerCase(), nuevo_rol.id, categoria.Name);
	}

	const global_var = await get_global_var(db);
	const roles_channel = await interaction.guild.channels.fetch(`${global_var.ReactionRolesChannel}`);
	const cat_msg = await roles_channel.messages.fetch(`${categoria.Message}`);
	roles_en_cat = await get_roles_for_category(db, categoria.Name);
	await actualizar_mensaje_roles(cat_msg, roles_en_cat);

	cat_msg.react(emoji);

	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Creado el rol: \`${nombre_rol}\`.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado por /roles eliminar rol.
 *
 * @description Elimina un rol reaccionable.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function eliminar_rol(interaction, db) {
	const nombre_rol = interaction.options.getString('nombre');
	const rol = await get_role_by_name(db, nombre_rol.toLowerCase());
	if (!rol) {
		throw { 'message': 'No existe un rol con este nombre.' };
	}

	await interaction.deferReply();

	const rol_obj = await interaction.guild.roles.fetch(`${rol.RoleId}`);
	await rol_obj.delete();

	await delete_reaction_role(db, nombre_rol.toLowerCase());

	const global_var = await get_global_var(db);
	const roles_en_cat = await get_roles_for_category(db, rol.category.Name);
	const roles_channel = await interaction.guild.channels.fetch(`${global_var.ReactionRolesChannel}`);
	const cat_msg = await roles_channel.messages.fetch(`${rol.category.Message}`);
	await actualizar_mensaje_roles(cat_msg, roles_en_cat);

	const reactions = cat_msg.reactions.resolve(rol.EmojiId);
	if (reactions) {
		await reactions.remove();
	}

	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Eliminado el rol: \`${nombre_rol}\`.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado al detectar que se añade una reacción a un mensaje de roles reaccionables.
 *
 * @description Asigna el rol correspondiente al usuario que añadió la reacción.
 *
 * @param {Sequelize}     db    Base de datos del servidor en el que se registró la reacción.
 * @param {Guild}         guild Servidor en el que se registró la reacción.
 * @param {User}          user  Usuario que añadió la reacción.
 * @param {ReactionEmoji} emoji Emoji asociado a la reacción.
 */
async function asignar_reaction_role(db, guild, user, emoji) {
	let emoji_id = emoji.id;
	if (!emoji_id) {
		emoji_id = emoji.name;
	}
	const rol = await get_role_by_emoji_id(db, emoji_id);
	const rol_obj = await guild.roles.fetch(`${rol.RoleId}`);
	const member = await guild.members.fetch(user.id);
	await member.roles.add(rol_obj);
}


/**
 * @summary Invocado al detectar que se elimina una reacción de un mensaje de roles reaccionables.
 *
 * @description Retira el rol correspondiente al usuario que eliminó la reacción.
 *
 * @param {Sequelize}     db    Base de datos del servidor en el que se eliminó la reacción.
 * @param {Guild}         guild Servidor en el que se eliminó la reacción.
 * @param {User}          user  Usuario que eliminó la reacción.
 * @param {ReactionEmoji} emoji Emoji asociado a la reacción.
 */
async function quitar_reaction_role(db, guild, user, emoji) {
	let emoji_id = emoji.id;
	if (!emoji_id) {
		emoji_id = emoji.name;
	}
	const rol = await get_role_by_emoji_id(db, emoji_id);
	const rol_obj = await guild.roles.fetch(`${rol.RoleId}`);
	const member = await guild.members.fetch(user.id);
	await member.roles.remove(rol_obj);
}

module.exports = {
	crear_categoria_roles, eliminar_categoria_roles, crear_rol, eliminar_rol,
	asignar_reaction_role, quitar_reaction_role,
};