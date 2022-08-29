const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_async_by_submit, save_async_result, get_player_result } = require('../datamgmt/async_db_utils');
const { get_or_insert_player } = require('../datamgmt/db_utils');
const { get_async_data_embed } = require('../racing/race_results_util');
const { seed_info_embed } = require('../seedgen/info_embeds');
const { retrieve_from_url } = require('../seedgen/seedgen');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('jugar')
		.setDescription('Usar en una carrera asíncrona puntuable para obtener la seed.')
		.setDMPermission(false),

	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}

		await interaction.deferReply({ ephemeral: true });

		const race = await get_async_by_submit(db, interaction.channelId);
		if ((!race) || (!race.Ranked)) {
			throw { 'message': 'Este comando solo puede ser usado en canales de carreras asíncronas puntuables.' };
		}

		const player = interaction.user;
		const player_in_db = await get_or_insert_player(db, player.id, player.username, player.discriminator, `${player}`);
		if (player_in_db[0].Banned) {
			throw { 'message': 'Este usuario no puede participar en carreras porque está vetado.' };
		}

		if (race.Status != 0) {
			throw { 'message': 'Esta carrera no está abierta.' };
		}

		const player_result = await get_player_result(db, race.SubmitChannel, player.id);
		if (!player_result) {
			await save_async_result(db, race.Id, player.id, 359999, 0);
		}

		const async_data = await get_async_data_embed(db, race.SubmitChannel);
		const seed = await retrieve_from_url(race.SeedUrl, interaction);
		if (seed) {
			const info_embed = seed_info_embed(seed, interaction);
			if (info_embed[1]) {
				await interaction.editReply({ embeds: [async_data], files: [info_embed[1]], ephemeral: true });
			}
			else {
				await interaction.editReply({ embeds: [async_data], ephemeral: true });
			}
		}
		else {
			await interaction.editReply({ embeds: [async_data], ephemeral: true });
		}

		console.log(`${player.username} ha usado el comando /jugar para la carrera ${race.Name} en el servidor ${interaction.guild.name}`);

		return;
	},
};