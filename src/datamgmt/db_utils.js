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

async function insert_race(sequelize, name, creator, preset, seed_hash, seed_code, seed_url, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			return await races.create({
				Name: name,
				Creator: creator,
				CreationDate: Math.floor(new Date().getTime() / 1000),
				Preset: preset,
				SeedHash: seed_hash,
				SeedCode: seed_code,
				SeedUrl: seed_url,
				RaceChannel: race_channel,
			}, { transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_race_by_channel(sequelize, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			return await races.findOne({
				include: [
					{
						model: sequelize.models.Players,
						as: 'creator',
					},
				],
				where: {
					RaceChannel: race_channel,
				},
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_or_insert_race_player(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: { Id: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (my_race.Status != 0) return -1;

			const this_player = await race_results.findOrCreate({
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!this_player[1]) return -2;
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function delete_race_player_if_present(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 0) {
				return -3;
			}
			if (race_player.Status != 0) {
				return -2;
			}
			await race_player.destroy({ transaction: t });
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_player_ready(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 0) {
				return -3;
			}
			if (race_player.Status != 0) {
				return -2;
			}
			race_player.Status = 1;
			await race_player.save({ transaction: t });

			const all_player_count = await race_results.findAndCountAll({
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			let ready_player_count = 0;
			for (const p of all_player_count.rows) {
				if (p.Status == 1) ready_player_count += 1;
			}
			return { 'all': all_player_count.count, 'ready': ready_player_count };
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_player_unready(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 0) {
				return -3;
			}
			if (race_player.Status != 1) {
				return -2;
			}
			race_player.Status = 0;
			await race_player.save({ transaction: t });
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_race_started(sequelize, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					RaceChannel: race_channel,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			my_race.Status = 1;
			my_race.StartDate = Math.floor(new Date().getTime() / 1000) + 10;
			return await my_race.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_player_done(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 1) {
				return -3;
			}
			if (race_player.Status == 0) {
				return -2;
			}
			if (race_player.Status == 2) {
				return -4;
			}
			race_player.Status = 2;
			const new_time = Math.floor(new Date().getTime() / 1000) - race_player.race.StartDate;
			if (new_time <= 0) {
				return -5;
			}
			race_player.Time = new_time;
			const updated_res = await race_player.save({ transaction: t });

			const all_player_count = await race_results.findAndCountAll({
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			let done_player_count = 0;
			for (const p of all_player_count.rows) {
				if (p.Status == 2) done_player_count += 1;
			}
			return { 'result': updated_res, 'position': done_player_count, 'player_count': all_player_count.count };
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_player_forfeit(sequelize, race, player) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			const race_player = await race_results.findOne({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
					},
				],
				where: { Race: race, Player: player },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			if (!race_player) {
				return -1;
			}
			if (race_player.race.Status != 1) {
				return -3;
			}
			if (race_player.Status == 0) {
				return -2;
			}
			if (race_player.Status == 2) {
				return -4;
			}
			race_player.Status = 2;
			race_player.Time = 359999;
			const updated_res = await race_player.save({ transaction: t });

			const all_player_count = await race_results.findAndCountAll({
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			let done_player_count = 0;
			for (const p of all_player_count.rows) {
				if (p.Status == 2) done_player_count += 1;
			}
			return { 'result': updated_res, 'position': done_player_count, 'player_count': all_player_count.count };
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function set_race_finished(sequelize, race_channel) {
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					RaceChannel: race_channel,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			my_race.Status = 2;
			my_race.EndDate = Math.floor(new Date().getTime() / 1000);
			return await my_race.save({ transaction: t });
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

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

async function get_results_for_race(sequelize, submit_channel) {
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

module.exports = { get_or_insert_player, insert_race, get_race_by_channel, get_or_insert_race_player,
	delete_race_player_if_present, set_player_ready, set_player_unready, set_race_started, set_player_done,
	set_player_forfeit, set_race_finished, insert_async, get_active_async_races, search_async_by_name,
	get_async_by_submit, update_async_status, save_async_result, get_results_for_race, get_global_var,
	set_async_history_channel, set_multi_settings_channel };