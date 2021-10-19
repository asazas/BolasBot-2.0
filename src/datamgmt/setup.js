const { Sequelize, DataTypes } = require('sequelize');

async function get_data_models(server) {
	const sequelize = new Sequelize({ dialect: 'sqlite', storage: `data/${server}.db`, define: { freezeTableName: true, timestamps: false } });

	sequelize.define('GlobalVar', {
		ServerId: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		AsyncHistoryChannel: {
			type: DataTypes.INTEGER,
		},
	});

	const players = sequelize.define('Players', {
		DiscordId: {
			type: DataTypes.INTEGER,
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
	});

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
			type: DataTypes.INTEGER,
		},
		StartDate: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		EndDate: {
			type: DataTypes.TEXT,
		},
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
			type: DataTypes.INTEGER,
		},
		SubmitChannel: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		ResultsChannel: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		ResultsMessage: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		SpoilersChannel: {
			type: DataTypes.INTEGER,
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
			type: DataTypes.INTEGER,
			unique: 'UniqueKey',
		},
		Player: {
			type: DataTypes.INTEGER,
			unique: 'UniqueKey',
		},
		Timestamp: {
			type: DataTypes.TEXT,
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

	const private_races = sequelize.define('PrivateRaces', {
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
			type: DataTypes.INTEGER,
		},
		StartDate: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 2,
				max: 3,
			},
			defaultValue: 3,
		},
		PrivateChannel: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
	});
	private_races.belongsTo(players, { as: 'creator', foreignKey: 'Creator', onDelete: 'SET NULL' });

	await sequelize.sync({ 'force': true });

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