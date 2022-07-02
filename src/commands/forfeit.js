const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_async_by_submit } = require('../datamgmt/async_db_utils');
const { get_race_by_channel } = require('../datamgmt/race_db_utils');
const { done_async, done_race } = require('../racing/done_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('forfeit')
		.setDescription('Usar para retirarse de una carrera')
		.setDMPermission(false),

	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}

		let race = await get_race_by_channel(db, interaction.channelId);
		if (!race) {
			race = await get_async_by_submit(db, interaction.channelId);
			if (!race) {
				throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
			}

			// carrera asíncrona
			await done_async(interaction, db, race);
			return;
		}

		// carrera normal
		await done_race(interaction, db, race, true);
	},
};