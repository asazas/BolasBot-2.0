const { Permissions, MessageEmbed } = require('discord.js');
const { get_global_var } = require('../datamgmt/db_utils');
const { set_reaction_roles_channel, get_role_category, create_reaction_role_category, get_roles_for_category, delete_reaction_role_category, get_all_role_categories, get_role_by_name, create_reaction_role, delete_reaction_role, get_role_by_emoji_id } = require('../datamgmt/role_db_utils');

const unicode_emoji_regex = /^\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]$/;
const discord_custom_emoji_regex = /^(?:<a?)?:\w+:(?:(\d{18})>)?$/;

async function resolver_id_emoji(interaction, nombre_emoji) {
	let id_emoji = null;
	if (unicode_emoji_regex.test(nombre_emoji)) {
		id_emoji = nombre_emoji;
	}
	else {
		const emoji_regex_res = discord_custom_emoji_regex.exec(nombre_emoji);
		if (emoji_regex_res) {
			const emoji_obj = await interaction.guild.emojis.fetch(emoji_regex_res[1]);
			if (emoji_obj && !emoji_obj.managed) {
				id_emoji = emoji_regex_res[1];
			}
		}
	}
	return id_emoji;
}

async function actualizar_mensaje_roles(cat_msg, roles_en_cat) {
	let desc = '';
	for (const rol of roles_en_cat) {
		if (desc) {
			desc += '\n\n';
		}
		desc += `${rol.EmojiName}: ${rol.Description}`;
	}
	const embed = cat_msg.embeds[0];
	embed.setDescription(desc);
	await cat_msg.edit({ embeds: [embed] });
}

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

	await interaction.deferReply();

	const nombre_emoji = interaction.options.getString('emoji');
	const emoji = await resolver_id_emoji(interaction, nombre_emoji);
	if (!emoji) {
		throw { 'message': 'No puedo usar este emoji.' };
	}

	const descripcion = interaction.options.getString('descripcion');

	const nuevo_rol = await interaction.guild.roles.create({ name: nombre_rol });
	await create_reaction_role(db, descripcion, emoji, nombre_emoji, nombre_rol.toLowerCase(), nuevo_rol.id, categoria.Name);

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

	const id_emoji = resolver_id_emoji(interaction, rol.Emoji);
	const reactions = cat_msg.reactions.resolve(id_emoji);
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

async function asignar_reaction_role(db, guild, user, emoji) {
	const rol = await get_role_by_emoji_id(db, emoji.id);
	const rol_obj = await guild.roles.fetch(`${rol.RoleId}`);
	const member = await guild.members.fetch(user.id);
	await member.roles.add(rol_obj);
}

async function quitar_reaction_role(db, guild, user, emoji) {
	const rol = await get_role_by_emoji_id(db, emoji.id);
	const rol_obj = await guild.roles.fetch(`${rol.RoleId}`);
	const member = await guild.members.fetch(user.id);
	await member.roles.remove(rol_obj);
}

module.exports = { crear_categoria_roles, eliminar_categoria_roles, crear_rol, eliminar_rol,
	asignar_reaction_role, quitar_reaction_role };