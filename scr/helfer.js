"use strict";

let helfer = {
	// übergebene Sektion einblenden, alle andere Sektionen ausblenden
	//   sektion = String (ID der einzublendenden Sektion)
	sektionWechseln (sektion) {
		let sektionen = document.querySelectorAll("body > section");
		for (let i = 0, len = sektionen.length; i < len; i++) {
			if (sektionen[i].id === sektion) {
				sektionen[i].classList.remove("aus");
			} else {
				sektionen[i].classList.add("aus");
			}
		}
	},
	// eleminiert alle childNodes des übergebenen Objekts
	//   obj = Objekt, das geleert werden soll
	keineKinder (obj) {
		while (obj.hasChildNodes()) {
			obj.removeChild(obj.lastChild);
		}
	},
	// überprüft den Typ des übergebenen Objekts zuverlässig
	// mögliche Rückgabewerte: Arguments, Array, Boolean, Date, Error, Function, JSON, Math, Number, Object, RegExp, String
	//   typ = zu überprüfender Typ
	//   obj = zu überprüfendes Objekt
	type_check (typ, obj) {
		let cl = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && cl === typ;
	},
	// Tokens mit spezieller Bedeutung für reguläre Ausdrücke escapen
	escapeRegExp (s) {
		return s.replace(/\/|\(|\)|\[|\]|\{|\}|\.|\?|\\|\+|\*|\^|\$|\|/g, function(m) {
			return `\\${m}`;
		});
	},
};
