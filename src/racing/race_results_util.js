const { MessageEmbed } = require('discord.js');
const { get_async_by_submit, get_results_for_async } = require('../datamgmt/async_db_utils');
const { get_race_by_channel, get_results_for_race } = require('../datamgmt/race_db_utils');

async function get_async_results_text(db, submit_channel) {
	const results = await get_results_for_async(db, submit_channel);
	let msg = '```\n';
	msg += '+' + '-'.repeat(41) + '+\n';
	msg += '| Rk | Jugador           | Tiempo   | CR  |\n';

	if (results) {
		msg += '|' + '-'.repeat(41) + '|\n';
		let pos = 1;
		for (const res of results) {
			let time_str = 'Forfeit ';
			if (res.Time < 359999) {
				const s = res.Time % 60;
				let m = Math.floor(res.Time / 60);
				const h = Math.floor(m / 60);
				m = m % 60;

				const h_str = '0'.repeat(2 - h.toString().length) + h.toString();
				const m_str = '0'.repeat(2 - m.toString().length) + m.toString();
				const s_str = '0'.repeat(2 - s.toString().length) + s.toString();
				time_str = `${h_str}:${m_str}:${s_str}`;
			}
			const pos_str = ' '.repeat(2 - pos.toString().length) + pos.toString();
			let pl_name = res.player.Name.substring(0, 17);
			pl_name = pl_name + ' '.repeat(17 - pl_name.length);
			let col_rate = res.CollectionRate.toString();
			col_rate = ' '.repeat(3 - col_rate.length) + col_rate;
			msg += `| ${pos_str} | ${pl_name} | ${time_str} | ${col_rate} |\n`;
			pos += 1;
		}
		msg += '+' + '-'.repeat(41) + '+\n';
		msg += '```';
		return msg;
	}
}

async function get_async_data_embed(db, submit_channel) {
	const my_async = await get_async_by_submit(db, submit_channel);

	const data_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(`Carrera asíncrona: ${my_async.Name}`)
		.addField('Creador', my_async.creator.Name)
		.addField('Fecha de inicio', `<t:${my_async.StartDate}>`)
		.setTimestamp();
	if (my_async.EndDate) {
		data_embed.addField('Fecha de cierre', `<t:${my_async.EndDate}>`);
	}
	if (my_async.Preset) {
		data_embed.addField('Descripción', my_async.Preset);
	}
	if (my_async.SeedUrl) {
		data_embed.addField('Seed', my_async.SeedUrl);
	}
	if (my_async.SeedCode) {
		data_embed.addField('Hash', my_async.SeedCode);
	}
	return data_embed;
}

async function get_race_data_embed(db, race_channel) {
	const my_race = await get_race_by_channel(db, race_channel);

	const data_embed = new MessageEmbed()
		.setColor('#0099ff')
		.setTitle(`Carrera: ${my_race.Name}`)
		.addField('Creador', my_race.creator.Name)
		.addField('Fecha de creación', `<t:${my_race.CreationDate}>`)
		.setTimestamp();
	if (my_race.StartDate) {
		data_embed.addField('Fecha de inicio', `<t:${my_race.StartDate}>`);
	}
	if (my_race.EndDate) {
		data_embed.addField('Fecha de cierre', `<t:${my_race.EndDate}>`);
	}
	if (my_race.Preset) {
		data_embed.addField('Descripción', my_race.Preset);
	}
	if (my_race.SeedUrl) {
		data_embed.addField('Seed', my_race.SeedUrl);
	}
	if (my_race.SeedCode) {
		data_embed.addField('Hash', my_race.SeedCode);
	}
	return data_embed;
}

function calcular_tiempo(timestamp) {
	let time_str = 'Forfeit ';
	if (timestamp < 359999) {
		const s = timestamp % 60;
		let m = Math.floor(timestamp / 60);
		const h = Math.floor(m / 60);
		m = m % 60;

		const h_str = '0'.repeat(2 - h.toString().length) + h.toString();
		const m_str = '0'.repeat(2 - m.toString().length) + m.toString();
		const s_str = '0'.repeat(2 - s.toString().length) + s.toString();
		time_str = `${h_str}:${m_str}:${s_str}`;
	}
	return time_str;
}

async function get_race_results_text(db, submit_channel) {
	const results = await get_results_for_race(db, submit_channel);
	let msg = '```\n';
	msg += '+' + '-'.repeat(35) + '+\n';
	msg += '| Rk | Jugador           | Tiempo   |\n';

	if (results) {
		msg += '|' + '-'.repeat(35) + '|\n';
		let pos = 1;
		for (const res of results) {
			const time_str = calcular_tiempo(res.Time);
			const pos_str = ' '.repeat(2 - pos.toString().length) + pos.toString();
			let pl_name = res.player.Name.substring(0, 17);
			pl_name = pl_name + ' '.repeat(17 - pl_name.length);
			msg += `| ${pos_str} | ${pl_name} | ${time_str} |\n`;
			pos += 1;
		}
		msg += '+' + '-'.repeat(35) + '+\n';
		msg += '```';
		return msg;
	}
}

module.exports = { get_async_results_text, get_async_data_embed, get_race_data_embed, get_race_results_text, calcular_tiempo };