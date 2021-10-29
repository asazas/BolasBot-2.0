const { Op } = require('sequelize');

async function get_or_insert_player(sequelize, discord_id, name = null, discriminator = null, mention = null) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			return await players.findOrCreate({
				where: { DiscordId: discord_id },
				defaults: {
					Name: name,
					Discriminator: discriminator,
					Mention: mention,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_ranked_players(sequelize) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			return await players.findAll({
				where: {
					Races: {
						[Op.gt]: 0,
					},
				},
				order: [
					['Score', 'DESC'],
					['Races', 'DESC'],
				],
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function update_player_score(sequelize, discord_id, score) {
	const players = sequelize.models.Players;
	try {
		return await sequelize.transaction(async (t) => {
			const player = await players.findOne({
				where: {
					DiscordId: discord_id,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			player.Score = score;
			player.Races += 1;
			await player.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_global_var(sequelize) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.findOne({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_async_history_channel(sequelize, history_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ AsyncHistoryChannel: history_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
					},
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_race_history_channel(sequelize, history_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ RaceHistoryChannel: history_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
					},
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_player_score_channel(sequelize, score_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ PlayerScoreChannel: score_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
					},
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_multi_settings_channel(sequelize, multi_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ MultiworldSettingsChannel: multi_channel }, {
				where: {
					ServerId: {
						[Op.ne]: null,
					},
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

module.exports = { get_or_insert_player, get_ranked_players, update_player_score, get_global_var,
	set_async_history_channel, set_race_history_channel, set_player_score_channel,
	set_multi_settings_channel };