const { ApiClient } = require('@twurple/api');
const { Permissions, MessageEmbed, CommandInteraction, Guild } = require('discord.js');
const { Sequelize } = require('sequelize');
const { get_or_insert_player, get_global_var } = require('../datamgmt/db_utils');
const { register_stream, unregister_stream, set_stream_alerts_role, get_streams, update_stream_live, set_stream_alerts_channel } = require('../datamgmt/stream_db_utils');


/**
 * @summary Invocado con /streams alta.
 *
 * @description Añade un stream de Twitch a la lista de alertas del servidor.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function stream_alta(interaction, db) {
	const stream = interaction.options.getString('stream');
	const owner = interaction.options.getUser('usuario');
	if (owner) {
		await get_or_insert_player(db, owner.id, owner.username, owner.discriminator, `${owner}`);
		await register_stream(db, owner.id, stream.toLowerCase());
	}
	else {
		await register_stream(db, null, stream.toLowerCase());
	}
	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Añadido el stream ${stream} a la lista de alertas.`)
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado con /streams baja.
 *
 * @description Elimina un stream de Twitch de la lista de alertas del servidor.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function stream_baja(interaction, db) {
	const stream = interaction.options.getString('stream');
	const deleted = await unregister_stream(db, stream);
	if (deleted == 0) {
		throw { 'message': 'El stream proporcionado no está registrado.' };
	}
	const ans_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Eliminado el stream ${stream} de la lista de alertas.`)
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado con /streams rol.
 *
 * @description Establece un rol en el servidor al que notificar cuando haya alertas de stream.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function set_stream_role(interaction, db) {
	const role = interaction.options.getRole('rol');
	if (role) {
		await set_stream_alerts_role(db, role.id);
		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription(`Registrado el rol ${role} para pings de alertas de stream.`)
			.setTimestamp();
		await interaction.reply({ embeds: [ans_embed] });
	}
	else {
		await set_stream_alerts_role(db, null);
		const ans_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('No se enviarán pings para alertas de stream.')
			.setTimestamp();
		await interaction.reply({ embeds: [ans_embed] });
	}
}


/**
 * @summary Llamado cada vez que se ejecuta la rutina para alertas de stream.
 *
 * @description Consulta todos los streams que están siendo monitorizados en un servidor para alertas.
 *
 * @param {Sequelize} db Base de datos del servidor en el que se realiza la consulta.
 *
 * @returns {object} Un objeto que contiene una entrada por stream monitorizado, especificando quién es el
 * propietario del stream y de si estaba en línea o no cuando la última consulta fue efectuada.
 */
async function streams_data(db) {
	const streams = await get_streams(db);
	const stream_list = {};
	for (const s of streams) {
		stream_list[s.TwitchUser] = { 'owner': s.Owner, 'live': s.Live };
	}
	return stream_list;
}

/**
 * @summary Llamado cada vez que se ejecuta la rutina para alertas de stream.
 *
 * @description Realiza una consulta a Twitch para comprobar el estado de todos los streams monitorizados. Para
 * optimizar la eficiencia de esta operación, se consultan los streams de todos los servidores en los que el bot
 * está presente de forma simultánea.
 *
 * @param {string[]}  stream_list   Array que contiene los usuarios de Twitch a consultar.
 * @param {ApiClient} twitch_client Cliente de Twitch de la librería Twurple.
 *
 * @returns {object} Objeto que contiene, para cada usuario consultado que está emitiendo, información sobre su
 * stream. Los usuarios que no estén emitiendo no figurarán en este objeto.
 */
async function get_twitch_streams_info(stream_list, twitch_client) {
	const twitch_info = {};
	const resp = twitch_client.streams.getStreamsPaginated({ userName: stream_list });
	for await (const s of resp) {
		twitch_info[s.userName] = s;
	}
	return twitch_info;
}


/**
 * @summary Llamado cada vez que se ejecuta la rutina para alertas de stream.
 *
 * @description Envía mensajes en el canal de alertas de stream de un servidor notificando sobre streams
 * monitorizados que hayan empezado a emitir. Actualiza el estado de todos los streams monitorizados en base
 * de datos.
 *
 * @param {Guild}     guild         Servidor en el que se mandarán las alertas.
 * @param {object}    guild_streams Información de streams monitorizados sacada de la base de datos del servidor.
 *                                  Se trata del objeto devuelto por el método streams_data().
 * @param {Sequelize} db            Base de datos correspondiente al servidor sobre el que se está operando.
 * @param {object}    twitch_info   Información de streams obtenida de la consulta a la API de Twitch. Se trata
 *                                  del objeto devuelto por el método get_twitch_streams_info().
 */
async function announce_live_streams(guild, guild_streams, db, twitch_info) {
	const set_live = [];
	const set_not_live = [];
	const messages = [];
	for (const [channel_name, stream_db_status] of Object.entries(guild_streams)) {

		// channel went live, prepare to send alert
		if (twitch_info[channel_name] && (!stream_db_status['live'])) {
			try {
				let title = `¡${twitch_info[channel_name].userName} está en directo!`;
				if (stream_db_status['owner']) {
					const member = await guild.members.fetch(stream_db_status['owner']);
					title = `¡${member.user.username} está en directo!`;
				}
				const ans_embed = new MessageEmbed()
					.setColor('#0099ff')
					.setAuthor({ name: guild.me.user.username, iconURL: guild.me.user.avatarURL() })
					.setTitle(title)
					.setURL(`https://www.twitch.tv/${twitch_info[channel_name].userName}`)
					.setDescription(`${twitch_info[channel_name].title}`)
					.setImage(`${twitch_info[channel_name].thumbnailUrl.replace('-{width}x{height}', '')}`)
					.addField('Juego', `${twitch_info[channel_name].gameName}`)
					.setTimestamp();
				messages.push(ans_embed);
				set_live.push(channel_name);
			}
			catch (error) {
				console.log(error);
			}
		}

		// channel finished streaming, update status
		else if (stream_db_status['live'] && (!twitch_info[channel_name])) {
			set_not_live.push(channel_name);
		}
	}

	if (set_live.length > 0) {
		await update_stream_live(db, set_live, true);
	}
	if (set_not_live.length > 0) {
		await update_stream_live(db, set_not_live, false);
	}

	if (messages.length > 0) {
		const global_var = await get_global_var(db);
		let alerts_channel = null;
		if (global_var.StreamAlertsChannel) {
			try {
				alerts_channel = await guild.channels.fetch(`${global_var.StreamAlertsChannel}`);
			}
			catch (error) {
				alerts_channel = null;
			}
		}
		if (!alerts_channel) {
			alerts_channel = await guild.channels.create('streams-comunidad', {
				permissionOverwrites: [
					{
						id: guild.roles.everyone,
						deny: [Permissions.FLAGS.SEND_MESSAGES],
					},
					{
						id: guild.me,
						allow: [Permissions.FLAGS.SEND_MESSAGES],
					},
				],
			});
			await set_stream_alerts_channel(db, alerts_channel.id);
		}
		if (global_var.StreamAlertsRole) {
			const my_role = await guild.roles.fetch(global_var.StreamAlertsRole);
			await alerts_channel.send(`${my_role}`);
		}
		for (const m of messages) {
			await alerts_channel.send({ embeds: [m] });
		}
	}
}

module.exports = {
	stream_alta, stream_baja, set_stream_role, streams_data,
	get_twitch_streams_info, announce_live_streams,
};