const { Sequelize, DataTypes } = require('sequelize');

async function get_data_models(server) {
	const sequelize = new Sequelize({ dialect: 'sqlite', storage: `data/${server}.db`, define: { freezeTableName: true, timestamps: false } });

	sequelize.define('GlobalVar', {
		ServerId: {
			type: DataTypes.TEXT,
			primaryKey: true,
		},
		RaceHistoryChannel: {
			type: DataTypes.TEXT,
		},
		AsyncHistoryChannel: {
			type: DataTypes.TEXT,
		},
		PlayerScoreChannel: {
			type: DataTypes.TEXT,
		},
		MultiworldSettingsChannel: {
			type: DataTypes.TEXT,
		},
	});

	const players = sequelize.define('Players', {
		DiscordId: {
			type: DataTypes.TEXT,
			primaryKey: true,
		},
		Name: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Discriminator: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Mention: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Score: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1500,
		},
		Races: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
	});

	const races = sequelize.define('Races', {
		Id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		Name: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Creator: {
			type: DataTypes.TEXT,
		},
		CreationDate: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		StartDate: {
			type: DataTypes.INTEGER,
		},
		EndDate: {
			type: DataTypes.INTEGER,
		},
		// 0: abierta, 1: en curso, 2: terminada
		Status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 0,
				max: 2,
			},
			defaultValue: 0,
		},
		Preset: {
			type: DataTypes.TEXT,
		},
		SeedHash: {
			type: DataTypes.TEXT,
		},
		SeedCode: {
			type: DataTypes.TEXT,
		},
		SeedUrl: {
			type: DataTypes.TEXT,
		},
		RaceChannel: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
	});
	races.belongsTo(players, { as: 'creator', foreignKey: 'Creator', onDelete: 'SET NULL' });

	const race_results = sequelize.define('RaceResults', {
		Id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		Race: {
			type: DataTypes.TEXT,
			unique: 'UniqueKey',
		},
		Player: {
			type: DataTypes.TEXT,
			unique: 'UniqueKey',
		},
		Timestamp: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		// 0: unido, 1: listo, 2: terminado
		Status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 0,
				max: 2,
			},
			defaultValue: 0,
		},
		Time: {
			type: DataTypes.INTEGER,
		},
	});
	race_results.belongsTo(races, { as: 'race', foreignKey: 'Race', onDelete: 'SET NULL' });
	race_results.belongsTo(players, { as: 'player', foreignKey: 'Player', onDelete: 'SET NULL' });

	const async_races = sequelize.define('AsyncRaces', {
		Id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		Name: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Creator: {
			type: DataTypes.TEXT,
		},
		StartDate: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		EndDate: {
			type: DataTypes.INTEGER,
		},
		// 0: abierta, 1: cerrada, 2: purgada
		Status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 0,
				max: 2,
			},
			defaultValue: 0,
		},
		Preset: {
			type: DataTypes.TEXT,
		},
		SeedHash: {
			type: DataTypes.TEXT,
		},
		SeedCode: {
			type: DataTypes.TEXT,
		},
		SeedUrl: {
			type: DataTypes.TEXT,
		},
		RoleId: {
			type: DataTypes.TEXT,
		},
		SubmitChannel: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		ResultsChannel: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		ResultsMessage: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		SpoilersChannel: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
	});
	async_races.belongsTo(players, { as: 'creator', foreignKey: 'Creator', onDelete: 'SET NULL' });

	const async_results = sequelize.define('AsyncResults', {
		Id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		Race: {
			type: DataTypes.TEXT,
			unique: 'UniqueKey',
		},
		Player: {
			type: DataTypes.TEXT,
			unique: 'UniqueKey',
		},
		Timestamp: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		Time: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 359999,
		},
		CollectionRate: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
	});
	async_results.belongsTo(async_races, { as: 'race', foreignKey: 'Race', onDelete: 'SET NULL' });
	async_results.belongsTo(players, { as: 'player', foreignKey: 'Player', onDelete: 'SET NULL' });

	// SYNC PARA DEBUG
	// await sequelize.sync({ force: true });

	await sequelize.sync();

	await sequelize.transaction(async (t) => {
		try {
			return await sequelize.models.GlobalVar.create({ ServerId: server }, { transaction: t });
		}
		catch (error) {
			console.log(error['message']);
		}
	});

	return sequelize;
}

module.exports = { get_data_models };