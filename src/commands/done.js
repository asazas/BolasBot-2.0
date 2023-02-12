const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_async_by_submit } = require('../datamgmt/async_db_utils');
const { get_private_async_by_channel } = require('../datamgmt/private_async_db_utils');
const { get_race_by_channel } = require('../datamgmt/race_db_utils');
const { done_async, done_race, done_private_async } = require('../racing/done_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('done')
		.setDescription('Usar cuando se termine una carrera')
		.setDMPermission(false)
		.addStringOption(option =>
			option.setName('tiempo')
				.setDescription('En carreras asíncronas, tiempo en formato HH:MM:SS.'))
		.addIntegerOption(option =>
			option.setName('collection')
				.setDescription('En carreras asíncronas, ratio de colección de ítems.')),

	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}

		let race = await get_race_by_channel(db, interaction.channelId);
		if (!race) {
			race = await get_async_by_submit(db, interaction.channelId);
			if (!race) {
				race = await get_private_async_by_channel(db, interaction.channelId);
				if (!race) {
					throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
				}

				// carrera asíncrona invitacional
				await done_private_async(interaction, db, race);
				return;
			}

			// carrera asíncrona
			await done_async(interaction, db, race);
			return;
		}

		// carrera normal
		await done_race(interaction, db, race);
	},
};