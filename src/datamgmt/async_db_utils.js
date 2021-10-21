const { Op } = require('sequelize');

async function insert_async(sequelize, name, creator, preset, seed_hash, seed_code, seed_url,
	role_id, submit_channel, results_channel, results_message, spoilers_channel) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.create({
				Name: name,
				Creator: creator,
				StartDate: Math.floor(new Date().getTime() / 1000),
				Preset: preset,
				SeedHash: seed_hash,
				SeedCode: seed_code,
				SeedUrl: seed_url,
				RoleId: role_id,
				SubmitChannel: submit_channel,
				ResultsChannel: results_channel,
				ResultsMessage: results_message,
				SpoilersChannel: spoilers_channel,
			}, { transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_active_async_races(sequelize) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.findAll({
				where: {
					Status: {
						[Op.or]: [0, 1],
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

async function search_async_by_name(sequelize, name) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.findAll({
				where: {
					Name: {
						[Op.like]: name,
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

async function get_async_by_submit(sequelize, submit_channel) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_races.findOne({
				include: [
					{
						model: sequelize.models.Players,
						as: 'creator',
					},
				],
				where: {
					SubmitChannel: submit_channel,
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function update_async_status(sequelize, id, status) {
	const async_races = sequelize.models.AsyncRaces;
	try {
		return await sequelize.transaction(async (t) => {
			await async_races.findOne({
				where: {
					Id: id,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (status == 1) {
				return await async_races.update({
					Status: status,
					EndDate: Math.floor(new Date().getTime() / 1000),
				}, {
					where: {
						Id: id,
					},
					transaction: t,
				});
			}
			else {
				return await async_races.update({
					Status: status,
				}, {
					where: {
						Id: id,
					},
					transaction: t,
				});
			}
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function save_async_result(sequelize, race, player, time, collection_rate) {
	const async_results = sequelize.models.AsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.upsert({
				Race: race,
				Player: player,
				Timestamp: Math.floor(new Date().getTime() / 1000),
				Time: time,
				CollectionRate: collection_rate,
			}, {
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_results_for_async(sequelize, submit_channel) {
	const async_results = sequelize.models.AsyncResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await async_results.findAll({
				include: [
					{
						model: sequelize.models.AsyncRaces,
						as: 'race',
						required: true,
						where: {
							SubmitChannel: submit_channel,
						},
					},
					{
						model: sequelize.models.Players,
						as: 'player',
					},
				],
				order: [
					['Time', 'ASC'],
					['Timestamp', 'ASC'],
				],
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

module.exports = { insert_async, get_active_async_races, search_async_by_name, get_async_by_submit,
	update_async_status, save_async_result, get_results_for_async };