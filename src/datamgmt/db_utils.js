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

module.exports = { get_or_insert_player, get_global_var, set_async_history_channel, set_race_history_channel,
	set_multi_settings_channel };