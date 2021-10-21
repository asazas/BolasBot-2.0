const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_async_by_submit, get_race_by_channel } = require('../datamgmt/db_utils');
const { done_async, done_race } = require('../racing/done_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('forfeit')
		.setDescription('Usar para retirarse de una carrera'),

	async execute(interaction, db) {
		let race = await get_race_by_channel(db, interaction.channelId);
		if (!race) {
			race = await get_async_by_submit(db, interaction.channelId);
			if (!race) {
				throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
			}

			// carrera asíncrona
			await done_async(interaction, db, race);
		}

		// carrera normal
		await done_race(interaction, db, race, true);
	},
};