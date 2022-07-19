const { EmbedBuilder, CommandInteraction } = require('discord.js');
const { Sequelize } = require('sequelize');
const { get_command, create_command, delete_command } = require('../datamgmt/commands_db_utils');


/**
 * @summary Invocado por /roles crear categoria.
 *
 * @description Crea una nueva categoría para roles reaccionables.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function crear_comando(interaction, db) {
	const nombre_comando = interaction.options.getString('nombre');
	const comandos_globales = [...interaction.client.commands.keys()];
	if (comandos_globales.includes(nombre_comando.toLowerCase())) {
		throw { 'message': 'Ya existe un comando global con este nombre.' };
	}

	await interaction.deferReply();

	const texto_comando = interaction.options.getString('texto');
	const desc_comando = texto_comando.length < 80 ? texto_comando : texto_comando.substring(0, 90) + '...';

	const comando_en_db = await get_command(db, nombre_comando.toLowerCase());
	let nuevo_comando = null, embed_desc = null;
	if (!comando_en_db) {
		nuevo_comando = await interaction.guild.commands.create({ name: nombre_comando, description: desc_comando });
		embed_desc = `Creado el comando: \`/${nombre_comando}\`.`;
	}
	else {
		nuevo_comando = await interaction.guild.commands.edit(comando_en_db.CommandId, { name: nombre_comando, description: desc_comando });
		embed_desc = `Modificado el comando: \`/${nombre_comando}\`.`;
	}
	await create_command(db, nombre_comando.toLowerCase(), texto_comando, nuevo_comando.id);

	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(embed_desc)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado por /roles eliminar categoria.
 *
 * @description Elimina una categoría para roles reaccionables.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function eliminar_comando(interaction, db) {
	await interaction.deferReply();

	const nombre_comando = interaction.options.getString('nombre');
	const comando_en_db = await get_command(db, nombre_comando.toLowerCase());
	if (!comando_en_db) {
		throw { 'message': 'El comando indicado no existe.' };
	}

	await interaction.guild.commands.delete(comando_en_db.CommandId);
	await delete_command(db, nombre_comando.toLowerCase());

	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription(`Eliminado el comando: \`/${nombre_comando}\`.`)
		.setTimestamp();
	await interaction.editReply({ embeds: [ans_embed] });
}


/**
 * @summary Invocado al ejecutar un comando de texto específico de servidor.
 *
 * @description Responde a un comando de servidor con el texto correspondiente almacenado en base de datos.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {Sequelize}          db          Base de datos del servidor en el que se invocó el comando.
 */
async function responder_comando_de_servidor(interaction, db) {
	const nombre_comando = interaction.commandName;
	const comando_en_db = await get_command(db, nombre_comando.toLowerCase());
	if (!comando_en_db) {
		throw { 'message': 'El comando indicado no existe.' };
	}

	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTitle(nombre_comando)
		.setDescription(comando_en_db.Text)
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed] });
}


module.exports = { crear_comando, eliminar_comando, responder_comando_de_servidor };