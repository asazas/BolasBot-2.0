const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { exportar_resultados } = require('../otros/exportar_util');
const { validar_fecha } = require('../otros/fecha_util');
const tmp = require('tmp');
const { AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { DateTime } = require('luxon');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('exportar')
		.setDescription('Exporta resultados de carreras.')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

		.addStringOption(option =>
			option.setName('inicio')
				.setDescription('Fecha (dd/mm/aaaa), considerar carreras cerradas a partir de esta fecha. Por defecto: todas.'))

		.addStringOption(option =>
			option.setName('final')
				.setDescription('Fecha (dd/mm/aaaa), considerar carreras cerradas hasta esta fecha. Por defecto: hoy.'))

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

		.addIntegerOption(option =>
			option.setName('tipo')
				.setDescription('Tipos de carreras a exportar. Por defecto: todas.')
				.addChoices({ name: 'Todas', value: 2 },
					{ name: 'Asíncronas', value: 0 },
					{ name: 'Síncronas', value: 1 })),


	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}

		await interaction.deferReply();

		let inicio = interaction.options.getString('inicio');
		if (!inicio) {
			inicio = '0';
		}
		inicio = inicio.toLowerCase();
		let final = interaction.options.getString('final');
		if (!final) {
			final = 'hoy';
		}
		final = final.toLowerCase();
		let timezone = interaction.options.getString('zona_horaria');
		if (!timezone) {
			timezone = 'America/New_York';
		}
		let tipo = interaction.options.getInteger('tipo');
		if (!tipo) {
			tipo = 2;
		}

		const inicio_val = inicio === '0' ? DateTime.fromSeconds(0) : validar_fecha(inicio, timezone, true);
		const final_val = validar_fecha(final, timezone, true);

		const excel = await exportar_resultados(db, inicio_val, final_val.plus({ days: 1 }), tipo);

		const tmp_file = tmp.fileSync();
		await excel.xlsx.write(fs.createWriteStream(tmp_file.name));

		const attch = new AttachmentBuilder(tmp_file.name, { name: 'resultados.xlsx' });
		await interaction.editReply({ files: [attch] });

		tmp_file.removeCallback();
	},
};