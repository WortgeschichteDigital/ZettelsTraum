"use strict";

let beleg = {
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// neue Karteikarte erstellen
	erstellen () {
		// nächste ID ermitteln
		let id_karte = 0,
			ids = Object.keys(data.k);
		for (let i = 0, len = ids.length; i < len; i++) {
			let id = parseInt(ids[i], 10);
			if (id > id_karte) {
				id_karte = id;
			}
		}
		if (id_karte === 0) {
			id_karte = 1;
		}
		this.id_karte = id_karte;
		// Karten-Objekt anlegen
		data.k[id_karte] = {
			d1: "",
			d2: "",
			ts: "",
			au: "",
			bs: "",
			bd: "",
			qu: "",
			url: "",
			ko: false,
			bue: false,
			no: "",
			an: [],
			be: 0,
		};
		// Karte anzeigen
		helfer.sektionWechseln("beleg");
	},
};
