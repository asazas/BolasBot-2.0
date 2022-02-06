const { Permissions, MessageEmbed } = require('discord.js');
const { get_or_insert_player, get_global_var } = require('../datamgmt/db_utils');
const { register_stream, unregister_stream, set_stream_alerts_role, get_streams, update_stream_live, set_stream_alerts_channel } = require('../datamgmt/stream_db_utils');

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

async function streams_data(db) {
	const streams = await get_streams(db);
	const stream_list = {};
	for (const s of streams) {
		stream_list[s.TwitchUser] = { 'owner': s.Owner, 'live': s.Live };
	}
	return stream_list;
}

async function get_twitch_streams_info(stream_list, twitch_client) {
	const twitch_info = {};
	const resp = twitch_client.streams.getStreamsPaginated({ userName: stream_list });
	for await (const s of resp) {
		twitch_info[s.userName] = s;
	}
	return twitch_info;
}

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
					.setAuthor(guild.me.user.username, guild.me.user.avatarURL())
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

module.exports = { stream_alta, stream_baja, set_stream_role, streams_data,
	get_twitch_streams_info, announce_live_streams };