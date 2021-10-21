const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { set_multi_settings_channel } = require('../datamgmt/db_utils');
const { crear_multiworld } = require('../archipelago/multi_utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('multiworld')
		.setDescription('Manejo de Archipelago Multiworld')
		.addSubcommand(subcommand =>
			subcommand.setName('yaml_channel')
				.setDescription('Establecer canal en el que leer los archivos YAML.'))

		.addSubcommand(subcommand =>
			subcommand.setName('crear')
				.setDescription('Generar una partida de Archipelago Multiworld')
				.addStringOption(option =>
					option.setName('nombre')
						.setDescription('Nombre de la sesión de multiworld.'))
				.addBooleanOption(option =>
					option.setName('spoiler')
						.setDescription('¿Hacer visibles los spoiler logs de las seeds?'))),


	async execute(interaction, db) {
		if (!interaction.inGuild()) {
			throw { 'message': 'Este comando no puede ser usado en mensajes directos.' };
		}

		if (interaction.options.getSubcommand() == 'yaml_channel') {
			await set_multi_settings_channel(db, interaction.channelId);
			const ans_embed = new MessageEmbed()
				.setColor('#0099ff')
				.setAuthor(interaction.client.user.username, interaction.client.user.avatarURL())
				.setDescription(`Fijado este canal (${interaction.channel}) para búsqueda de configuraciones YAML.`)
				.setTimestamp();
			await interaction.reply({ embeds: [ans_embed] });
			return;
		}
		else if (interaction.options.getSubcommand() == 'crear') {
			await crear_multiworld(interaction, db);
			return;
		}
	},
};