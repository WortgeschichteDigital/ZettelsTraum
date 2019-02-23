"use strict";

let helfer = {
	// übergebene Sektion einblenden, alle andere Sektionen ausblenden
	// sektion = String (ID der einzublendenden Sektion)
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
	// obj = Objekt, das geleert werden soll
	keineKinder (obj) {
		while (obj.hasChildNodes()) {
			obj.removeChild(obj.lastChild);
		}
	},
};
