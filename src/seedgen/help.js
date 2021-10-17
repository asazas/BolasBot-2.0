const fs = require('fs');
const { MessageEmbed } = require('discord.js');

const { preset_file } = require('./seedgen');

function preset_help(interaction) {
	const preset = interaction.options.getString('preset');
	if (preset) {
		const file = preset_file(preset);
		if (file) {
			const content = JSON.parse(fs.readFileSync(file));
			return new MessageEmbed()
				.setColor('#0099ff')
				.setTitle(content['goal_name'])
				.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
				.setDescription(content['description'])
				.setTimestamp();
		}
	}

	const categories = ['alttp', 'mystery', 'sm', 'smz3', 'varia'];
	const output = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle('Lista de presets')
		.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
		.setTimestamp();

	for (const cat of categories) {
		const files = fs.readdirSync(`rando-settings/${cat}`);
		for (let i = 0; i < files.length; i++) {
			files[i] = files[i].slice(0, -5);
		}
		output.addField(cat, files.join(', '));
	}
	return output;
}

module.exports = { preset_help };