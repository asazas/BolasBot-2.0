const { DateTime } = require('luxon');

const dias_semana = {
	'lunes': 1,
	'martes': 2,
	'miercoles': 3,
	'miércoles': 3,
	'jueves': 4,
	'viernes': 5,
	'sabado': 6,
	'sábado': 6,
	'domingo': 7,
};

const hora_americana_regex = /^(1[0-2]|0?[1-9])(:[0-5][0-9])?\s*(AM|PM)$/;
const hora_europea_regex = /^(2[0-3]|[0-1]?[0-9]):([0-5][0-9])$/;

function validar_fecha(fecha, timezone) {
	const fecha_obj = DateTime.fromFormat(fecha, 'D', { locale: 'es', zone: timezone });
	if (fecha_obj.isValid) {
		return fecha_obj;
	}
	else if (fecha === 'hoy') {
		const hoy = DateTime.local({ zone: timezone }).startOf('day');
		return hoy;
	}
	else if (fecha === 'mañana') {
		const manana = DateTime.local({ zone: timezone }).startOf('day').plus({ days: 1 });
		return manana;
	}
	else if (fecha in dias_semana) {
		const dia_semana_hoy = DateTime.local({ zone: timezone }).weekday;
		let dia_semana_indicado = dias_semana[fecha];
		if (dia_semana_indicado <= dia_semana_hoy) dia_semana_indicado += 7;
		const proxima_fecha = DateTime.local({ zone: timezone }).startOf('day').plus({ days: dia_semana_indicado - dia_semana_hoy });
		return proxima_fecha;
	}
	else {
		throw { 'message': 'La fecha indicada no es válida.' };
	}
}

function validar_hora(fecha_val, hora, timezone) {
	let horas = null, minutos = null;
	if (hora === 'AHORA') {
		const ahora = DateTime.local({ zone: timezone }).startOf('minute');
		horas = ahora.hour;
		minutos = ahora.minute;
		return fecha_val.set({ hour: horas, minute: minutos });
	}
	const hora_americana = hora_americana_regex.exec(hora);
	if (hora_americana) {
		horas = parseInt(hora_americana[1]);
		if (hora_americana[3] === 'AM' && horas === 12) horas = 0;
		else if (hora_americana[3] === 'PM' && horas !== 12) horas += 12;
		minutos = hora_americana[2] ? parseInt(hora_americana[2].substring(1)) : 0;
		return fecha_val.set({ hour: horas, minute: minutos });
	}
	const hora_europea = hora_europea_regex.exec(hora);
	if (hora_europea) {
		horas = parseInt(hora_europea[1]);
		minutos = parseInt(hora_europea[2]);
		return fecha_val.set({ hour: horas, minute: minutos });
	}
	throw { 'message': 'La hora indicada no es válida.' };
}

function procesar_fecha(fecha, hora, timezone) {
	const fecha_val = validar_fecha(fecha, timezone);
	const fecha_con_hora = validar_hora(fecha_val, hora, timezone);
	return fecha_con_hora;
}

module.exports = { procesar_fecha };