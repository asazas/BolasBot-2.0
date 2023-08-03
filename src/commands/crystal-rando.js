const { SlashCommandBuilder } = require('@discordjs/builders');
const { UPRPath, ItemRandoPath } = require('../../config.json');
const { random_words } = require('../racing/async_util');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

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
					{ name: 'Key Item Randomizer', value: 'TourneySettings/TorneoExtremeKIR2023.yml' }))
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

		const tmp_dir = await exec('mktemp -d');
		const tmp_dir_name = tmp_dir['stdout'].trim();

		await exec(`java -jar universal-pokemon-randomizer-zx.jar cli -s ZXsettings/standard.rnqs -i crystal-speedchoice-8.gbc -o "${tmp_dir_name}/${rom_name}_UPR.gbc" ${spoiler_str}`,
			{ cwd: UPRPath });
		await exec(`"./Pokemon Crystal Item Randomizer" cli -i "${tmp_dir_name}/${rom_name}_UPR.gbc" -o "${tmp_dir_name}/${rom_name}.gbc" -m "./Modes/${modo}" ${spoiler_str}`,
			{ cwd: ItemRandoPath });


		if (spoiler) {
			await interaction.editReply({
				files: [`${tmp_dir_name}/${rom_name}.gbc`,
					{ attachment: `${tmp_dir_name}/${rom_name}_UPR.gbc.log`, name: `SPOILER_${tmp_dir_name}/${rom_name}_UPR.gbc.log` },
					{ attachment: `${tmp_dir_name}/${rom_name}.gbc_SPOILER.txt`, name: `SPOILER_${tmp_dir_name}/${rom_name}_UPR.gbc.log` }],
			});
		}
		else {
			await interaction.editReply({ files: [`${tmp_dir_name}/${rom_name}.gbc`] });
		}

		await exec(`rm -rf ${tmp_dir_name}`);
	},
};