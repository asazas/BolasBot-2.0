const { MessageEmbed } = require('discord.js');
const { get_or_insert_player, save_async_result } = require('../datamgmt/db_utils');
const { get_results_text } = require('./async_util');

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

module.exports = { done_async };