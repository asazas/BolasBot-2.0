const { MessageEmbed } = require('discord.js');
const { save_async_result } = require('../datamgmt/async_db_utils');
const { get_or_insert_player } = require('../datamgmt/db_utils');
const { set_player_forfeit, set_player_done, set_race_finished, set_player_undone } = require('../datamgmt/race_db_utils');
const { get_results_text } = require('./async_util');

function calcular_tiempo(timestamp) {
	let time_str = 'Forfeit ';
	if (timestamp < 359999) {
		const s = timestamp % 60;
		let m = Math.floor(timestamp / 60);
		const h = Math.floor(m / 60);
		m = m % 60;

		const h_str = '0'.repeat(2 - h.toString().length) + h.toString();
		const m_str = '0'.repeat(2 - m.toString().length) + m.toString();
		const s_str = '0'.repeat(2 - s.toString().length) + s.toString();
		time_str = `${h_str}:${m_str}:${s_str}`;
	}
	return time_str;
}

async function done_async(interaction, db, race) {
	if (race.Status == 0) {
		await interaction.deferReply({ ephemeral: true });
		let collection = interaction.options.getInteger('collection');
		if (!collection) {
			collection = 0;
		}
		let time = interaction.options.getString('tiempo');
		if (!time) {
			time = '99:59:59';
			collection = 0;
		}

		if (/^\d?\d:[0-5]\d:[0-5]\d$/.test(time) && collection >= 0) {
			const time_arr = time.split(':');
			const time_s = 3600 * parseInt(time_arr[0]) + 60 * parseInt(time_arr[1]) + parseInt(time_arr[2]);

			const author = interaction.user;
			await get_or_insert_player(db, author.id, author.username, author.discriminator, `${author}`);
			await save_async_result(db, race.Id, author.id, time_s, collection);

			const results_text = await get_results_text(db, race.SubmitChannel);
			const results_channel = interaction.guild.channels.cache.get(`${race.ResultsChannel}`);
			const results_message = results_channel.messages.cache.get(`${race.ResultsMessage}`);
			await results_message.edit(results_text);

			if (race.RoleId) {
				const async_role = interaction.guild.roles.cache.get(`${race.RoleId}`);
				await interaction.member.roles.add(async_role);
			}

			const ans_embed = new MessageEmbed()
				.setColor('#0099ff')
				.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
				.setDescription(`GG ${author}, tu resultado se ha registrado.`)
				.setTimestamp();
			await interaction.editReply({ embeds: [ans_embed], ephemeral: true });
		}
		else {
			throw { 'message': 'Parámetros inválidos.' };
		}
	}
	else {
		throw { 'message': 'Esta carrera no está abierta.' };
	}
}

async function done_race(interaction, db, race, forfeit = false) {
	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	let done_code = null;
	if (forfeit) {
		done_code = await set_player_forfeit(db, race.Id, interaction.user.id);
	}
	else {
		done_code = await set_player_done(db, race.Id, interaction.user.id);
	}

	let text_ans = null;
	if (done_code == -1) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está en la carrera.`)
			.setTimestamp();
	}
	else if (done_code == -2) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está participando en la carrera.`)
			.setTimestamp();
	}
	else if (done_code == -3) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('La carrera no está en curso.')
			.setTimestamp();
	}
	else if (done_code == -4) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} ya ha terminado.`)
			.setTimestamp();
	}
	else if (done_code == -5) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('¡La carrera aún no ha comenzado')
			.setTimestamp();
	}
	else {
		let time_text = null;
		if (done_code['result'].Time == 359999) {
			time_text = `${interaction.user} se ha retirado de la carrera.`;
		}
		else {
			time_text = `${interaction.user} ha terminado en el puesto ${done_code['position']} con un tiempo de: ${calcular_tiempo(done_code['result'].Time)}.`;
		}
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(time_text)
			.setTimestamp();
	}
	await interaction.reply({ embeds: [text_ans] });

	if (typeof done_code == 'object' && done_code['position'] == done_code['player_count']) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('Todos los jugadores han terminado. Cerrando la carrera. ¡GG!')
			.setTimestamp();
		await interaction.channel.send({ embeds: [text_ans] });

		await set_race_finished(db, interaction.channelId);
	}
}

async function undone_race(interaction, db, race) {
	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const undone_code = await set_player_undone(db, race.Id, interaction.user.id);

	let text_ans = null;
	if (undone_code == -1) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está en la carrera.`)
			.setTimestamp();
	}
	else if (undone_code == -2) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está participando en la carrera.`)
			.setTimestamp();
	}
	else if (undone_code == -3) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('La carrera no está en curso.')
			.setTimestamp();
	}
	else if (undone_code == -4) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} aún no ha terminado.`)
			.setTimestamp();
	}
	else {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} continúa la carrera.`)
			.setTimestamp();
	}
	await interaction.reply({ embeds: [text_ans] });
}

module.exports = { done_async, done_race, undone_race };