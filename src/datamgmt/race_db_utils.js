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
				where: { Race: race },
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

async function set_all_ready_for_force_start(sequelize, race) {
	const race_results = sequelize.models.RaceResults;
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					Id: race,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
			const race_players = await race_results.findAndCountAll({
				where: { Race: race },
				transaction: t,
				lock: t.LOCK.UPDATE,
			});

			if (race_players.count < 2) {
				return -1;
			}
			if (my_race.Status != 0) {
				return -2;
			}

			await race_results.update({ Status: 1 }, {
				where: { Status: 0 },
				transaction: t,
			});

			return 0;
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
				where: { Race: race },
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
				where: { Race: race },
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

async function set_all_forfeit_for_force_end(sequelize, race) {
	const race_results = sequelize.models.RaceResults;
	const races = sequelize.models.Races;
	try {
		return await sequelize.transaction(async (t) => {
			const my_race = await races.findOne({
				where: {
					Id: race,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});

			if (my_race.Status != 1) {
				return -1;
			}

			await race_results.update({ Status: 2, Time: 359999 }, {
				where: { Status: 1 },
				transaction: t,
			});

			return 0;
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

async function set_player_undone(sequelize, race, player) {
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
			if (race_player.Status == 1) {
				return -4;
			}
			race_player.Status = 1;
			race_player.Time = null;
			await race_player.save({ transaction: t });
			return 0;
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

async function get_results_for_race(sequelize, race_channel) {
	const race_results = sequelize.models.RaceResults;
	try {
		return await sequelize.transaction(async (t) => {
			return await race_results.findAll({
				include: [
					{
						model: sequelize.models.Races,
						as: 'race',
						required: true,
						where: {
							RaceChannel: race_channel,
						},
					},
					{
						model: sequelize.models.Players,
						as: 'player',
						required: true,
					},
				],
				order: [
					['Time', 'ASC'],
				],
				transaction: t,
			});
		});
	}
	catch (error) {
		console.log(error['message']);
	}
}

module.exports = { insert_race, get_race_by_channel, get_or_insert_race_player,	delete_race_player_if_present,
	set_player_ready, set_all_ready_for_force_start, set_player_unready, set_race_started, set_player_done,
	set_player_forfeit, set_all_forfeit_for_force_end, set_race_finished, set_player_undone, get_results_for_race };