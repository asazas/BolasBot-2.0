const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { discordClientId, discordToken } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(discordToken);

rest.get(Routes.applicationCommands(discordClientId))
	.then(data => {
		const promises = [];
		for (const command of data) {
			const deleteUrl = `${Routes.applicationCommands(discordClientId)}/${command.id}`;
			promises.push(rest.delete(deleteUrl));
		}
		return Promise.all(promises);
	});