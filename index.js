const fs = require('fs');
// Require the necessary discord.js classes
const { Client, Collection, Intents } = require('discord.js');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { CronJob } = require('cron');
const { discordEmojiGuildId, discordToken, twitchClientId, twitchClientSecret } = require('./config.json');
const { get_data_models } = require('./src/datamgmt/setup');
const { announce_live_streams, streams_data, get_twitch_streams_info } = require('./src/streams/streams_util');
const { get_global_var } = require('./src/datamgmt/db_utils');
const { asignar_reaction_role, quitar_reaction_role } = require('./src/roles/roles_util');
const { initialize_code_emojis } = require('./src/seedgen/seedgen_util');

// Create a new Discord client instance
const discord_client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_TYPING],
	partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'],
});

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
const role_channels = {};

// When the client is ready, run this code (only once)
discord_client.once('ready', async () => {

	// initialize databases
	for (const guild_id of discord_client.guilds.cache.map(guild => guild.id)) {
		db[guild_id] = await get_data_models(guild_id);
		role_channels[guild_id] = (await get_global_var(db[guild_id])).ReactionRolesChannel;
	}

	// populate seed code emojis (if available)
	await initialize_code_emojis(discord_client, discordEmojiGuildId);

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

		// check para /roles crear categoria
		if (interaction.commandName == 'roles' && interaction.options.getSubcommandGroup() == 'crear'
			&& interaction.options.getSubcommand() == 'categoria') {
			role_channels[interaction.guildId] = (await get_global_var(db[interaction.guildId])).ReactionRolesChannel;
		}
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

// Código para reaction roles
discord_client.on('messageReactionAdd', async (reaction, user) => {
	// Ignorar reacciones del propio bot
	if (user.id == discord_client.user.id) {
		return;
	}
	// Ignorar reacciones que no son en canales de roles
	if (!Object.values(role_channels).includes(reaction.message.channelId)) {
		return;
	}

	if (reaction.partial) {
		try {
			await reaction.fetch();
		}
		catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			return;
		}
	}

	// Eliminar reacciones que no se corresponden con un rol
	if (reaction.count < 2) {
		await reaction.remove();
		return;
	}

	await asignar_reaction_role(db[reaction.message.guildId], reaction.message.guild, user, reaction.emoji);
});

discord_client.on('messageReactionRemove', async (reaction, user) => {
	// Ignorar reacciones del propio bot
	if (user.id == discord_client.user.id) {
		return;
	}
	// Ignorar reacciones que no son en canales de roles
	if (!Object.values(role_channels).includes(reaction.message.channelId)) {
		return;
	}

	if (reaction.partial) {
		try {
			await reaction.fetch();
		}
		catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			return;
		}
	}

	await quitar_reaction_role(db[reaction.message.guildId], reaction.message.guild, user, reaction.emoji);
});

// Login to Discord with your client's token
discord_client.login(discordToken);