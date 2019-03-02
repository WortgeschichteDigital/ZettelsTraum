"use strict";

let helfer = {
	// übergebene Sektion einblenden, alle andere Sektionen ausblenden
	//   sektion = String
	//     (ID der einzublendenden Sektion)
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
	//   obj = Element
	//     (dieses Element soll von all seinen Kindern befreit werden)
	keineKinder (obj) {
		while ( obj.hasChildNodes() ) {
			obj.removeChild(obj.lastChild);
		}
	},
	// Fokus aus Formularfeldern entfernen
	inputBlur () {
		let aktiv = document.activeElement;
		if (aktiv.getAttribute("type") && aktiv.getAttribute("type") === "text" ||
				aktiv.nodeName === "TEXTAREA") {
			aktiv.blur();
		}
	},
	// überprüft den Typ des übergebenen Objekts zuverlässig
	// mögliche Rückgabewerte: Arguments, Array, Boolean, Date, Error, Function, JSON, Math, Number, Object, RegExp, String
	//   typ = String
	//     (Typ, auf den das übergebene Objekt überprüft werden soll)
	//   obj = Object
	//     (das Objekt, das auf den übergebenen Typ überprüft wird)
	checkType (typ, obj) {
		let cl = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && cl === typ;
	},
	// Tokens mit spezieller Bedeutung für reguläre Ausdrücke escapen
	//   string = String
	//     (Text, der escaped werden soll)
	escapeRegExp (string) {
		return string.replace(/\/|\(|\)|\[|\]|\{|\}|\.|\?|\\|\+|\*|\^|\$|\|/g, (m) => `\\${m}`);
	},
	// Tastatur-Events abfangen und verarbeiten
	//   evt = Event-Objekt
	tastatur (evt) {
		// Esc
		if (evt.which === 27) {
			// Overlay-Fenster schließen
			let overlay_oben_id = overlay.oben();
			if (overlay_oben_id) {
				let link = document.querySelector(`#${overlay_oben_id} a`);
				overlay.schliessen(link);
				return;
			}
			// Belegfenster schließen
			let formular = document.getElementById("beleg");
			if ( !formular.classList.contains("aus") ) {
				helfer.inputBlur();
				beleg.aktionAbbrechen();
			}
		}
	},
};
