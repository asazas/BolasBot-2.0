const { EmbedBuilder, ButtonInteraction } = require('discord.js');
const { reset_player_scores } = require('../datamgmt/db_utils');


/**
 * @summary Invocado cuando se confirma la acción del comando /resetear_puntos.
 *
 * @description Restablece las puntuaciones Elo de todos los jugadores a sus valores iniciales, y el número de
 * carreras disputadas a cero.
 *
 * @param {ButtonInteraction} interaction Interacción correspondiente al botón pulsado.
 * @param {Sequelize}         db          Base de datos del servidor en el que se ejecutó la acción.
 */
async function resetear_puntos_elo(interaction, db) {
	await reset_player_scores(db);
	const ans_embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setDescription('Se ha reseteado el ranking de jugadores.')
		.setTimestamp();
	await interaction.reply({ embeds: [ans_embed] });
}

module.exports = { resetear_puntos_elo };