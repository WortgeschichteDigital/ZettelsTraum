"use strict";

let beleg = {
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// Kopie der Daten der aktuell angezeigten Karte
	data: {},
	// überprüfen, ob vor dem Erstellen eine neuen Belegs
	// noch Änderungen gespeichert werden müssen
	erstellenCheck () {
		if (!kartei.wort) { // noch keine Kartei geöffnet/erstellt
			dialog.oeffnen("alert", null);
			dialog.text("Sie müssen erst eine Kartei öffnen oder erstellen!");
		} else if (beleg.geaendert) { // aktueller Beleg noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
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
			url: "",
			ko: false,
			bue: false,
			no: "",
			an: [],
			be: 0,
		};
		// Karte anzeigen
		beleg.formularAnzeigen();
	},
	// bestehende Karteikarte öffnen
	oeffnen () {
		// TODO
	},
	// Formular anzeigen
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
	},
	// Änderungen in einem Formular-Feld automatisch übernehmen
	// feld = das Formularfeld, das geändert wurde
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
	// button = der Button, auf den geklickt wurde
	klickButton (button) {
		button.addEventListener("click", function() {
			let aktion = this.id.replace(/^beleg_/, "");
			if (aktion === "speichern") { // SPEICHERN
				// Test: Datum angegeben
				let da = document.getElementById("beleg_da");
				if (!da.value) {
					dialog.oeffnen("alert", function() {
						da.select();
					});
					dialog.text("Sie müssen ein Datum angeben!");
					return;
				}
				// Test: Datum mit vierstelliger Jahreszahl
				if (!da.value.match(/[0-9]{4}/)) {
					dialog.oeffnen("alert", function() {
						da.select();
					});
					dialog.text("Das Datum muss eine vierstellige Jahreszahl enthalten!");
					return;
				}
				// Test: Belegschnitt angegeben
				let bs = document.getElementById("beleg_bs");
				if (!bs.value) {
					dialog.oeffnen("alert", function() {
						bs.select();
					});
					dialog.text("Sie müssen einen Belegschnitt angeben!");
					return;
				}
				// Test: Quelle oder URL angegeben
				let qu = document.getElementById("beleg_qu"),
					url = document.getElementById("beleg_url");
				if (!qu.value && !url.value) {
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
				// Änderungsmarkierung des Belegs entfernen
				beleg.belegGeaendert(false);
				// Änderungsmarkierung für Kartei setzen
				kartei.karteiGeaendert(true);
				// Belegliste einblenden
				liste.aufbauen();
				liste.wechseln();
			} else if (aktion === "abbrechen") { // ABBRECHEN
				let abbrechen = function () {
					beleg.belegGeaendert(false);
					liste.wechseln();
				};
				if (beleg.geaendert) {
					dialog.oeffnen("confirm", function() {
						if (dialog.confirm) {
							abbrechen();
						}
					});
					dialog.text("Die Änderungen wurden nocht nicht gespeichert!\nFormular trotzdem schließen?");
				} else {
					abbrechen();
				}
			} else if (aktion === "loeschen") { // LÖSCHEN
				// TODO
			}
		});
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
