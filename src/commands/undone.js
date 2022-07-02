const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_race_by_channel } = require('../datamgmt/race_db_utils');
const { undone_race } = require('../racing/done_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('undone')
		.setDescription('Usar cuando se quiera deshacer un done de una carrera.')
		.setDMPermission(false),

	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}

		const race = await get_race_by_channel(db, interaction.channelId);
		if (!race) {
			throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
		}

		// carrera normal
		await undone_race(interaction, db, race);
	},
};