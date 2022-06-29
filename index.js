const fs = require('fs');
const glob = require('glob');
const path = require('path');
// Require the necessary discord.js classes
const { Client, Collection, Intents } = require('discord.js');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { CronJob } = require('cron');
const { discordEmojiGuildId, discordToken, twitchClientId, twitchClientSecret } = require('./config.json');
const { get_data_models } = require('./src/datamgmt/setup');
const { comprueba_streams } = require('./src/streams/streams_util');
const { get_global_var } = require('./src/datamgmt/db_utils');
const { asignar_reaction_role, quitar_reaction_role } = require('./src/roles/roles_util');
const { initialize_code_emojis } = require('./src/seedgen/seedgen_util');
const { responder_comando_de_servidor } = require('./src/otros/comandos_util');

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

// Registrar presets de BolasBot (clasificarlos por randomizers para sugerencias de opciones extra)
const all_extra = ['spoiler', 'noqs', 'pistas', 'ad', 'hard', 'keys', 'botas', 'split'];
const alttp_extra = ['spoiler', 'noqs', 'pistas', 'ad', 'hard', 'keys', 'botas'];
const presets_alttp = [];
for (const file of glob.sync('rando-settings/alttp/*.json')) {
	presets_alttp.push(path.basename(file, '.json'));
}
const presets_mystery = [];
for (const file of glob.sync('rando-settings/mystery/*.json')) {
	presets_mystery.push(path.basename(file, '.json'));
}
const sm_extra = ['spoiler', 'split', 'hard'];
const presets_sm = [];
for (const file of glob.sync('rando-settings/sm/*.json')) {
	presets_sm.push(path.basename(file, '.json'));
}
const smz3_extra = ['spoiler', 'ad', 'hard', 'keys'];
const presets_smz3 = [];
for (const file of glob.sync('rando-settings/smz3/*.json')) {
	presets_smz3.push(path.basename(file, '.json'));
}
const varia_extra = ['spoiler'];
const presets_varia = [];
for (const file of glob.sync('rando-settings/varia/*.json')) {
	presets_varia.push(path.basename(file, '.json'));
}

// Preparar cliente de Twitch (si se proporcionan credenciales)
let twitch_api_client = null;
if (twitchClientId && twitchClientSecret) {
	twitch_api_client = new ApiClient({ authProvider: new ClientCredentialsAuthProvider(twitchClientId, twitchClientSecret) });
}

const db = {};
const role_channels = {};


/**
 * Código a ejecutar cuando el bot esté listo tras arrancarlo, solo una vez.
 */
discord_client.once('ready', async () => {

	// initialize databases
	for (const guild_id of discord_client.guilds.cache.map(guild => guild.id)) {
		db[guild_id] = await get_data_models(guild_id);
		role_channels[guild_id] = (await get_global_var(db[guild_id])).ReactionRolesChannel;
	}

	// populate seed code emojis (if available)
	await initialize_code_emojis(discord_client, discordEmojiGuildId);

	// schedule stream alerts, if twitch client is available
	if (twitch_api_client) {
		const job = new CronJob('0 */12 * * * *', async function() {
			comprueba_streams(discord_client, twitch_api_client, db);
		});
		job.start();
	}

	console.log(`Ready! Logged in as ${discord_client.user.tag}`);
});


/**
 * Código de respuesta a interacciones.
 *
 * Si la interacción es autocompletado (para opciones extra en seeds), presentar sugerencias.
 * Si la interacción es un comando, ejecutarlo.
 */
discord_client.on('interactionCreate', async interaction => {

	if (interaction.isAutocomplete()) {
		const archivo = interaction.options.getAttachment('archivo');
		const url = interaction.options.getString('url');
		if (archivo != null || url != null) {
			return interaction.respond(all_extra.map((el) => ({ name: el, value: el })));
		}
		const preset = interaction.options.getString('preset');
		if (presets_alttp.includes(preset) || presets_mystery.includes(preset)) {
			return interaction.respond(alttp_extra.map((el) => ({ name: el, value: el })));
		}
		if (presets_sm.includes(preset)) {
			return interaction.respond(sm_extra.map((el) => ({ name: el, value: el })));
		}
		if (presets_smz3.includes(preset)) {
			return interaction.respond(smz3_extra.map((el) => ({ name: el, value: el })));
		}
		if (presets_varia.includes(preset)) {
			return interaction.respond(varia_extra.map((el) => ({ name: el, value: el })));
		}
		return interaction.respond(all_extra.map((el) => ({ name: el, value: el })));
	}

	if (!interaction.isCommand()) return;

	const command = discord_client.commands.get(interaction.commandName);

	if (!command) {
		return await responder_comando_de_servidor(interaction, db[interaction.guildId]);
	}

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
		const image_path = `res/almeida/almeida${Math.floor(Math.random() * 4)}.png`;
		if (interaction.deferred || interaction.replied) {
			return await interaction.editReply({ content: error['message'], files: [image_path], ephemeral: true });
		}
		else {
			return await interaction.reply({ content: error['message'], files: [image_path], ephemeral: true });
		}
	}
});


/**
 * Reacción a evento de añadir una reacción de un mensaje.
 *
 * Si es un mensaje de un canal de roles, añadir el rol correspondiente al usuario.
 */
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


/**
 * Reacción a evento de retirar una reacción de un mensaje.
 *
 * Si es un mensaje de un canal de roles, retirar el rol correspondiente al usuario.
 */
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