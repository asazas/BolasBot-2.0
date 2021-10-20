const fs = require('fs');
const { finished } = require('stream/promises');
const { MessageEmbed, MessageAttachment } = require('discord.js');
const gaxios = require('gaxios');
// problemas con multipart data en gaxios
const axios = require('axios');
const FormData = require('form-data');
const tmp = require('tmp');

const { get_global_var } = require('../datamgmt/db_utils');
const { random_words } = require('../racing/async_util');

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

async function crear_multiworld(interaction, db) {
	const global_var = await get_global_var(db);
	if (!global_var.MultiworldSettingsChannel) {
		throw { 'message': 'No hay un canal fijado para buscar ajustes de multiworld.' };
	}
	const yaml_channel = interaction.guild.channels.cache.get(`${global_var.MultiworldSettingsChannel}`);
	if (!yaml_channel) {
		throw { 'message': 'No hay un canal fijado para buscar ajustes de multiworld.' };
	}

	await interaction.deferReply();

	const messages = await yaml_channel.messages.fetch({ limit: 10 });
	for (const m of messages) {
		const content = m[1];
		if (content.attachments.size != 0 && content.attachments.first().contentType == 'application/zip') {
			const game = await get_multiworld_game(content.attachments.first(), interaction.options.getBoolean('spoiler'));

			if (game.status == 201) {
				let thread_name = interaction.options.getString('nombre');
				if (!thread_name) {
					thread_name = `${random_words[Math.floor(Math.random() * random_words.length)]}${random_words[Math.floor(Math.random() * random_words.length)]}`;
				}
				thread_name = thread_name.substring(0, 20);

				const multi_thread = await interaction.channel.threads.create({
					name: thread_name,
					autoArchiveDuration: 1440,
				});
				const thread_embed = new MessageEmbed()
					.setColor('#0099ff')
					.setTitle('Multiworld')
					.setURL(game.data.url)
					.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
					.addField('URL', game.data.url)
					.setTimestamp();
				const multi_msg = await multi_thread.send({ embeds: [thread_embed] });
				await multi_msg.pin();

				const main_embed = new MessageEmbed()
					.setColor('#0099ff')
					.setTitle('Éxito')
					.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
					.setDescription(`Nueva partida de multiworld iniciada en ${multi_thread}`)
					.setTimestamp();
				await interaction.editReply({ embeds: [main_embed] });
			}

			else {
				const image_name = `almeida${Math.floor(Math.random() * 4)}.png`;
				const image = new MessageAttachment(`res/${image_name}`);
				const embed = new MessageEmbed()
					.setColor('#0099ff')
					.setTitle('Error')
					.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
					.setDescription(`${game.status} ${game.statusText}`)
					.addField('Detalles', game.data.text)
					.setImage(`attachment://${image_name}`)
					.setTimestamp();

				await interaction.editReply({ embeds: [embed], files: [image] });
			}
			return;
		}
	}

	throw { 'message': 'No se ha subido recientemente un .zip en el canal de ajustes.' };
}

module.exports = { crear_multiworld };