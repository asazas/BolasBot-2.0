const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { discordClientId, discordGuildId, discordToken } = require('./config.json');

const rest = new REST({ version: '9' }).setToken(discordToken);

rest.get(Routes.applicationGuildCommands(discordClientId, discordGuildId))
	.then(data => {
		const promises = [];
		for (const command of data) {
			const deleteUrl = `${Routes.applicationGuildCommands(discordClientId, discordGuildId)}/${command.id}`;
			promises.push(rest.delete(deleteUrl));
		}
		return Promise.all(promises);
	});