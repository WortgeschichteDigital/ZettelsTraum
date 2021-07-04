"use strict";

let belegeTaggen = {
	// in der Belegliste sichtbare Belege
	karten: [],
	// Tagging-Fenster für Belege einblenden
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Belege &gt; Taggen</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Ist die Belegliste sichtbar?
		if ( !liste.listeSichtbar({funktion: "Belege &gt; Taggen"}) ) {
			return;
		}
		// sichtbare Belege ermitteln
		belegeTaggen.karten = [];
		document.querySelectorAll("#liste-belege .liste-kopf").forEach(i => belegeTaggen.karten.push(i.dataset.id));
		// keine Belege in der Belegliste
		if (!belegeTaggen.karten.length) {
			let text = "Die Belegliste wurde so gefiltert, dass keine Belege sichtbar sind.";
			if (!Object.keys(data.ka).length) {
				text = "Sie haben noch keine Belege aufgenommen.";
			}
			dialog.oeffnen({
				typ: "alert",
				text,
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("belege-taggen");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Anzahl der Belege eintragen
		let numerus = "Belege";
		if (belegeTaggen.karten.length === 1) {
			numerus = "Beleg";
		}
		document.getElementById("belege-taggen-nr").textContent = `${belegeTaggen.karten.length} ${numerus}`;
		// Formular zurücksetzen
		document.querySelectorAll("#belege-taggen-cont table input").forEach(i => i.checked = i.defaultChecked);
	},
	// Taggen ausführen
	taggen () {
		const keyMap = {
			unvollstaendig: {
				key: "un",
				name: "unvollständig",
			},
			ungeprueft:  {
				key: "up",
				name: "ungeprüft",
			},
			kontext:  {
				key: "ko",
				name: "Kontext?",
			},
			buecherdienst:  {
				key: "bu",
				name: "Bücherdienst",
			},
			buchung:  {
				key: "bc",
				name: "Buchung",
			},
			metatext:  {
				key: "mt",
				name: "Metatext",
			},
		};
		// Tagging-Daten sammeln
		let taggen = {};
		document.querySelectorAll("#belege-taggen-cont tr").forEach((i, n) => {
			if (n === 0) {
				return;
			}
			const radio = i.querySelectorAll("input"),
				key = keyMap[radio[0].name.replace(/.+-/, "")].key;
			if (radio[1].checked) {
				taggen[key] = true;
			} else if (radio[2].checked) {
				taggen[key] = false;
			}
		});
		// keine Tags ausgewählt
		if (!Object.keys(taggen).length) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine Tags ausgewählt, die geändert werden sollen.",
			});
			return;
		}
		// Taggen anwenden und abschließen
		let numerus = "Belege";
		if (belegeTaggen.karten.length === 1) {
			numerus = "Beleg";
		}
		let ds = [];
		for (const [k, v] of Object.entries(taggen)) {
			let aktion = "－";
			if (v) {
				aktion = "＋";
			}
			let name = "";
			for (const km of Object.values(keyMap)) {
				if (km.key === k) {
					name = km.name;
					break;
				}
			}
			ds.push(`${aktion}   <i>${name}</i>`);
		}
		dialog.oeffnen({
			typ: "confirm",
			text: `Sollen die <b>${belegeTaggen.karten.length} ${numerus}</b> wie folgt getaggt werden?\n${ds.join("<br>")}`,
			callback: () => {
				if (!dialog.antwort) {
					return;
				}
				for (const id of belegeTaggen.karten) {
					for (const [k, v] of Object.entries(taggen)) {
						data.ka[id][k] = v;
					}
				}
				kartei.karteiGeaendert(true);
				liste.aufbauen(true);
				overlay.schliessen(document.getElementById("belege-taggen"));
			},
		});
	},
};
