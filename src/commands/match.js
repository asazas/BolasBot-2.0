const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { procesar_fecha } = require('../otros/fecha_util');
const { sreServer, sreMatchChannel } = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('match')
		.setDescription('Programa una carrera de torneo.')
		.setDMPermission(false)
		.addUserOption(option =>
			option.setName('jugador1')
				.setDescription('@ del primer jugador.')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('jugador2')
				.setDescription('@ del segundo jugador.')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('fecha')
				.setDescription('Fecha en formato dd/mm/aaaa.')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('hora')
				.setDescription('Hora en formato hh:mm.')
				.setRequired(true))
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
					{ name: 'Tokyo (JST)', value: 'Asia/Tokyo' }))
		.addStringOption(option =>
			option.setName('info')
				.setDescription('Descripción o información adicional que se desee proporcionar.')),

	async execute(interaction) {
		if (interaction.guildId != sreServer) {
			throw { 'message': 'Este comando no puede utilizarse en este servidor de Discord.' };
		}

		await interaction.deferReply();

		const p1 = interaction.options.getUser('jugador1');
		const p2 = interaction.options.getUser('jugador2');
		const desc = interaction.options.getString('info');

		let fecha = interaction.options.getString('fecha');
		fecha = fecha.toLowerCase();
		let hora = interaction.options.getString('hora');
		hora = hora.toUpperCase();
		let timezone = interaction.options.getString('zona_horaria');
		if (!timezone) {
			timezone = 'America/New_York';
		}
		const obj_fecha = procesar_fecha(fecha, hora, timezone);
		const tstamp = obj_fecha.toSeconds();

		const announce_embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(`${p1.username} vs. ${p2.username}`)
			.addFields(
				{ name: 'Jugador 1', value: `${p1}`, inline: true },
				{ name: 'Jugador 2', value: `${p2}`, inline: true },
				{ name: 'Fecha', value: `<t:${tstamp}> (<t:${tstamp}:R>)` },
			)
			.setTimestamp();
		if (desc) {
			announce_embed.addFields({ name: 'Notas', value: `${desc}` });
		}
		const announce_channel = await interaction.guild.channels.fetch(`${sreMatchChannel}`);
		const announce_msg = await announce_channel.send({ embeds: [announce_embed] });
		await announce_msg.react('🎙️');

		const response_embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
			.setDescription('Se ha programado la carrera.')
			.setTimestamp();
		await interaction.editReply({ embeds: [response_embed] });
	},
};