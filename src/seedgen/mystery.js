const fs = require('fs');

function weighted_choice(options) {
	if (typeof options != 'object') {
		return options;
	}
	const sum_of_weights = Object.values(options).reduce((x, y) => x + y);
	const rng = Math.random() * sum_of_weights;
	let accum = 0;
	for (const o in options) {
		accum += options[o];
		if (rng < accum) {
			return o;
		}
	}
	return null;
}

function resolve_subweights(weights) {
	const subw_list = {};
	for (const sw in weights['subweights']) {
		subw_list[sw] = weights['subweights'][sw]['chance'];
	}
	const chosen_sw = weighted_choice(subw_list);
	return { ...weights, ...weights['subweights'][chosen_sw]['weights'] };
}

function roll_basic_settings(weights) {
	const options = {};
	if (weights['glitches_required']) options['glitches'] = weighted_choice(weights['glitches_required']);
	if (weights['item_placement']) options['item_placement'] = weighted_choice(weights['item_placement']);
	if (weights['dungeon_items']) options['dungeon_items'] = weighted_choice(weights['dungeon_items']);
	if (weights['accessibility']) options['accessibility'] = weighted_choice(weights['accessibility']);
	if (weights['goals']) options['goals'] = weighted_choice(weights['goals']);
	if (weights['ganon_open']) options['ganon_open'] = weighted_choice(weights['ganon_open']);
	if (weights['tower_open']) options['tower_open'] = weighted_choice(weights['tower_open']);
	if (weights['world_state']) options['world_state'] = weighted_choice(weights['world_state']);
	if (weights['hints']) options['hints'] = weighted_choice(weights['hints']);
	if (weights['weapons']) options['weapons'] = weighted_choice(weights['weapons']);
	if (weights['item_pool']) options['item_pool'] = weighted_choice(weights['item_pool']);
	if (weights['item_functionality']) options['item_functionality'] = weighted_choice(weights['item_functionality']);
	if (weights['boss_shuffle']) options['boss_shuffle'] = weighted_choice(weights['boss_shuffle']);
	if (weights['enemy_shuffle']) options['enemy_shuffle'] = weighted_choice(weights['enemy_shuffle']);
	if (weights['enemy_damage']) options['enemy_damage'] = weighted_choice(weights['enemy_damage']);
	if (weights['enemy_health']) options['enemy_health'] = weighted_choice(weights['enemy_health']);
	if (weights['pot_shuffle']) options['pot_shuffle'] = weighted_choice(weights['pot_shuffle']);
	if (weights['allow_quickswap']) options['allow_quickswap'] = weighted_choice(weights['allow_quickswap']);
	if (weights['entrance_shuffle']) options['entrance_shuffle'] = weighted_choice(weights['entrance_shuffle']);
	return options;
}

function update_custom_equipment(mystery_preset, item, value) {
	if (item == 'Bottle1' || item == 'Bottle2' || item == 'Bottle3' || item == 'Bottle4') {
		switch (value) {
		case 1:
			mystery_preset['settings']['eq'].push('Bottle');
			break;
		case 2:
			mystery_preset['settings']['eq'].push('BottleWithRedPotion');
			break;
		case 3:
			mystery_preset['settings']['eq'].push('BottleWithGreenPotion');
			break;
		case 4:
			mystery_preset['settings']['eq'].push('BottleWithBluePotion');
			break;
		case 5:
			mystery_preset['settings']['eq'].push('BottleWithBee');
			break;
		case 6:
			mystery_preset['settings']['eq'].push('BottleWithGoldBee');
			break;
		case 7:
			mystery_preset['settings']['eq'].push('BottleWithFairy');
			break;
		}
	}
	else if (item == 'ProgressiveBow') {
		switch (value) {
		case 1:
			mystery_preset['settings']['eq'].push('SilverArrowUpgrade');
			break;
		case 2:
			mystery_preset['settings']['eq'].push('Bow');
			break;
		case 3:
			mystery_preset['settings']['eq'].push('BowAndSilverArrows');
			break;
		}
	}
	else if (item == 'Boomerang') {
		switch (value) {
		case 1:
			mystery_preset['settings']['eq'].push('Boomerang');
			break;
		case 2:
			mystery_preset['settings']['eq'].push('Boomerang');
			break;
		case 3:
			mystery_preset['settings']['eq'].push('Boomerang', 'RedBoomerang');
			break;
		}
	}
	else if (item == 'Ocarina') {
		switch (value) {
		case 1:
			mystery_preset['settings']['eq'].push('OcarinaInactive');
			break;
		case 2:
			mystery_preset['settings']['eq'].push('OcarinaActive');
			break;
		}
	}
	else if (item == 'Rupees') {
		while (value >= 300) {
			mystery_preset['settings']['eq'].push('ThreeHundredRupees');
			value -= 300;
		}
		while (value >= 100) {
			mystery_preset['settings']['eq'].push('OneHundredRupees');
			value -= 100;
		}
		while (value >= 50) {
			mystery_preset['settings']['eq'].push('FiftyRupees');
			value -= 50;
		}
		while (value >= 20) {
			mystery_preset['settings']['eq'].push('TwentyRupees');
			value -= 20;
		}
		while (value >= 5) {
			mystery_preset['settings']['eq'].push('FiveRupees');
			value -= 5;
		}
		while (value > 0) {
			mystery_preset['settings']['eq'].push('OneRupee');
			value -= 1;
		}
	}
	else if (typeof value == 'number') {
		while (value > 0) {
			mystery_preset['settings']['eq'].push(item);
			value -= 1;
		}
	}
	else if (value) {
		mystery_preset['settings']['eq'].push(item);
	}
}

