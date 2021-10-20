const { MessageEmbed } = require('discord.js');

const { get_or_insert_player, insert_race, get_race_by_channel, delete_race_player_if_present, get_or_insert_race_player, set_player_ready, set_player_unready } = require('../datamgmt/db_utils');
const { random_words } = require('./async_util');
const { seed_in_create_race } = require('./race_seed_util');

async function get_race_data_embed(db, race_channel) {
	const my_race = await get_race_by_channel(db, race_channel);

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

async function carrera_entrar(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const race_player = await get_or_insert_race_player(db, race.Id, interaction.user.id);
	let text_ans = null;
	if (race_player[1]) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} se ha unido a la carrera.`)
			.setTimestamp();
	}
	else {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} ya está en la carrera.`)
			.setTimestamp();
	}
	await interaction.reply({ embeds: [text_ans] });
}

async function carrera_salir(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const delete_code = await delete_race_player_if_present(db, race.Id, interaction.user.id);

	let text_ans = null;
	if (delete_code == -1) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está en la carrera.`)
			.setTimestamp();
	}
	else if (delete_code == -2) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no puede salir de la carrera si está listo para comenzar.`)
			.setTimestamp();
	}
	else {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} ha salido de la carrera.`)
			.setTimestamp();
	}
	await interaction.reply({ embeds: [text_ans] });
}

async function carrera_listo(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const ready_code = await set_player_ready(db, race.Id, interaction.user.id);

	let text_ans = null;
	if (ready_code == -1) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está en la carrera.`)
			.setTimestamp();
	}
	else if (ready_code == -2) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} ya está listo.`)
			.setTimestamp();
	}
	else {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} está listo para empezar. Quedan ${ready_code['all'] - ready_code['ready']} participantes.`)
			.setTimestamp();
	}
	await interaction.reply({ embeds: [text_ans] });

	if (ready_code['all'] >= 2 && ready_code['ready'] == 0) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription('Todos los jugadores están listos. Iniciando cuenta atrás. ¡Buena suerte!')
			.setTimestamp();
		await interaction.editReply({ embeds: [text_ans] });
	}
}

async function carrera_no_listo(interaction, db) {
	const race = await get_race_by_channel(db, interaction.channelId);
	if (!race) {
		throw { 'message': 'Este comando solo puede ser usado en canales de carreras.' };
	}

	await get_or_insert_player(db, interaction.user.id, interaction.user.username, interaction.user.discriminator, `${interaction.user}`);
	const delete_code = await set_player_unready(db, race.Id, interaction.user.id);

	let text_ans = null;
	if (delete_code == -1) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está en la carrera.`)
			.setTimestamp();
	}
	else if (delete_code == -2) {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} aún no está listo.`)
			.setTimestamp();
	}
	else {
		text_ans = new MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
			.setDescription(`${interaction.user} no está listo.`)
			.setTimestamp();
	}
	await interaction.reply({ embeds: [text_ans] });
}

module.exports = { carrera_crear, carrera_entrar, carrera_salir, carrera_listo, carrera_no_listo };