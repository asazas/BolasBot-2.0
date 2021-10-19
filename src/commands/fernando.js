const process = require('process');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageAttachment } = require('discord.js');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fernando')
		.setDescription('Perla de sabiduría de Fernando Almeida'),

	async execute(interaction) {
		await interaction.deferReply();
		const image_name = `almeida${Math.floor(Math.random() * 10)}.png`;
		const image = new MessageAttachment(`res/${image_name}`);
		const ans = new MessageEmbed()
			.setColor('#0099ff')
			.setImage(`attachment://${image_name}`)
			.setTimestamp();

		const command = process.platform == 'win32' ? 'wsl fortune es' : 'fortune es';
		try {
			const output = await exec(command);
			ans.setDescription(output['stdout']);
		}
		catch (error) {
			console.log(error);
		}
		finally {
			await interaction.editReply({ embeds: [ans], files: [image] });
		}
	},
};