function update_item_pool(mystery_preset) {
	let three_heart_counter = 3;
	for (let item of mystery_preset['settings']['eq']) {
		if (item === 'BossHeartContainer' && three_heart_counter > 0) {
			three_heart_counter -= 1;
			continue;
		}
		if (item === 'OcarinaActive') {
			item = 'OcarinaInactive';
		}
		if (item === 'Bottle' || item === 'BottleWithRedPotion' || item === 'BottleWithGreenPotion'
			|| item === 'BottleWithBluePotion' || item === 'BottleWithBee' || item === 'BottleWithGoldBee'
			|| item === 'BottleWithFairy') {
			item = 'BottleWithRandom';
		}
		if (mystery_preset['settings']['custom']['item']['count'][item] > 0) {
			mystery_preset['settings']['custom']['item']['count'][item] -= 1;
		}
	}
}

function triforce_hunt_settings(mystery_preset, weights) {
	let min_difference, goal_pieces, pool_pieces;
	if (!weights['customizer']['triforce-hunt']) {
		goal_pieces = 20;
		pool_pieces = 30;
	}
	else {
		if (weights['customizer']['triforce-hunt']['min_difference']) {
			min_difference = weighted_choice(weights['customizer']['triforce-hunt']['min_difference']);
		}
		else {
			min_difference = 0;
		}

		const goal_weights = weights['customizer']['triforce-hunt']['goal'];
		if (goal_weights) {
			if (typeof goal_weights == 'number') {
				goal_pieces = goal_weights;
			}
			else {
				goal_pieces = Math.floor(Math.random() * (goal_weights[1] - goal_weights[0] + 1) + goal_weights[0]);
			}
		}
		else {
			goal_pieces = 20;
		}

		const pool_weights = weights['customizer']['triforce-hunt']['pool'];
		if (pool_weights) {
			if (typeof pool_weights == 'number') {
				pool_pieces = pool_weights;
			}
			else {
				pool_pieces = Math.floor(Math.random() * (pool_weights[1] - pool_weights[0] + 1) + pool_weights[0]);
			}
		}
		else {
			pool_pieces = 30;
		}

		if (pool_pieces < goal_pieces + min_difference) {
			pool_pieces = goal_pieces + min_difference;
		}
	}
	mystery_preset['settings']['custom']['item.Goal.Required'] = goal_pieces;
	mystery_preset['settings']['custom']['item']['count']['TriforcePiece'] = pool_pieces;
}

