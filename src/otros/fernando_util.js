const process = require('process');

const { MessageEmbed, MessageAttachment } = require('discord.js');

const util = require('util');
const exec = util.promisify(require('child_process').exec);


/**
 * @summary Invocado por el comando /fernando.
 *
 * @description Genera un embed con una imagen aleatoria de Fernando Almeida y una frase aleatoria generada
 * por el comando de consola "fortune es", si este programa está instalado.
 *
 * @returns {[MessageEmbed, MessageAttachment]} Un array con dos elementos: en la posición [0], un MessageEmbed
 * con la imagen y frase aleatorias; y en la posición [1], la imagen aleatoria de Fernando Almeida como
 * MessageAttachment.
 */
async function get_fernando_embed() {
	const image_name = `almeida${Math.floor(Math.random() * 11)}.png`;
	const image = new MessageAttachment(`res/almeida/${image_name}`);
	const ans = new MessageEmbed()
		.setColor('#0099ff')
		.setImage(`attachment://${image_name}`)
		.setTimestamp();

	const command = process.platform == 'win32' ? 'wsl fortune es' : '/usr/games/fortune es';
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