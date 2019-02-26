"use strict";

// Das Objekt enthält alle Variablen und Methoden, die mit dem Eingabeformular
// für neue Karteikarten zusammenhängen.
let beleg = {
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// Kopie der Daten der aktuell angezeigten Karte
	data: {},
	// überprüfen, ob vor dem Erstellen eine neuen Belegs noch Änderungen
	// gespeichert werden müssen
	erstellenCheck () {
		if (!kartei.wort) { // noch keine Kartei geöffnet/erstellt
			dialog.oeffnen("alert", null);
			dialog.text("Sie müssen erst eine Kartei öffnen oder erstellen!");
		} else if (beleg.geaendert) { // aktueller Beleg noch nicht gespeichert
			dialog.oeffnen("confirm", () => {
				if (dialog.confirm) {
					beleg.erstellen();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert!\nMöchten Sie trotzdem einen neuen Beleg hinzufügen?\nAchtung, alle Änderungen am aktuellen Beleg gehen verloren!");
		} else {
			beleg.erstellen();
		}
	},
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
		id_karte++;
		beleg.id_karte = id_karte;
		// Karten-Objekt anlegen
		beleg.data = {
			da: "",
			ts: "",
			au: "",
			bs: "",
			bd: "",
			qu: "",
			ko: false,
			bu: false,
			no: "",
			an: [],
			be: 0,
		};
		// Karte anzeigen
		beleg.formularAnzeigen();
	},
	// Klick-Event zum Öffnen einer Karteikarte
	oeffnenKlick (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			beleg.oeffnen(parseInt(this.dataset.id, 10));
		});
	},
	// bestehende Karteikarte öffnen
	oeffnen (id) {
		// ID zwischenspeichern
		beleg.id_karte = id;
		// Daten des Belegs kopieren
		beleg.data = {};
		for (let i in data.k[id]) {
			if (!data.k[id].hasOwnProperty(i)) {
				continue;
			}
			if (helfer.type_check("Array", data.k[id][i])) {
				beleg.data[i] = [...data.k[id][i]];
			} else {
				beleg.data[i] = data.k[id][i];
			}
		}
		// Formular anzeigen
		beleg.formularAnzeigen();
	},
	// Formular füllen und anzeigen
	formularAnzeigen () {
		// Beleg-Titel eintragen
		document.getElementById("beleg_titel").textContent = `Beleg #${beleg.id_karte}`;
		// Feld-Werte eintragen
		let felder = document.querySelectorAll("#beleg input, #beleg textarea");
		for (let i = 0, len = felder.length; i < len; i++) {
			let feld = felder[i].id.replace(/^beleg_/, "");
			if (felder[i].type === "button") {
				continue;
			} else if (felder[i].type === "checkbox") {
				felder[i].checked = beleg.data[feld];
			} else { // Text-Input und Textarea
				felder[i].value = beleg.data[feld];
			}
		}
		// Änderungsmarkierung ausblenden
		beleg.belegGeaendert(false);
		// Formular einblenden
		helfer.sektionWechseln("beleg");
		// Datumsfeld fokussieren
		document.getElementById("beleg_da").focus();
	},
	// Änderungen in einem Formular-Feld automatisch übernehmen
	//   feld = das Formularfeld, das geändert wurde
	feldGeaendert (feld) {
		feld.addEventListener("change", function() {
			let feld = this.id.replace(/^beleg_/, "");
			if (this.type === "checkbox") {
				beleg.data[feld] = this.checked;
			} else {
				beleg.data[feld] = this.value;
			}
			beleg.belegGeaendert(true);
		});
	},
	// Aktionen beim Klick auf einen Formular-Button
	//   button = der Button, auf den geklickt wurde
	klickButton (button) {
		button.addEventListener("click", function() {
			let aktion = this.id.replace(/^beleg_/, "");
			if (aktion === "speichern") {
				beleg.aktionSpeichern();
			} else if (aktion === "abbrechen") {
				beleg.aktionAbbrechen();
			} else if (aktion === "loeschen") {
				beleg.aktionLoeschen();
			}
		});
	},
	// Beleg speichern
	aktionSpeichern () {
		// Test: Datum angegeben?
		let da = document.getElementById("beleg_da");
		if (!da.value) {
			dialog.oeffnen("alert", function() {
				da.select();
			});
			dialog.text("Sie müssen ein Datum angeben!");
			return;
		}
		// Test: Datum mit vierstelliger Jahreszahl oder Jahrhundertangabe?
		if (!da.value.match(/[0-9]{4}|[0-9]{2}\. (Jahrhundert|Jh\.)/)) {
			dialog.oeffnen("alert", function() {
				da.select();
			});
			dialog.text("Das Datum muss eine vierstellige Jahreszahl (z. B. 1813) oder eine Jahrhundertangabe (z. B. 17. Jh.) enthalten!");
			return;
		}
		// Test: Belegschnitt angegeben?
		let bs = document.getElementById("beleg_bs");
		if (!bs.value) {
			dialog.oeffnen("alert", function() {
				bs.select();
			});
			dialog.text("Sie müssen einen Belegschnitt angeben!");
			return;
		}
		// Test: Quelle angegeben?
		let qu = document.getElementById("beleg_qu");
		if (!qu.value) {
			dialog.oeffnen("alert", function() {
				qu.select();
			});
			dialog.text("Sie müssen eine Quelle oder eine URL angeben!");
			return;
		}
		// Beleg wurde nicht geändert
		if (!beleg.geaendert) {
			dialog.oeffnen("alert", function() {
				liste.wechseln();
			});
			dialog.text("Es wurden keine Änderungen vorgenommen!");
			return;
		}
		// ggf. Objekt anlegen
		if (!data.k[beleg.id_karte]) {
			data.k[beleg.id_karte] = {};
		}
		// Objekt mit neuen Werten füllen
		for (let i in beleg.data) {
			if (!beleg.data.hasOwnProperty(i)) {
				continue;
			}
			if (helfer.type_check("Array", beleg.data[i])) {
				data.k[beleg.id_karte][i] = [...beleg.data[i]];
			} else {
				data.k[beleg.id_karte][i] = beleg.data[i];
			}
		}
		// Änderungen darstellen
		beleg.listeGeaendert();
	},
	// Bearbeitung des Belegs abbrechen
	aktionAbbrechen () {
		// Funktion zum Abbrechen
		function abbrechen () {
			beleg.belegGeaendert(false);
			liste.wechseln();
		}
		// Bearbeitung wirklich abbrechen?
		if (beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.confirm) {
					abbrechen();
				}
			});
			dialog.text("Die Eingaben wurden nocht nicht gespeichert!\nFormular trotzdem schließen?");
		} else {
			abbrechen();
		}
	},
	// Beleg löschen
	aktionLoeschen () {
		// Beleg wurde noch gar nicht angelegt
		if (!data.k[beleg.id_karte]) {
			beleg.aktionAbbrechen();
			return;
		}
		// Beleg wirklich löschen?
		dialog.oeffnen("confirm", function() {
			if (dialog.confirm) {
				// Datensatz löschen
				delete data.k[beleg.id_karte];
				// Änderungen darstellen
				beleg.listeGeaendert();
			}
		});
		dialog.text("Soll der Beleg wirklich gelöscht werden?");
	},
	// die Aktionen im Formular führten zu einer Änderung der Belegliste (betrifft Speichern und Löschen)
	listeGeaendert () {
		// Änderungsmarkierung des Belegs entfernen
		beleg.belegGeaendert(false);
		// Änderungsmarkierung für Kartei setzen
		kartei.karteiGeaendert(true);
		// Belegliste aufbauen und einblenden
		liste.aufbauen(true);
		liste.wechseln();
	},
	// Beleg wurde geändert und nocht nicht gespeichert
	geaendert: false,
	// Anzeigen, dass der Beleg geändert wurde
	belegGeaendert (geaendert) {
		beleg.geaendert = geaendert;
		let icon = document.getElementById("beleg_geaendert");
		if (geaendert) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
	},
};
