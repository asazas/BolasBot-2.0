const fs = require('fs');
// Require the necessary discord.js classes
const { Client, Collection, Intents } = require('discord.js');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { CronJob } = require('cron');
const { discordToken, twitchClientId, twitchClientSecret } = require('./config.json');
const { get_data_models } = require('./src/datamgmt/setup');
const { announce_live_streams, streams_data, get_twitch_streams_info } = require('./src/streams/streams_util');

// Create a new Discord client instance
const discord_client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.DIRECT_MESSAGES,
	Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_TYPING] });

discord_client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./src/commands/${file}`);
	discord_client.commands.set(command.data.name, command);
}

// Prepare Twitch client
const twitch_auth_provider = new ClientCredentialsAuthProvider(twitchClientId, twitchClientSecret);
const twitch_api_client = new ApiClient({ authProvider: twitch_auth_provider });

const db = {};

// When the client is ready, run this code (only once)
discord_client.once('ready', async () => {

	// initialize databases
	for (const guild_id of discord_client.guilds.cache.map(guild => guild.id)) {
		db[guild_id] = await get_data_models(guild_id);
	}

	// schedule stream alerts
	const job = new CronJob('0 */12 * * * *', async function() {
		try {
			let all_streams = {};
			const guild_streams_list = [];
			for (const my_guild of discord_client.guilds.cache.map(guild => guild)) {
				const my_guild_streams = await streams_data(db[my_guild.id]);
				if (Object.entries(my_guild_streams).length > 0) {
					all_streams = { ...all_streams, ...my_guild_streams };
					guild_streams_list.push([my_guild, my_guild_streams]);
				}
			}
			if (Object.entries(all_streams).length === 0) return;
			const twitch_info = await get_twitch_streams_info(Object.keys(all_streams), twitch_api_client);
			for (const [my_guild, my_guild_streams] of guild_streams_list) {
				await announce_live_streams(my_guild, my_guild_streams, db[my_guild.id], twitch_info);
			}
		}
		catch (error) {
			console.log(error);
		}
	});
	job.start();

	console.log(`Ready! Logged in as ${discord_client.user.tag}`);
});

discord_client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = discord_client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction, db[interaction.guildId]);
	}
	catch (error) {
		console.error(error);
		const image_path = `res/almeida${Math.floor(Math.random() * 4)}.png`;
		if (interaction.deferred || interaction.replied) {
			return await interaction.editReply({ content: error['message'], files: [image_path], ephemeral: true });
		}
		else {
			return await interaction.reply({ content: error['message'], files: [image_path], ephemeral: true });
		}
	}
});

// Login to Discord with your client's token
discord_client.login(discordToken);