function timed_ohko_settings(mystery_preset, options, weights) {
	if (weights['customizer']['timed-ohko']) {
		const clock_weights = weights['customizer']['timed-ohko']['clock'];
		for (const clock in clock_weights) {
			if (typeof clock_weights[clock]['value'] == 'number') {
				mystery_preset['settings']['custom'][`item.value.${clock}`] = clock_weights[clock]['value'];
			}
			else {
				const clock_value = clock_weights[clock]['value'];
				mystery_preset['settings']['custom'][`item.value.${clock}`] = Math.floor(Math.random() * (clock_value[1] - clock_value[0] + 1) + clock_value[0]);
			}

			if (typeof clock_weights[clock]['pool'] == 'number') {
				mystery_preset['settings']['custom']['item']['count'][clock] = clock_weights[clock]['pool'];
			}
			else {
				const clock_pool = clock_weights[clock]['pool'];
				mystery_preset['settings']['custom']['item']['count'][clock] = Math.floor(Math.random() * (clock_pool[1] - clock_pool[0] + 1) + clock_pool[0]);
			}
		}

		if (weights['customizer']['timed-ohko']['forced_settings']) {
			const forced_settings = weights['customizer']['timed-ohko']['forced_settings'];
			for (const setting in forced_settings) {
				if (typeof forced_settings[setting] != 'object') {
					options[setting] = forced_settings[setting];
				}
				else {
					for (const subsetting in forced_settings[setting]) {
						options[setting] = forced_settings[setting][subsetting];
					}
				}
			}
		}
	}
}

function customizer_coherence_checks(mystery_preset, options, weights) {
	// Navegación de salas oscuras
	// item.require.Lamp = true indica que navegación de salas oscuras podría ser requerida
	if (mystery_preset['settings']['custom']['item.require.Lamp']) {
		options['enemy_shuffle'] = 'none';
		options['enemy_damage'] = 'default';
		options['pot_shuffle'] = 'off';
	}

	// dungeon_items = standard si se usa region.wild.*
	if (mystery_preset['settings']['custom']['region.wildKeys']
		|| mystery_preset['settings']['custom']['region.wildBigKeys']
		|| mystery_preset['settings']['custom']['region.wildCompasses']
		|| mystery_preset['settings']['custom']['region.wildMaps']) {
		options['dungeon_items'] = 'standard';
		mystery_preset['settings']['custom']['rom.freeItemMenu'] = true;
		mystery_preset['settings']['custom']['rom.freeItemText'] = true;
	}

	if (mystery_preset['settings']['custom']['region.wildMaps']) {
		mystery_preset['settings']['custom']['rom.mapOnPickup'] = true;
	}

	if (mystery_preset['settings']['custom']['region.wildCompasses']) {
		mystery_preset['settings']['custom']['rom.dungeonCount'] = 'pickup';
	}

	// opciones de triforce hunt
	if (options['goals'] == 'triforce-hunt') {
		triforce_hunt_settings(mystery_preset, weights);
	}

	// opciones de timed ohko
	if (mystery_preset['settings']['custom']['rom.timerMode'] == 'countdown-ohko') {
		timed_ohko_settings(mystery_preset, options, weights);
	}

	// rellenar item pool si suma < 216
	const total_items = Object.values(mystery_preset['settings']['custom']['item']['count']).reduce((x, y) => x + y);
	if (total_items < 216) {
		const filler = weights['options']['FillItemPoolWith'] ? weights['options']['FillItemPoolWith'] : 'Nothing';
		mystery_preset['settings']['custom']['item']['count'][filler] += (216 - total_items);
	}

	// desactivar flauta inicial si se juega standard
	if (options['world_state'] == 'standard') {
		while (mystery_preset['settings']['eq'].includes('OcarinaActive')) {
			const index = mystery_preset['settings']['eq'].indexOf('OcarinaActive');
			mystery_preset['settings']['eq'].splice(index, 1, 'OcarinaInactive');
		}
	}

	// requisito de pedestal/ad y prize.crossWorld
	if (options['goals'] == 'pedestal' || options['goals'] == 'dungeons') {
		mystery_preset['settings']['custom']['prize.crossWorld'] = true;
	}
}

function roll_customizer_settings(mystery_preset, options, weights) {
	if (weights['customizer']['eq']) {
		for (const item in weights['customizer']['eq']) {
			const choice = weighted_choice(weights['customizer']['eq'][item]);
			if (choice && choice !== 'false') {
				update_custom_equipment(mystery_preset, item, choice);
				mystery_preset['customizer'] = true;
			}
		}
	}

	if (weights['customizer']['custom']) {
		for (const option in weights['customizer']['custom']) {
			const choice = weighted_choice(weights['customizer']['custom'][option]);
			switch (choice) {
			case 'true':
				if (mystery_preset['settings']['custom'][option] === false) {
					mystery_preset['settings']['custom'][option] = true;
					mystery_preset['customizer'] = true;
				}
				break;
			case 'false':
				if (mystery_preset['settings']['custom'][option] === true) {
					mystery_preset['settings']['custom'][option] = false;
					mystery_preset['customizer'] = true;
				}
				break;
			default:
				if (mystery_preset['settings']['custom'][option] !== choice) {
					mystery_preset['settings']['custom'][option] = choice;
					mystery_preset['customizer'] = true;
				}
				break;
			}
		}
	}

	if (weights['customizer']['pool']) {
		for (const item in weights['customizer']['pool']) {
			const choice = weighted_choice(weights['customizer']['pool'][item]);
			if (choice && choice !== mystery_preset['settings']['custom']['item']['count'][item]) {
				mystery_preset['settings']['custom']['item']['count'][item] = choice;
				mystery_preset['customizer'] = true;
			}
		}
	}

	if (mystery_preset['customizer']) {
		if (mystery_preset['settings']['eq'].length > 3) {
			update_item_pool(mystery_preset);
		}
		customizer_coherence_checks(mystery_preset, options, weights);
	}
}

