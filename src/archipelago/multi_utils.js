const fs = require('fs');
const { finished } = require('stream/promises');
const { MessageEmbed, MessageAttachment, CommandInteraction } = require('discord.js');
const { Sequelize } = require('sequelize');
const gaxios = require('gaxios');
// problemas con multipart data en gaxios
const axios = require('axios').default;
const FormData = require('form-data');
const tmp = require('tmp');

const { random_words } = require('../racing/async_util');


/**
 * @summary Función auxiliar para la comunicación con la API de Archipelago.
 *
 * @description Envía un .zip de ajustes de jugadores a Archipelado para la creación de una nueva partida de
 * multiworld.
 *
 * @param {MessageAttachment} attachment Archivo comprimido .zip que incluye los ajustes de cada jugador.
 * @param {boolean}           spoiler    Parámetro que decide si la partida se genera con acceso al log de
 *                                       spoiler (true) o no (false.)
 *
 * @returns {object} Objeto que contiene la respuesta de la API de Archipelago Multiworld. Campos importantes:
 * status (201 = OK, cualquier otro = error), statusText, data.url (URL de la partida generada), data.text (para
 * obtener detalles acerca de un error, si este ocurre.)
 */
async function get_multiworld_game(attachment, spoiler) {
	const zip_file = await gaxios.request({ url: attachment.url, responseType: 'stream', retry: true });

	const postfix = '.' + attachment.name.split('.').reverse()[0];
	const tmp_file = tmp.fileSync({ prefix: 'upload-', postfix: postfix });

	const stream = zip_file.data.pipe(fs.createWriteStream(tmp_file.name));
	await finished(stream);

	const form_data = new FormData();
	form_data.append('file', fs.createReadStream(tmp_file.name), tmp_file.name);
	if (spoiler) {
		form_data.append('race', 0);
	}
	else {
		form_data.append('race', 1);
	}

	const axios_opts = { headers: form_data.getHeaders() };
	let response = null;
	try {
		response = await axios.post('https://archipelago.gg/api/generate', form_data, axios_opts);
	}
	catch (error) {
		response = error.response;
	}
	tmp_file.removeCallback();
	return response;
}


/**
 * @summary Llamado por el comando /multiworld crear.
 *
 * @description Crea una nueva partida de Archipelago Multiworld: recibe como parámetro en el comando un archivo
 * comprimido .zip con los ajustes para cada jugador, genera una nueva partida usando la API de Archipelago, y
 * crea un nuevo hilo en el servidor de Discord para la partida.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function crear_multiworld(interaction, db) {
	if (interaction.channel.isThread()) {
		throw { 'message': 'Este comando no puede ser usado en hilos.' };
	}

	await interaction.deferReply();

	const zip_ajustes = interaction.options.getAttachment('ajustes');

	if (zip_ajustes.size == 0 || zip_ajustes.contentType != 'application/zip') {
		throw { 'message': 'El archivo adjunto no es un .zip de ajustes válido.' };
	}

	const game = await get_multiworld_game(zip_ajustes, interaction.options.getBoolean('spoiler'));

	if (game.status == 201) {

		const multi_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Multiworld')
			.setURL(game.data.url)
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.addField('URL', game.data.url)
			.setTimestamp();

		// comando en servidor -> crear nuevo hilo
		if (interaction.inGuild()) {
			let thread_name = interaction.options.getString('nombre');
			if (!thread_name) {
				thread_name = `${random_words[Math.floor(Math.random() * random_words.length)]}${random_words[Math.floor(Math.random() * random_words.length)]}`;
			}
			thread_name = thread_name.substring(0, 20);

			const multi_thread = await interaction.channel.threads.create({
				name: thread_name,
				autoArchiveDuration: 1440,
			});

			const multi_msg = await multi_thread.send({ embeds: [multi_embed] });
			await multi_msg.pin();

			const main_embed = new MessageEmbed()
				.setColor('#0099ff')
				.setTitle('Éxito')
				.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
				.setDescription(`Nueva partida de multiworld iniciada en ${multi_thread}`)
				.setTimestamp();
			await interaction.editReply({ embeds: [main_embed] });
		}

		// comando en DMs -> responder directamente con información de la partida
		else {
			await interaction.editReply({ embeds: [multi_embed] });
		}

	}

	else {
		const image_name = `almeida${Math.floor(Math.random() * 4)}.png`;
		const image = new MessageAttachment(`res/almeida/${image_name}`);
		const embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Error')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription(`${game.status} ${game.statusText}`)
			.addField('Detalles', game.data.text)
			.setImage(`attachment://${image_name}`)
			.setTimestamp();

		await interaction.editReply({ embeds: [embed], files: [image], ephemeral: true });
	}
}

module.exports = { crear_multiworld };