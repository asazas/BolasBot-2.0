const { ThreadChannel, CommandInteraction } = require("discord.js");


/**
 * @summary Invocado cuando comienza una carrera síncrona.
 * 
 * @description Ejecuta una cuenta atrás en el hilo correspondiente a la carrera síncrona que empieza.
 * 
 * @param {ThreadChannel} canal  Canal de la carrera.
 * @param {number}        tiempo Valor desde el que iniciar la cuenta atrás.
 */
async function countdown_en_canal(canal, tiempo) {
	if (tiempo < 1 || tiempo > 10) {
		tiempo = 10;
	}
	let msg = null;
	if (tiempo > 5) {
		msg = await canal.send(`${tiempo}...`);
		await new Promise(r => setTimeout(r, 1000 * (tiempo - 5)));
		tiempo = 5;
	}
	else {
		msg = await canal.send(tiempo.toString());
	}
	for (let i = tiempo - 1; i > 0; i--) {
		await new Promise(r => setTimeout(r, 1000));
		msg.edit(i.toString());
	}
	await new Promise(r => setTimeout(r, 1000));
	msg.edit('GO!');
}


/**
 * @summary Invocado por el comando /countdown.
 * 
 * @description Ejecuta una cuenta atrás en el canal donde se invocó el comando /countdown.
 * 
 * @param {CommandInteraction} interaction Interacción correspondiente al comando invocado.
 * @param {number}             tiempo      Valor desde el que iniciar la cuenta atrás.
 */
async function countdown_interaction(interaction, tiempo) {
	if (tiempo < 1 || tiempo > 10) {
		tiempo = 10;
	}
	if (tiempo > 5) {
		interaction.reply(`${tiempo}...`);
		await new Promise(r => setTimeout(r, 1000 * (tiempo - 5)));
		tiempo = 5;
	}
	else {
		await interaction.reply(tiempo.toString());
	}
	for (let i = tiempo - 1; i > 0; i--) {
		await new Promise(r => setTimeout(r, 1000));
		interaction.editReply(i.toString());
	}
	await new Promise(r => setTimeout(r, 1000));
	interaction.editReply('GO!');
}

module.exports = { countdown_en_canal, countdown_interaction };