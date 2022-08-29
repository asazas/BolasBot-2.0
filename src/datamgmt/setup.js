const { Sequelize, DataTypes } = require('sequelize');


/**
 * @summary Llamado en la rutina de inicialización del bot, una vez por cada servidor en el que este se encuentre.
 *
 * @description Inicializa la base de datos SQLite para cada uno de los servidores en los que está el bot:
 * incluye todas las definiciones de tablas y la creación del archivo de base de datos si este no existe.
 *
 * @param {string}  server     ID del servidor para el que se inicializa la base de datos.
 * @param {boolean} db_logging Establece si se registran todas las operaciones hechas en base de datos a la consola.
 *
 * @returns {Sequelize} Objeto Sequelize correspondiente a la base de datos inicializada del servidor.
 */
async function get_data_models(server, db_logging) {
	const sequelize = new Sequelize({ dialect: 'sqlite', storage: `data/${server}.db`, logging: db_logging, define: { freezeTableName: true, timestamps: false } });

	sequelize.define('GlobalVar', {
		ServerId: {
			type: DataTypes.TEXT,
			primaryKey: true,
		},
		AsyncSubmitCategory: {
			type: DataTypes.TEXT,
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
		StreamAlertsChannel: {
			type: DataTypes.TEXT,
		},
		StreamAlertsRole: {
			type: DataTypes.TEXT,
		},
		ReactionRolesChannel: {
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
		Banned: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	});

	const streams = sequelize.define('Streams', {
		Id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		Owner: {
			type: DataTypes.TEXT,
		},
		TwitchUser: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		Live: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	});
	streams.belongsTo(players, { as: 'owner', foreignKey: 'Owner', onDelete: 'CASCADE' });

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
		Label: {
			type: DataTypes.TEXT,
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
		Ranked: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
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
		Label: {
			type: DataTypes.TEXT,
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
		Ranked: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
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
			// allowNull: false,
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

	const reaction_role_categories = sequelize.define('ReactionRoleCategories', {
		Name: {
			type: DataTypes.TEXT,
			primaryKey: true,
		},
		Message: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
	});

	const reaction_roles = sequelize.define('ReactionRoles', {
		Id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		RoleName: {
			type: DataTypes.TEXT,
			unique: true,
		},
		RoleId: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		Description: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		EmojiId: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		EmojiName: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		Category: {
			type: DataTypes.TEXT,
		},
	});
	reaction_roles.belongsTo(reaction_role_categories, { as: 'category', foreignKey: 'Category', onDelete: 'CASCADE' });

	sequelize.define('Comandos', {
		Name: {
			type: DataTypes.TEXT,
			primaryKey: true,
		},
		Text: {
			type: DataTypes.TEXT,
		},
		CommandId: {
			type: DataTypes.TEXT,
			unique: true,
		},
	});

	await sequelize.sync();

	await sequelize.transaction(async (t) => {
		try {
			return await sequelize.models.GlobalVar.findOrCreate({
				where: {
					ServerId: server,
				},
				transaction: t,
				lock: t.LOCK.UPDATE,
			});
		}
		catch (error) {
			console.log(error['message']);
		}
	});

	return sequelize;
}

module.exports = { get_data_models };