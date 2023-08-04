const { SlashCommandBuilder } = require('@discordjs/builders');
const { UPRPath, ItemRandoPath } = require('../../config.json');
const { random_words } = require('../racing/async_util');

const util = require('util');
const exec = util.promisify(require('child_process').exec);


/**
 * @summary Llamado al solicitar la generación de una seed de Pokémon Crystal Randomizer (no item randomizer).
 *
 * @description Genera una seed de Pokémon Crystal Randomizer y la envía como respuesta al comando.
 *
 * @param {CommandInteraction} interaction    Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             modo_upr       Ruta relativa al preset de Universal Pokémon Randomizer.
 * @param {string}             nombre         Nombre que se asignará a la seed generada.
 * @param {string}             spoiler        Opción de línea de comandos para habilitar (o no) la generación del log
 * 											  de spoiler de la seed.
 */
async function generate_upr(interaction, modo_upr, nombre, spoiler) {
	const tmp_dir = await exec('mktemp -d');
	const tmp_dir_name = tmp_dir['stdout'].trim();

	await exec(`java -jar universal-pokemon-randomizer-zx.jar cli -s ZXsettings/${modo_upr} -i crystal-speedchoice-8.gbc -o "${tmp_dir_name}/${nombre}.gbc" ${spoiler}`,
		{ cwd: UPRPath });


	if (spoiler) {
		await interaction.editReply({
			files: [`${tmp_dir_name}/${nombre}.gbc`,
				{ attachment: `${tmp_dir_name}/${nombre}.gbc.log`, name: `SPOILER_${nombre}_UPR.gbc.log` }],
		});
	}
	else {
		await interaction.editReply({ files: [`${tmp_dir_name}/${nombre}.gbc`] });
	}

	await exec(`rm -rf ${tmp_dir_name}`);
}


/**
 * @summary Llamado al solicitar la generación de una seed de Pokémon Crystal Item Randomizer.
 *
 * @description Genera una seed de Pokémon Crystal Item Randomizer y la envía como respuesta al comando.
 *
 * @param {CommandInteraction} interaction    Interacción correspondiente al comando inicialmente invocado.
 * @param {string}             modo_upr       Ruta relativa al preset de Universal Pokémon Randomizer.
 * @param {string}             modo_itemrando Ruta relativa al preset de Pokémon Crystal Item Randomizer.
 * @param {string}             nombre         Nombre que se asignará a la seed generada.
 * @param {string}             spoiler        Opción de línea de comandos para habilitar (o no) la generación de logs
 * 											  de spoiler de la seed.
 */
async function generate_itemrando(interaction, modo_upr, modo_itemrando, nombre, spoiler) {
	const tmp_dir = await exec('mktemp -d');
	const tmp_dir_name = tmp_dir['stdout'].trim();

	await exec(`java -jar universal-pokemon-randomizer-zx.jar cli -s ZXsettings/${modo_upr} -i crystal-speedchoice-8.gbc -o "${tmp_dir_name}/${nombre}_UPR.gbc" ${spoiler}`,
		{ cwd: UPRPath });
	await exec(`"./Pokemon Crystal Item Randomizer" cli -i "${tmp_dir_name}/${nombre}_UPR.gbc" -o "${tmp_dir_name}/${nombre}.gbc" -m "./Modes/${modo_itemrando}" ${spoiler}`,
		{ cwd: ItemRandoPath });


	if (spoiler) {
		await interaction.editReply({
			files: [`${tmp_dir_name}/${nombre}.gbc`,
				{ attachment: `${tmp_dir_name}/${nombre}_UPR.gbc.log`, name: `SPOILER_${nombre}_UPR.gbc.log` },
				{ attachment: `${tmp_dir_name}/${nombre}.gbc_SPOILER.txt`, name: `SPOILER_${nombre}.gbc_SPOILER.txt` }],
		});
	}
	else {
		await interaction.editReply({ files: [`${tmp_dir_name}/${nombre}.gbc`] });
	}

	await exec(`rm -rf ${tmp_dir_name}`);
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('crystal-rando')
		.setDescription('Genera una seed de Pokémon Crystal Randomizer.')
		.addStringOption(option =>
			option.setName('modo')
				.setDescription('Modo de juego.')
				.setRequired(true)
				.addChoices({ name: 'Extreme Full Item Randomizer', value: 'TourneySettings/FullItemRandoTournament2023Stage1Extreme.yml' },
					{ name: 'Crazy Full Item Randomizer', value: 'TourneySettings/FullItemRandoTournament2023Stage2Crazy.yml' },
					{ name: 'Key Item Randomizer', value: 'TourneySettings/TorneoExtremeKIR2023.yml' },
					{ name: 'Bingo', value: 'Crystal_Bingo_FullTM_RandomTradeItems.rnqs' }))
		.addStringOption(option =>
			option.setName('nombre')
				.setDescription('Nombre de la seed.'))
		.addBooleanOption(option =>
			option.setName('spoiler')
				.setDescription('Habilitar si se desea generar los logs de spoiler de la seed.')),

	async execute(interaction) {

		await interaction.deferReply();

		const modo = interaction.options.getString('modo');
		const spoiler = interaction.options.getBoolean('spoiler');
		const spoiler_str = spoiler ? '-l' : '';
		let rom_name = interaction.options.getString('nombre');
		if (!rom_name) {
			rom_name = `${random_words[Math.floor(Math.random() * random_words.length)]}${random_words[Math.floor(Math.random() * random_words.length)]}`;
		}
		rom_name = rom_name.substring(0, 50);

		if (modo.endsWith('.rnqs')) {
			await generate_upr(interaction, modo, rom_name, spoiler_str);
		}
		else {
			await generate_itemrando(interaction, 'standard.rnqs', modo, rom_name, spoiler_str);
		}
	},
};