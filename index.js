const fs = require('fs');
// Require the necessary discord.js classes
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const { get_data_models } = require('./src/datamgmt/setup');
const { get_or_insert_player, insert_async, get_active_async_races, get_async_by_submit, update_async_status, save_async_result } = require('./src/datamgmt/db_utils');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.DIRECT_MESSAGES,
	Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_TYPING] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./src/commands/${file}`);
	client.commands.set(command.data.name, command);
}

const db = {};

// When the client is ready, run this code (only once)
client.once('ready', async () => {

	// initialize databases
	for (const guild_id of client.guilds.cache.map(guild => guild.id)) {
		db[guild_id] = await get_data_models(guild_id);
	}
	db['test'] = await get_data_models('test');
	const p = await get_or_insert_player(db['test'], 1, 'a', 'b', 'c');
	const [q, _] = await get_or_insert_player(db['test'], 1);
	const r = await get_or_insert_player(db['test'], 2);
	await insert_async(db['test'], 'a', 1, 'b', 'c', 'd', 'e', 2, 3, 4, 5, 6);
	const a = await get_active_async_races(db['test']);
	const b = await get_async_by_submit(db['test'], 3);
	const c = await update_async_status(db['test'], 1, 1);
	const d = await save_async_result(db['test'], 1, 1, 1234, 432);
	const e = await save_async_result(db['test'], 1, 1, 4321, 234);
	console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		const image_path = `res/almeida${Math.floor(Math.random() * 4)}.png`;
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({ content: error['message'], files: [image_path] });
		}
		else {
			return interaction.reply({ content: error['message'], files: [image_path] });
		}
	}
});

// Login to Discord with your client's token
client.login(token);