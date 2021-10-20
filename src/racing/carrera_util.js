const { MessageEmbed } = require('discord.js');

const { get_or_insert_player, insert_race, get_race_by_submit } = require('../datamgmt/db_utils');
const { random_words } = require('./async_util');
const { seed_in_create_race } = require('./race_seed_util');

async function get_race_data_embed(db, race_channel) {
	const my_race = await get_race_by_submit(db, race_channel);

	const data_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(`Carrera: ${my_race.Name}`)
		.addField('Creador', my_race.creator.Name)
		.addField('Fecha de inicio (UTC)', `<t:${my_race.StartDate}>`)
		.setTimestamp();
	if (my_race.EndDate) {
		data_embed.addField('Fecha de cierre (UTC)', `<t:${my_race.EndDate}>`);
	}
	if (my_race.Preset) {
		data_embed.addField('Descripción', my_race.Preset);
	}
	if (my_race.SeedUrl) {
		data_embed.addField('Seed', my_race.SeedUrl);
	}
	if (my_race.SeedCode) {
		data_embed.addField('Hash', my_race.SeedCode);
	}
	return data_embed;
}

async function carrera_crear(interaction, db) {
	await interaction.deferReply();

	// Nombre de la carrera
	let name = interaction.options.getString('nombre');
	if (!name) {
		name = `${random_words[Math.floor(Math.random() * random_words.length)]}${random_words[Math.floor(Math.random() * random_words.length)]}`;
	}
	name = name.substring(0, 20);

	// Crear o recuperar seed
	const seed_details = await seed_in_create_race(interaction);
	const full_preset = seed_details['full_preset'];
	const seed_info = seed_details['seed_info'];

	// Crear hilo para la carrera
	const race_channel = await interaction.channel.threads.create({
		name: name,
		autoArchiveDuration: 1440,
	});

	const creator = interaction.user;
	await get_or_insert_player(db, creator.id, creator.username, creator.discriminator, `${creator}`);
	await insert_race(db, name, creator.id, full_preset, seed_info ? seed_info['hash'] : null, seed_info ? seed_info['code'] : null,
		seed_info ? seed_info['url'] : null, race_channel.id);

	const async_data = await get_race_data_embed(db, race_channel.id);
	let data_msg = null;
	if (seed_info && seed_info['spoiler_attachment']) {
		data_msg = await race_channel.send({ embeds: [async_data], files: [seed_info['spoiler_attachment']] });
	}
	else {
		data_msg = await race_channel.send({ embeds: [async_data] });
	}
	await data_msg.pin();

	const text_ans = new MessageEmbed()
		.setColor('#0099ff')
		.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
		.setDescription(`Abierta carrera asíncrona con nombre: ${name}. Participa en ${race_channel}.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [text_ans] });
}

module.exports = { carrera_crear };