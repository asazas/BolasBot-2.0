const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
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
				.addChoices({ name: 'Nueva York (EST/EDT)', value: 'America/New_York' },
					{ name: 'Madrid (CET/CEST)', value: 'Europe/Madrid' },
					{ name: 'Lisboa (WET/WEST)', value: 'Europe/Lisbon' },
					{ name: 'Chihuahua (MST/MDT)', value: 'America/Chihuahua' },
					{ name: 'Ciudad de México (CST/CDT)', value: 'America/Mexico_City' },
					{ name: 'Tijuana (PST/PDT)', value: 'America/Tijuana' },
					{ name: 'Bogotá (EST)', value: 'America/Bogota' },
					{ name: 'Santiago de Chile (CLT/CLST)', value: 'America/Santiago' },
					{ name: 'Buenos Aires (ART)', value: 'America/Argentina/Buenos_Aires' },
					{ name: 'Tokyo (JST)', value: 'Asia/Tokyo' })),

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
		const response_embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(`<t:${tstamp}>`)
			.addFields([{ name: 'Timestamp', value: `\`\`\`<t:${tstamp}>\`\`\`` }])
			.setTimestamp();
		await interaction.reply({ embeds: [response_embed] });
	},
};