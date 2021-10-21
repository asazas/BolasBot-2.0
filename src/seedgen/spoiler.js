const { search_in_patch } = require('./seedgen_util');

const translation = {
	'BigKeyP1': 'BigKeyP1-EasternPalace',
	'BigKeyP2': 'BigKeyP2-DesertPalace',
	'BigKeyP3': 'BigKeyP3-TowerOfHera',
	'BigKeyD1': 'BigKeyD1-PalaceOfDarkness',
	'BigKeyD2': 'BigKeyD2-SwampPalace',
	'BigKeyD3': 'BigKeyD3-SkullWoods',
	'BigKeyD4': 'BigKeyD4-ThievesTown',
	'BigKeyD5': 'BigKeyD5-IcePalace',
	'BigKeyD6': 'BigKeyD6-MiseryMire',
	'BigKeyD7': 'BigKeyD7-TurtleRock',
	'BigKeyA2': 'BigKeyA2-GanonsTower',
	'KeyH2': 'KeyH2-HyruleCastle',
	'KeyP2': 'KeyP2-DesertPalace',
	'KeyP3': 'KeyP3-TowerOfHera',
	'KeyA1': 'KeyA1-CastleTower',
	'KeyD1': 'KeyD1-PalaceOfDarkness',
	'KeyD2': 'KeyD2-SwampPalace',
	'KeyD3': 'KeyD3-SkullWoods',
	'KeyD4': 'KeyD4-ThievesTown',
	'KeyD5': 'KeyD5-IcePalace',
	'KeyD6': 'KeyD6-MiseryMire',
	'KeyD7': 'KeyD7-TurtleRock',
	'KeyA2': 'KeyA2-GanonsTower',
	'MapH2': 'MapH2-HyruleCastle',
	'MapP1': 'MapP1-EasternPalace',
	'MapP2': 'MapP2-DesertPalace',
	'MapP3': 'MapP3-TowerOfHera',
	'MapD1': 'MapD1-PalaceOfDarkness',
	'MapD2': 'MapD2-SwampPalace',
	'MapD3': 'MapD3-SkullWoods',
	'MapD4': 'MapD4-ThievesTown',
	'MapD5': 'MapD5-IcePalace',
	'MapD6': 'MapD6-MiseryMire',
	'MapD7': 'MapD7-TurtleRock',
	'MapA2': 'MapA2-GanonsTower',
	'CompassP1': 'CompassP1-EasternPalace',
	'CompassP2': 'CompassP2-DesertPalace',
	'CompassP3': 'CompassP3-TowerOfHera',
	'CompassD1': 'CompassD1-PalaceOfDarkness',
	'CompassD2': 'CompassD2-SwampPalace',
	'CompassD3': 'CompassD3-SkullWoods',
	'CompassD4': 'CompassD4-ThievesTown',
	'CompassD5': 'CompassD5-IcePalace',
	'CompassD6': 'CompassD6-MiseryMire',
	'CompassD7': 'CompassD7-TurtleRock',
	'CompassA2': 'CompassA2-GanonsTower',
};

const spritemap = {
	121: 'Bee', 178: 'BeeGood', 216: 'Heart',
	217: 'RupeeGreen', 218: 'RupeeBlue', 219: 'RupeeRed',
	220: 'BombRefill1', 221: 'BombRefill4', 222: 'BombRefill8',
	223: 'MagicRefillSmall', 224: 'MagicRefillFull',
	225: 'ArrowRefill5', 226: 'ArrowRefill10',
	227: 'Fairy',
};

function get_sprite_droppable(sprite) {
	try {
		return spritemap[sprite];
	}
	catch (error) {
		return 'ERR: UNKNOWN';
	}
}

function get_seed_prizepacks(data) {
	const drops = {};
	drops['PullTree'] = {};
	drops['RupeeCrab'] = {};

	const stun_prize = search_in_patch(data['patch'], 227731, 1);
	if (stun_prize) drops['Stun'] = get_sprite_droppable(stun_prize[0]);

	const pulltree_prize = search_in_patch(data['patch'], 981972, 3);
	if (pulltree_prize) {
		drops['PullTree']['Tier1'] = get_sprite_droppable(pulltree_prize[0]);
		drops['PullTree']['Tier2'] = get_sprite_droppable(pulltree_prize[1]);
		drops['PullTree']['Tier3'] = get_sprite_droppable(pulltree_prize[2]);
	}

	const rupeecrab_main_prize = search_in_patch(data['patch'], 207304, 1);
	if (rupeecrab_main_prize) drops['RupeeCrab']['Main'] = get_sprite_droppable(rupeecrab_main_prize[0]);

	const rupeecrab_final_prize = search_in_patch(data['patch'], 207300, 1);
	if (rupeecrab_final_prize) drops['RupeeCrab']['Final'] = get_sprite_droppable(rupeecrab_final_prize[0]);

	const fishsave_prize = search_in_patch(data['patch'], 950988, 1);
	if (fishsave_prize) drops['FishSave'] = get_sprite_droppable(fishsave_prize[0]);

	return drops;
}