function apply_mystery_rules(options, weights) {
	for (const rule of weights['rules']) {
		const conditions = rule['conditions'];
		const actions = rule['actions'];

		let match = true;

		for (const condition of conditions) {
			if (!condition['MatchType'] || condition['MatchType'] == 'exact') {
				if (options[condition['Key']] == condition['Value']) {
					continue;
				}
				else {
					match = false;
				}
			}
		}

		if (match) {
			for (const ajuste in actions) {
				options[ajuste] = weighted_choice(actions[ajuste]);
			}
		}
	}
}

function apply_basic_settings(mystery_preset, options) {
	mystery_preset['settings']['glitches'] = options['glitches'];
	mystery_preset['settings']['item_placement'] = options['item_placement'];
	mystery_preset['settings']['dungeon_items'] = options['dungeon_items'];
	mystery_preset['settings']['accessibility'] = options['accessibility'];
	mystery_preset['settings']['goal'] = options['goals'];
	mystery_preset['settings']['crystals']['ganon'] = options['ganon_open'];
	mystery_preset['settings']['crystals']['tower'] = options['tower_open'];
	mystery_preset['settings']['mode'] = options['world_state'];
	mystery_preset['settings']['hints'] = options['hints'];
	mystery_preset['settings']['weapons'] = options['weapons'];
	mystery_preset['settings']['item']['pool'] = options['item_pool'];
	mystery_preset['settings']['item']['functionality'] = options['item_functionality'];
	mystery_preset['settings']['enemizer']['boss_shuffle'] = options['boss_shuffle'];
	mystery_preset['settings']['enemizer']['enemy_shuffle'] = options['enemy_shuffle'];
	mystery_preset['settings']['enemizer']['enemy_damage'] = options['enemy_damage'];
	mystery_preset['settings']['enemizer']['enemy_health'] = options['enemy_health'];
	mystery_preset['settings']['enemizer']['pot_shuffle'] = options['pot_shuffle'];
	mystery_preset['settings']['allow_quickswap'] = options['allow_quickswap'];
	mystery_preset['settings']['entrances'] = options['entrance_shuffle'];
}

function mystery_settings(weights) {
	const mystery_preset = JSON.parse(fs.readFileSync('./res/default-mystery.json'));
	if (weights['name']) {
		mystery_preset['settings']['name'] = weights['name'];
	}
	if (weights['description']) {
		mystery_preset['settings']['notes'] = weights['description'];
	}

	if (weights['subweights']) {
		weights = resolve_subweights(weights);
	}

	const options = roll_basic_settings(weights);

	if (options['entrance_shuffle'] == 'none' && weights['customizer']) {
		roll_customizer_settings(mystery_preset, options, weights);
	}

	// resolver incompatibilidades de mc/mcs y entrance
	if (options['entrance_shuffle'] != 'none') {
		if (options['dungeon_items'] == 'mc') {
			options['dungeon_items'] = 'standard';
		}
		else if (options['dungeon_items'] == 'mcs') {
			options['dungeon_items'] = 'full';
		}
	}

	// evitar situaciones terribles en escape sin arma
	if ((options['weapons'] != 'vanilla' && options['weapons'] != 'assured')
		&& options['world_state'] == 'standard'
		&& (options['enemy_shuffle'] != 'none' || options['enemy_damage'] != 'default' || options['enemy_health'] != 'default')) {
		options['weapons'] = 'assured';
	}

	// aplicar reglas
	if (weights['rules']) {
		apply_mystery_rules(options, weights);
	}

	// aplicar opciones base
	apply_basic_settings(mystery_preset, options);

	return mystery_preset;
}

module.exports = { mystery_settings };