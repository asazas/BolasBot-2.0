const { Permissions, MessageEmbed, CommandInteraction } = require('discord.js');
const { Sequelize } = require('sequelize');
const { get_or_insert_player, ban_player, unban_player } = require('../datamgmt/db_utils');


/**
 * @summary Invocado con /vetos banear.
 *
 * @description Impide a un usuario crear o participar en carreras de BolasBot.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function vetos_banear(interaction, db) {
	const user = interaction.options.getUser('usuario');
	if (user.bot) {
		throw { 'message': 'Los bots no pueden ser vetados.' };
	}

	const member = await interaction.guild.members.fetch(user.id);
	if (!member) {
		throw { 'message': 'El usuario especificado no es miembro de este servidor.' };
	}
	if (member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
		throw { 'message': 'Los moderadores no pueden ser vetados.' };
	}

	const user_in_db = await get_or_insert_player(db, user.id, user.username, user.discriminator, `${user}`);
	if (user_in_db[0].Banned) {
		throw { 'message': 'El usuario especificado ya está vetado.' };
	}

	await ban_player(db, user.id);
	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`El usuario ${user} ha sido vetado.`)
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed], ephemeral: true });
}


/**
 * @summary Invocado con /vetos levantar.
 *
 * @description Retira el veto de un usuario.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function vetos_levantar(interaction, db) {
	const user = interaction.options.getUser('usuario');
	const member = await interaction.guild.members.fetch(user.id);
	if (!member) {
		throw { 'message': 'El usuario especificado no es miembro de este servidor.' };
	}

	const user_in_db = await get_or_insert_player(db, user.id, user.username, user.discriminator, `${user}`);
	if (!user_in_db[0].Banned) {
		throw { 'message': 'El usuario especificado no está vetado.' };
	}

	await unban_player(db, user.id);
	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Se ha retirado el veto sobre el usuario ${user}.`)
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed], ephemeral: true });
}


module.exports = { vetos_banear, vetos_levantar };