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
		await new Promise(r => setTimeout(r, 800));
		msg = await msg.edit(i.toString());
	}
	await new Promise(r => setTimeout(r, 800));
	await msg.edit('GO!');
}

async function countdown_interaction(interaction, tiempo) {
	if (tiempo < 1 || tiempo > 10) {
		tiempo = 10;
	}
	if (tiempo > 5) {
		await interaction.reply(`${tiempo}...`);
		await new Promise(r => setTimeout(r, 1000 * (tiempo - 5)));
		tiempo = 5;
	}
	else {
		await interaction.reply(tiempo.toString());
	}
	for (let i = tiempo - 1; i > 0; i--) {
		await new Promise(r => setTimeout(r, 800));
		await interaction.editReply(i.toString());
	}
	await new Promise(r => setTimeout(r, 800));
	await interaction.editReply('GO!');
}

module.exports = { countdown_en_canal, countdown_interaction };