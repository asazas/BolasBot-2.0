const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { procesar_fecha } = require('../otros/fecha_util');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fecha')
		.setDescription('Convierte una fecha a formato de timestamp de Discord.')
		.addStringOption(option =>
			option.setName('fecha')
				.setDescription('Fecha en formato dd/mm/aaaa. Por defecto: hoy.'))
		.addStringOption(option =>
			option.setName('hora')
				.setDescription('Hora en formato hh:mm. Por defecto: hora actual.'))
		.addStringOption(option =>
			option.setName('zona_horaria')
				.setDescription('Zona horaria. Por defecto: EST/EDT')
				.addChoice('Nueva York (EST/EDT)', 'America/New_York')
				.addChoice('Madrid (CET/CEST)', 'Europe/Madrid')
				.addChoice('Lisboa (WET/WEST)', 'Europe/Lisbon')
				.addChoice('Chihuahua (MST/MDT)', 'America/Chihuahua')
				.addChoice('Ciudad de México (CST/CDT)', 'America/Mexico_City')
				.addChoice('Tijuana (PST/PDT)', 'America/Tijuana')
				.addChoice('Bogotá (EST)', 'America/Bogota')
				.addChoice('Santiago de Chile (CLT/CLST)', 'America/Santiago')
				.addChoice('Buenos Aires (ART)', 'America/Argentina/Buenos_Aires')
				.addChoice('Tokyo (JST)', 'Asia/Tokyo')),

	async execute(interaction) {
		let fecha = interaction.options.getString('fecha');
		if (!fecha) {
			fecha = 'hoy';
		}
		fecha = fecha.toLowerCase();
		let hora = interaction.options.getString('hora');
		if (!hora) {
			hora = 'ahora';
		}
		hora = hora.toUpperCase();
		let timezone = interaction.options.getString('zona_horaria');
		if (!timezone) {
			timezone = 'America/New_York';
		}
		const obj_fecha = procesar_fecha(fecha, hora, timezone);
		const tstamp = obj_fecha.toSeconds();
		const response_embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle(`<t:${tstamp}>`)
			.addField('Timestamp', `${tstamp}`)
			.setTimestamp();
		await interaction.reply({ embeds: [response_embed] });
	},
};