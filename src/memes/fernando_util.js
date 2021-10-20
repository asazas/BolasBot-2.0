const process = require('process');

const { MessageEmbed, MessageAttachment } = require('discord.js');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function get_fernando_embed() {
	const image_name = `almeida${Math.floor(Math.random() * 10)}.png`;
	const image = new MessageAttachment(`res/${image_name}`);
	const ans = new MessageEmbed()
		.setColor('#0099ff')
		.setImage(`attachment://${image_name}`)
		.setTimestamp();

	const command = process.platform == 'win32' ? 'wsl fortune es' : 'fortune es';
	try {
		const output = await exec(command);
		let stdout = output['stdout'];
		stdout = stdout.replaceAll('\n', ' ').replace('\t\t', '\n').replaceAll('\t\t', '');
		ans.setDescription(stdout);
	}
	catch (error) {
		console.log(error);
	}
	return [ans, image];
}

module.exports = { get_fernando_embed };