function get_formatted_spoiler(seed) {
	if (seed['data']['spoiler']['meta']['spoilers'] != 'on' && seed['data']['spoiler']['meta']['spoilers'] != 'generate') {
		return null;
	}

	const spoiler = seed['data']['spoiler'];
	const output = {};

	let sectionlist, prizemap;
	if (spoiler['meta']['shuffle'] && spoiler['meta']['shuffle'] != 'none') {
		sectionlist = ['Special',
			'Hyrule Castle',
			'Eastern Palace',
			'Desert Palace',
			'Tower of Hera',
			'Agahnims Tower',
			'Palace of Darkness',
			'Swamp Palace',
			'Skull Woods',
			'Thieves Town',
			'Ice Palace',
			'Misery Mire',
			'Turtle Rock',
			'Ganons Tower',
			'Caves',
			'Light World',
			'Dark World'];
		prizemap = [['Eastern Palace', 'Eastern Palace - Prize'],
			['Desert Palace', 'Desert Palace - Prize'],
			['Tower of Hera', 'Tower of Hera - Prize'],
			['Palace of Darkness', 'Palace of Darkness - Prize'],
			['Swamp Palace', 'Swamp Palace - Prize'],
			['Skull Woods', 'Skull Woods - Prize'],
			['Thieves Town', 'Thieves\' Town - Prize'],
			['Ice Palace', 'Ice Palace - Prize'],
			['Misery Mire', 'Misery Mire - Prize'],
			['Turtle Rock', 'Turtle Rock - Prize']];
	}
	else {
		sectionlist = ['Special',
			'Hyrule Castle',
			'Eastern Palace',
			'Desert Palace',
			'Tower Of Hera',
			'Castle Tower',
			'Dark Palace',
			'Swamp Palace',
			'Skull Woods',
			'Thieves Town',
			'Ice Palace',
			'Misery Mire',
			'Turtle Rock',
			'Ganons Tower',
			'Light World',
			'Death Mountain',
			'Dark World'];
		prizemap = [['Eastern Palace', 'Eastern Palace - Prize:1'],
			['Desert Palace', 'Desert Palace - Prize:1'],
			['Tower Of Hera', 'Tower of Hera - Prize:1'],
			['Dark Palace', 'Palace of Darkness - Prize:1'],
			['Swamp Palace', 'Swamp Palace - Prize:1'],
			['Skull Woods', 'Skull Woods - Prize:1'],
			['Thieves Town', 'Thieves\' Town - Prize:1'],
			['Ice Palace', 'Ice Palace - Prize:1'],
			['Misery Mire', 'Misery Mire - Prize:1'],
			['Turtle Rock', 'Turtle Rock - Prize:1']];
	}

	output['Prizes'] = {};
	for (const dungeon of prizemap) {
		try {
			output['Prizes'][dungeon[0]] = spoiler[dungeon[0]][dungeon[1]].replace(':1', '');
		}
		catch (error) {
			continue;
		}
	}

	for (const section of sectionlist) {
		try {
			output[section] = {};
			for (const loc in spoiler[section]) {
				output[section][loc.replace(':1', '')] = spoiler[section][loc].replace(':1', '');
				if (output[section][loc.replace(':1', '')] in translation) {
					output[section][loc.replace(':1', '')] = translation[output[section][loc.replace(':1', '')]];
				}
			}
		}
		catch (error) {
			continue;
		}
	}

	output['Drops'] = get_seed_prizepacks(seed['data']);

	output['Special']['DiggingGameDigs'] = search_in_patch(seed['data']['patch'], 982421, 1)[0];

	if (spoiler['meta']['mode'] && spoiler['meta']['mode'] == 'retro') {
		output['Shops'] = spoiler['Shops'];
	}
	if (spoiler['meta']['enemizer.boss_shuffle'] && spoiler['meta']['enemizer.boss_shuffle'] != 'none') {
		output['Bosses'] = spoiler['Bosses'];
	}
	if (spoiler['meta']['shuffle'] && spoiler['meta']['shuffle'] != 'none') {
		output['Entrances'] = spoiler['Entrances'];
	}
	output['meta'] = spoiler['meta'];
	output['meta']['hash'] = seed['data']['hash'];
	output['meta']['permalink'] = `https://alttpr.com/h/${seed['data']['hash']}`;

	for (const dungeon of prizemap) {
		delete output[dungeon[0]][dungeon[1].replace(':1', '')];
	}

	return output;
}

module.exports = { get_formatted_spoiler };