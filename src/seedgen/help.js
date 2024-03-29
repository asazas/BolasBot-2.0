const fs = require('fs');
const { EmbedBuilder, CommandInteraction } = require('discord.js');

const { preset_file } = require('./seedgen');

const extra_alttp = `**spoiler: **Hace que el spoiler log de la seed esté disponible.
**noqs: **Impide que se pueda activar quickswap. Esta opción no está disponible en modos mystery.
**pistas: **Las casillas telepáticas pueden dar pistas sobre localizaciones de ítems.
**ad: **All Dungeons, Ganon solo será vulnerable al completar todas las mazmorras del juego, incluyendo Torre de Agahnim.
**hard: **Cambia el item pool a hard, reduciendo el número máximo de corazones, espadas e ítems de seguridad.
**keys: **Habilita el modo Keysanity: llaves, mapas y brújulas estarán mezcladas en el pool general de ítems.
**botas: **Las Botas de Pegaso estarán equipadas al inicio de la partida.
**pseudobotas: **Se podrá correr desde el inicio de la partida como si se tuviesen las Botas de Pegaso, pero para desbloquear las localizaciones de ítems pertinentes, deberán obtenerse las verdaderas Botas de Pegaso.`;

const extra_sm = `**spoiler: **Hace que el spoiler log de la seed esté disponible.
**split: **Cambia el algoritmo de randomización a Major/Minor Split.
**hard: **Cambia a lógica de torneo.`;

const extra_smz3 = `**spoiler: **Hace que el spoiler log de la seed esté disponible.
**ad: **All Dungeons, requiere completar todas las mazmorras y vencer a todos los jefes para terminar.
**hard: **Establece la lógica de Super Metroid a Hard.
**keys: **Habilita el modo Keysanity.`;

const extra_varia = '**spoiler: **Permite que la seed pueda ser resuelta por el solucionador en la web de VARIA.';


/**
 * @summary Invocado con /seed ayuda presets.
 *
 * @description Contesta con información acerca del preset dado como parámetro. Si no se da un preset como
 * parámetro, devuelve una lista de presets disponibles.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 *
 * @returns {EmbedBuilder} Información sobre el preset, o lista de presets.
 */
function preset_help(interaction) {
	const preset = interaction.options.getString('preset');
	if (preset) {
		const file = preset_file(preset);
		if (file) {
			const content = JSON.parse(fs.readFileSync(file));
			return new EmbedBuilder()
				.setColor('#0099ff')
				.setTitle(content['goal_name'])
				.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
				.setDescription(content['description'])
				.setTimestamp();
		}
	}

	const categories = ['alttp', 'mystery', 'sm', 'smz3', 'varia'];
	const output = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle('Lista de presets')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.setTimestamp();

	for (const cat of categories) {
		const files = fs.readdirSync(`rando-settings/${cat}`);
		for (let i = 0; i < files.length; i++) {
			files[i] = files[i].slice(0, -5);
		}
		output.addFields([{ name: cat, value: files.join(', ') }]);
	}
	return output;
}


/**
 * @summary Invocado con /seed ayuda extra.
 *
 * @description Contesta con información acerca de las opciones extra disponibles para cada tipo de seed.
 *
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 *
 * @returns {EmbedBuilder} Información sobre las opciones extra disponibles.
 */
function extra_help(interaction) {
	return new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle('Opciones extra')
		.setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.avatarURL() })
		.addFields([
			{ name: 'ALTTP y Mystery', value: extra_alttp },
			{ name: 'SM', value: extra_sm },
			{ name: 'SMZ3', value: extra_smz3 },
			{ name: 'VARIA', value: extra_varia }])
		.setTimestamp();
}

module.exports = { preset_help, extra_help };