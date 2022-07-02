const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { discordClientId, discordGuildId, discordToken } = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./src/commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(discordToken);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationGuildCommands(discordClientId, discordGuildId),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');
	}
	catch (error) {
		console.error(error);
	}
})();