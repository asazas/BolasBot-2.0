const { Op } = require('sequelize');

async function set_stream_alerts_channel(sequelize, stream_channel) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ StreamAlertsChannel: stream_channel }, {
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

async function set_stream_alerts_role(sequelize, stream_role) {
	const global_var = sequelize.models.GlobalVar;
	try {
		return await sequelize.transaction(async (t) => {
			return await global_var.update({ StreamAlertsRole: stream_role }, {
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

async function register_stream(sequelize, owner, twitch_user) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.upsert({
				Owner: owner,
				TwitchUser: twitch_user,
			}, {
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function unregister_stream(sequelize, twitch_user) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.destroy(
				{
					where: {
						TwitchUser: twitch_user,
					},
				}, {
					transaction: t,
				});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_streams(sequelize) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			return await streams.findAll({
				include: [
					{
						model: sequelize.models.Players,
						as: 'owner',
					},
				],
				transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function update_stream_live(sequelize, twitch_user, status) {
	const streams = sequelize.models.Streams;
	try {
		return await sequelize.transaction(async (t) => {
			const stream = await streams.findOne({
				where: {
					TwitchUser: twitch_user,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			stream.Live = status;
			return await stream.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

module.exports = { set_stream_alerts_channel, set_stream_alerts_role, register_stream,
	unregister_stream, get_streams, update_stream_live };