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

const HORA_AMERICANA_REGEX = /^(1[0-2]|0?[1-9])(:[0-5][0-9])?\s*(AM|PM)$/;
const HORA_EUROPEA_REGEX = /^(2[0-3]|[0-1]?[0-9]):([0-5][0-9])$/;


/**
 * @summary Función auxiliar para el comando /fecha.
 *
 * @description Devuelve un objeto DateTime de la librería Luxon que representa el inicio del día dado por el
 * parámetro "fecha".
 *
 * @param {string}  fecha    Fecha en formato dd/mm/aaaa. También puede ser "hoy", "mañana", "ayer" o un día de la semana.
 * @param {string}  timezone Zona horaria a la que corresponde la fecha dada.
 * @param {boolean} pasado   Si se pasa un día de la semana, considerar que sea el día correspondiente inmediatamente
 *                           anterior (true) o siguiente (false) al día actual.
 *
 * @returns {DateTime} Objeto DateTime de la librería Luxon que representa el inicio del día dado por el
 * parámetro "fecha".
 */
function validar_fecha(fecha, timezone, pasado = false) {
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
	else if (fecha === 'ayer') {
		const manana = DateTime.local({ zone: timezone }).startOf('day').minus({ days: 1 });
		return manana;
	}
	else if (fecha in dias_semana) {
		const dia_semana_hoy = DateTime.local({ zone: timezone }).weekday;
		let dia_semana_indicado = dias_semana[fecha];
		if (pasado) {
			if (dia_semana_indicado >= dia_semana_hoy) dia_semana_indicado -= 7;
			const fecha_anterior = DateTime.local({ zone: timezone }).startOf('day').minus({ days: dia_semana_hoy - dia_semana_indicado });
			return fecha_anterior;
		}
		else {
			if (dia_semana_indicado <= dia_semana_hoy) dia_semana_indicado += 7;
			const proxima_fecha = DateTime.local({ zone: timezone }).startOf('day').plus({ days: dia_semana_indicado - dia_semana_hoy });
			return proxima_fecha;
		}
	}
	else {
		throw { 'message': 'La fecha indicada no es válida.' };
	}
}


/**
 * @summary Función auxiliar para el comando /fecha.
 *
 * @description Actualiza un objeto DateTime de la librería Luxon para incluir la hora del día dada por el
 * parámetro "hora".
 *
 * @param {DateTime} fecha_val Objeto DateTime de la librería Luxon representando el inicio de un día dado.
 * @param {string}   hora      Hora con la que actualizar el objeto DateTime dado.
 * @param {string}   timezone  Zona horaria a la que corresponden la fecha y hora dadas.
 *
 * @returns {DateTime} Objeto DateTime de la librería Luxon representando la fecha y hora dadas por la invocación
 * del comando /fecha.
 */
function validar_hora(fecha_val, hora, timezone) {
	let horas = null, minutos = null;
	if (hora === 'AHORA') {
		const ahora = DateTime.local({ zone: timezone }).startOf('minute');
		horas = ahora.hour;
		minutos = ahora.minute;
		return fecha_val.set({ hour: horas, minute: minutos });
	}
	const hora_americana = HORA_AMERICANA_REGEX.exec(hora);
	if (hora_americana) {
		horas = parseInt(hora_americana[1]);
		if (hora_americana[3] === 'AM' && horas === 12) horas = 0;
		else if (hora_americana[3] === 'PM' && horas !== 12) horas += 12;
		minutos = hora_americana[2] ? parseInt(hora_americana[2].substring(1)) : 0;
		return fecha_val.set({ hour: horas, minute: minutos });
	}
	const hora_europea = HORA_EUROPEA_REGEX.exec(hora);
	if (hora_europea) {
		horas = parseInt(hora_europea[1]);
		minutos = parseInt(hora_europea[2]);
		return fecha_val.set({ hour: horas, minute: minutos });
	}
	throw { 'message': 'La hora indicada no es válida.' };
}


/**
 * @summary Invocado por el comando /fecha.
 *
 * @description Procesa una fecha, hora y zona horaria para generar un objeto DateTime de la librería Luxon.
 *
 * @param {string} fecha    Fecha en formato dd/mm/aaaa. También puede ser "hoy", "mañana" o un día de la semana.
 * @param {string} hora     Hora en formato hh:mm, europeo (24 horas) o americano (12 horas am/pm). También puede
 *                          ser "ahora".
 * @param {string} timezone Zona horaria a la que corresponden la fecha y hora dadas.
 *
 * @returns {DateTime} Objeto DateTime de la librería Luxon que representa la fecha y hora dadas.
 */
function procesar_fecha(fecha, hora, timezone) {
	const fecha_val = validar_fecha(fecha, timezone);
	const fecha_con_hora = validar_hora(fecha_val, hora, timezone);
	return fecha_con_hora;
}

module.exports = { procesar_fecha };