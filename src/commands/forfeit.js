const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_async_by_submit } = require('../datamgmt/db_utils');
const { done_async } = require('../racing/done_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('forfeit')
		.setDescription('Usar para retirarse de una carrera'),

	async execute(interaction, db) {
		const race = await get_async_by_submit(db, interaction.channelId);
		if (!race) {
			throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
		}

		// carrera asíncrona
		await done_async(interaction, db, race);
	},
};