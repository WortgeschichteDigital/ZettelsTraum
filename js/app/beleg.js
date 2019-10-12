"use strict";

let beleg = {
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// Kopie der Daten der aktuell angezeigten Karte
	data: {},
	// Liste häufig verwendeter Korpora für das Dropdown-Menü
	korpora: [
		"DTA",
		"DWDS-Kernkorpus",
		"DWDS-Kernkorpus 21",
		"DWDS-Zeitungskorpus",
		"Berliner Zeitung",
		"Berliner Wendecorpus",
		"Blogs",
		"DDR",
		"Dortmunder Chat-Korpus",
		"Filmuntertitel",
		"Gesprochene Sprache",
		"neues deutschland",
		"Polytechnisches Journal",
		"Referenz- und Zeitungskorpora",
		"Tagesspiegel",
		"Text+Berg",
		"Webkorpus 2016c",
		"Die ZEIT",
	],
	// Überprüfen, ob vor dem Erstellen eines neuen Belegs noch Änderungen
	// gespeichert werden müssen.
	erstellenPre () {
		// Änderungen im Tagger/in Bedeutungen/in Notizen/im Beleg noch nicht gespeichert
		if (tagger.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					tagger.speichern();
				} else if (dialog.antwort === false) {
					tagger.taggerGeaendert(false);
					tagger.schliessen();
					beleg.erstellen();
				}
			});
			dialog.text("Die Tags wurden verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (bedeutungen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					bedeutungen.speichern();
				} else if (dialog.antwort === false) {
					bedeutungen.bedeutungenGeaendert(false);
					beleg.erstellen();
				}
			});
			dialog.text("Das Bedeutungsgerüst wurde verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (notizen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					notizen.speichern();
				} else if (dialog.antwort === false) {
					notizen.notizenGeaendert(false);
					beleg.erstellen();
				}
			});
			dialog.text("Die Notizen wurden geändert, aber noch nicht gespeichert.\nMöchten Sie die Notizen nicht erst einmal speichern?");
			return;
		} else if (beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					beleg.belegGeaendert(false);
					beleg.erstellen();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert.\nMöchten Sie den Beleg nicht erst einmal speichern?");
			return;
		}
		// Alles okay => neue Karte erstellen
		beleg.erstellen();
	},
	// neue Karteikarte erstellen
	erstellen () {
		// alle Overlay-Fenster schließen
		overlay.alleSchliessen();
		// nächste ID ermitteln
		beleg.id_karte = beleg.idErmitteln();
		// neues Karten-Objekt anlegen
		beleg.data = beleg.karteErstellen();
		// ggf. die Leseansicht verlassen
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.leseToggle(false);
		}
		// Karte anzeigen
		beleg.formular(true);
	},
	// ermittelt die nächste ID, die in der aktuellen Kartei vergeben werden sollte
	idErmitteln () {
		let id_karte = 0,
			ids = Object.keys(data.ka);
		for (let i = 0, len = ids.length; i < len; i++) {
			let id = parseInt(ids[i], 10);
			if (id > id_karte) {
				id_karte = id;
			}
		}
		id_karte++;
		return id_karte;
	},
	// erstellt ein leeres Daten-Objekt für eine neue Karteikarte
	karteErstellen () {
		return {
			an: [], // Anhänge
			au: "", // Autor
			bc: false, // Buchung
			bd: [], // Bedeutung
			be: 0, // Bewertung (Markierung)
			bl: "", // Wortbildung
			bs: "", // Beleg
			bu: false, // Bücherdienstauftrag
			da: "", // Belegdatum
			dc: new Date().toISOString(), // Datum Karteikarten-Erstellung
			dm: "", // Datum Karteikarten-Änderung
			ko: false, // Kontext
			kr: "", // Korpus
			mt: false, // Metatext
			no: "", // Notizen
			qu: "", // Quelle
			sy: "", // Synonym
			ts: "", // Textsorte
			un: optionen.data.einstellungen.unvollstaendig, // Bearbeitung unvollständig
		};
	},
	// bestehende Karteikarte öffnen
	//   id = Number
	//     (ID der Karte, die geöffnet werden soll)
	oeffnen (id) {
		// ggf. Annotierungs-Popup in der Belegliste schließen
		annotieren.modSchliessen();
		// ID zwischenspeichern
		beleg.id_karte = id;
		// Daten des Belegs kopieren
		beleg.data = {};
		for (let i in data.ka[id]) {
			if (!data.ka[id].hasOwnProperty(i)) {
				continue;
			}
			if (helfer.checkType("Array", data.ka[id][i])) {
				if (helfer.checkType("Object", data.ka[id][i][0])) {
					beleg.data[i] = [];
					for (let j = 0, len = data.ka[id][i].length; j < len; j++) {
						beleg.data[i].push({...data.ka[id][i][j]});
					}
				} else {
					beleg.data[i] = [...data.ka[id][i]];
				}
			} else {
				beleg.data[i] = data.ka[id][i];
			}
		}
		// in Lese- oder in Formularansicht öffnen?
		let leseansicht = document.getElementById("beleg-link-leseansicht");
		if (optionen.data.einstellungen.leseansicht) {
			beleg.formular(false); // wegen der Bedeutungen *vor* dem Füllen der Leseansicht
			if (!leseansicht.classList.contains("aktiv")) {
				beleg.leseToggle(false);
			} else {
				beleg.leseFill();
			}
		} else {
			if (leseansicht.classList.contains("aktiv")) {
				beleg.leseToggle(false);
			}
			beleg.formular(false); // wegen der Textarea-Größe *nach* dem Umschalten der Leseansicht
		}
	},
	// Formular füllen und anzeigen
	//   neu = Boolean
	//     (neue Karteikarte erstellen)
	formular (neu) {
		// regulären Ausdruck für Sprung zum Wort zurücksetzen
		beleg.ctrlSpringenFormReg.again = false;
		beleg.ctrlSpringenFormReset();
		// Beleg-Titel eintragen
		let beleg_titel = document.getElementById("beleg-titel"),
			titel_text = document.createTextNode(`Beleg #${beleg.id_karte}`);
		beleg_titel.replaceChild(titel_text, beleg_titel.firstChild);
		// Feld-Werte eintragen
		let felder = document.querySelectorAll("#beleg input, #beleg textarea");
		for (let i = 0, len = felder.length; i < len; i++) {
			let feld = felder[i].id.replace(/^beleg-/, "");
			if (felder[i].type === "button") {
				continue;
			} else if (feld === "dta") {
				felder[i].value = "";
				continue;
			} else if (feld === "dta-bis") {
				felder[i].value = "0";
				continue;
			} else if (felder[i].type === "checkbox") {
				felder[i].checked = beleg.data[feld];
			} else if (feld === "bd") {
				continue;
			} else { // Text-Input und Textarea
				felder[i].value = beleg.data[feld];
			}
		}
		// Feld-Wert für Bedeutung eintragen
		beleg.formularBedeutung();
		beleg.formularBedeutungLabel();
		// Bewertung eintragen
		beleg.bewertungAnzeigen();
		// Anhänge auflisten
		anhaenge.auflisten(document.getElementById("beleg-an"), true, "beleg|data|an");
		// Änderungsmarkierung ausblenden
		beleg.belegGeaendert(false);
		// Formular einblenden
		helfer.sektionWechseln("beleg");
		// Textarea zurücksetzen
		document.querySelectorAll("#beleg textarea").forEach(function(textarea) {
			textarea.scrollTop = 0;
			helfer.textareaGrow(textarea);
		});
		// Fokus setzen
		const leseansicht_aktiv = document.getElementById("beleg-link-leseansicht").classList.contains("aktiv");
		if (neu && !leseansicht_aktiv) {
			document.getElementById("beleg-dta").focus();
		} else if (!leseansicht_aktiv) {
			document.getElementById("beleg-da").focus();
		}
	},
	// Bedeutung in das Formular eintragen
	formularBedeutung () {
		// Wert ermitteln
		let bd = [];
		for (let i = 0, len = beleg.data.bd.length; i < len; i++) {
			if (beleg.data.bd[i].gr !== data.bd.gn) { // Bedeutungen aus anderen Gerüsten nicht drucken
				continue;
			}
			bd.push(bedeutungen.bedeutungenTief({
				gr: beleg.data.bd[i].gr,
				id: beleg.data.bd[i].id,
				za: false,
				al: true,
				strip: true,
			}));
		}
		// Wert ins Feld eintragen
		let feld = document.getElementById("beleg-bd");
		feld.value = bd.join("\n");
		// Feld anpassen
		feld.scrollTop = 0;
		helfer.textareaGrow(feld);
	},
	// Label der Bedeutung auffrischen
	formularBedeutungLabel () {
		const text = `Bedeutung${bedeutungen.aufbauenH2Details(data.bd, true)}`;
		let label = document.querySelector(`[for="beleg-bd"]`);
		label.textContent = text;
	},
	// Änderungen in einem Formular-Feld automatisch übernehmen
	//   feld = Element
	//     (das Formularfeld, das geändert wurde)
	formularGeaendert (feld) {
		feld.addEventListener("input", function() {
			let feld = this.id.replace(/^beleg-/, "");
			if (/^dta(-bis)*$/.test(feld)) { // #beleg-dta + #beleg-dta-bis gehören nicht zur Kartei, dienen nur zum DTA-Import
				if (feld === "dta" &&
						/^https*:\/\/www\.deutschestextarchiv\.de\//.test(this.value)) { // Bis-Seite ermitteln und eintragen
					const fak = belegImport.DTAGetFak(this.value, "");
					if (fak) {
						this.nextSibling.value = parseInt(fak, 10) + 1;
					}
				}
				return;
			}
			if (this.type === "checkbox") {
				beleg.data[feld] = this.checked;
			} else if (feld === "bd") {
				// Daten des Bedeutungsfelds werden erst beim Speichern aufgefrischt;
				// vgl. beleg.aktionSpeichern().
				// Wurden die Daten hier geändert, darf das Gerüst aber erst
				// nach dem Speichern gewechselt werden, sonst gehen die Änderungen verloren.
				beleg.geaendertBd = true;
			} else {
				beleg.data[feld] = helfer.textTrim(this.value, true);
			}
			beleg.belegGeaendert(true);
		});
	},
	// Aktionen beim Klick auf einen Formular-Button
	//   button = Element
	//     (der Button, auf den geklickt wurde)
	aktionButton (button) {
		button.addEventListener("click", function() {
			let aktion = this.id.replace(/^beleg-/, "");
			if (aktion === "speichern") {
				beleg.aktionSpeichern();
			} else if (aktion === "abbrechen") {
				beleg.aktionAbbrechen();
			} else if (aktion === "loeschen") {
				beleg.aktionLoeschen();
			} else if (aktion === "dta-button") {
				belegImport.DTA();
			}
		});
	},
	// Vormerken, dass die Liste neu aufgebaut werden muss
	listeGeaendert: false,
	// Beleg speichern
	//   nieSchliessen = true || undefined
	//     (die Karteikarte sollte nach dem Speichern auf keinen Fall geschlossen werden)
	aktionSpeichern (nieSchliessen = false) {
		// Test: Datum angegeben?
		let da = document.getElementById("beleg-da"),
			dav = helfer.textTrim(da.value, true);
		if (!dav) {
			dialog.oeffnen("alert", () => da.select());
			dialog.text("Sie müssen ein Datum angeben.");
			return false;
		}
		// Test: Datum mit vierstelliger Jahreszahl oder Jahrhundertangabe?
		if (!/[0-9]{4}|[0-9]{2}\.\sJh\./.test(dav)) {
			dialog.oeffnen("alert", () => da.select());
			dialog.text("Das Datum muss eine vierstellige Jahreszahl (z. B. „1813“) oder eine Jahrhundertangabe (z. B. „17. Jh.“) enthalten.\nZusätzlich können auch andere Angaben gemacht werden (z. B. „ca. 1815“, „1610, vielleicht 1611“).");
			return false;
		}
		// Test: Beleg angegeben?
		let bs = document.getElementById("beleg-bs");
		if (!helfer.textTrim(bs.value, true)) {
			dialog.oeffnen("alert", () => bs.select());
			dialog.text("Sie müssen einen Beleg eingeben.");
			return false;
		}
		// Test: Quelle angegeben?
		let qu = document.getElementById("beleg-qu");
		if (!helfer.textTrim(qu.value, true)) {
			dialog.oeffnen("alert", () => qu.select());
			dialog.text("Sie müssen eine Quelle angeben.");
			return false;
		}
		// Beleg wurde nicht geändert
		if (!beleg.geaendert) {
			direktSchliessen();
			return false;
		}
		// ggf. Format von Bedeutung, Wortbildung, Synonym und Textsorte anpassen
		let bdFeld = document.getElementById("beleg-bd"),
			ds = ["bd", "bl", "sy", "ts"];
		for (let i = 0, len = ds.length; i < len; i++) {
			let ds_akt = ds[i];
			if (ds_akt === "bd") {
				bdFeld.value = beleg.bedeutungAufbereiten();
			} else {
				beleg.data[ds_akt] = beleg.data[ds_akt].replace(/::/g, ": ").replace(/\n\s*\n/g, "\n");
			}
		}
		// Bedeutungen des aktuellen Gerüsts entfernen
		for (let i = 0, len = beleg.data.bd.length; i < len; i++) {
			if (beleg.data.bd[i].gr === data.bd.gn) {
				beleg.data.bd.splice(i, 1);
				i--;
				len = beleg.data.bd.length;
			}
		}
		// Bedeutung im Bedeutungsfeld hinzufügen
		let bdFeldSp = bdFeld.value.split("\n");
		for (let i = 0, len = bdFeldSp.length; i < len; i++) {
			let zeile = bdFeldSp[i];
			// Bedeutungsfeld könnte leer sein
			if (!zeile) {
				continue;
			}
			// Tags entfernen
			// (User könnten auf die Idee kommen, gleich <i>, <b>, <u> oder Text in Spitzklammern einzugeben;
			// das macht die Sache nur kompliziert, weil z.B. das HTML auf Korrektheit getestet werden müsste)
			zeile = helfer.textTrim(zeile.replace(/<.+?>|[<>]+/g, ""), true);
			// ggf. neue Bedeutung in das Gerüst eintragen
			let bd = beleg.bedeutungSuchen(zeile);
			if (!bd.id) {
				bd = beleg.bedeutungErgaenzen(zeile);
				if (!bd.id) { // die Funktion ist kompliziert und fehleranfällig, lieber noch mal kontrollieren
					dialog.oeffnen("alert");
					dialog.text("Beim Speichern der Karteikarte ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nEinhängen der neuen Bedeutung in das Bedeutungsgerüst fehlgeschalgen");
					return false;
				}
			}
			beleg.data.bd.push({
				gr: data.bd.gn,
				id: bd.id,
			});
		}
		// ggf. Objekt anlegen
		if (!data.ka[beleg.id_karte]) {
			data.ka[beleg.id_karte] = {};
			liste.statusNeu = beleg.id_karte.toString();
		}
		// zwischenspeichern, dass dieser Beleg geändert wurde
		// (für die Hervorhebung in der Liste)
		liste.statusGeaendert = beleg.id_karte.toString();
		// Objekt mit neuen Werten füllen
		for (let i in beleg.data) {
			if (!beleg.data.hasOwnProperty(i)) {
				continue;
			}
			if (helfer.checkType("Array", beleg.data[i])) {
				if (helfer.checkType("Object", beleg.data[i][0])) {
					data.ka[beleg.id_karte][i] = [];
					for (let j = 0, len = beleg.data[i].length; j < len; j++) {
						data.ka[beleg.id_karte][i].push({...beleg.data[i][j]});
					}
				} else {
					data.ka[beleg.id_karte][i] = [...beleg.data[i]];
				}
			} else {
				data.ka[beleg.id_karte][i] = beleg.data[i];
			}
		}
		// Änderungsdatum speichern
		data.ka[beleg.id_karte].dm = new Date().toISOString();
		// Änderungsmarkierungen auffrischen
		beleg.belegGeaendert(false);
		beleg.listeGeaendert = true;
		kartei.karteiGeaendert(true);
		// Bedeutungsgerüst-Fenster mit neuen Daten versorgen
		bedeutungenWin.daten();
		// Schließen?
		direktSchliessen();
		// Speichern war erfolgreich
		return true;
		// Karteikarte ggf. schließen
		function direktSchliessen () {
			if (!nieSchliessen && optionen.data.einstellungen["karteikarte-schliessen"]) {
				beleg.aktionAbbrechen();
			}
		}
	},
	// Bearbeiten des Belegs beenden, Beleg also schließen
	// (Der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
	aktionAbbrechen () {
		// Änderungen noch speichern?
		if (beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					abbrechen();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert.\nMöchten Sie den Beleg nicht erst einmal speichern?");
			return;
		}
		// Änderungen sind schon gespeichert
		abbrechen();
		// Funktion zum Abbrechen
		function abbrechen () {
			beleg.belegGeaendert(false);
			if (beleg.listeGeaendert) {
				liste.status(true);
			}
			liste.wechseln();
			beleg.listeGeaendert = false;
		}
	},
	// Beleg löschen
	aktionLoeschen () {
		// Beleg wurde noch gar nicht angelegt
		if (!data.ka[beleg.id_karte]) {
			beleg.belegGeaendert(false);
			beleg.aktionAbbrechen();
			return;
		}
		// Beleg wirklich löschen?
		beleg.aktionLoeschenFrage(beleg.id_karte);
	},
	// Fragen, ob der Beleg wirklich gelöscht werden soll
	// (wird auch in anderen Kontexten gebraucht, darum auslagern)
	//   id = Number
	//     (ID des Belegs)
	aktionLoeschenFrage (id) {
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				delete data.ka[id];
				beleg.belegGeaendert(false);
				kartei.karteiGeaendert(true);
				liste.statusNeu = "";
				liste.statusGeaendert = "";
				liste.status(true);
				liste.wechseln();
				beleg.listeGeaendert = false;
				bedeutungenWin.daten();
				if (kopieren.an && kopieren.belege.includes(id.toString())) {
					kopieren.belege.splice(kopieren.belege.indexOf(id.toString()), 1);
					kopieren.uiText();
				}
			}
		});
		dialog.text(`Soll <i>${liste.detailAnzeigenH3(id.toString())}</i> wirklich gelöscht werden?`);
	},
	// Beleg wurde geändert und noch nicht gespeichert
	geaendert: false,
	// Bedeutung wurde geändert und nocht nicht gespeichert
	geaendertBd: false,
	// Anzeigen, dass der Beleg geändert wurde
	//   geaendert = Boolean
	belegGeaendert (geaendert) {
		beleg.geaendert = geaendert;
		helfer.geaendert();
		let asterisk = document.getElementById("beleg-geaendert");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			beleg.geaendertBd = false;
			asterisk.classList.add("aus");
		}
	},
	// Speichern oder DTAImport starten (wenn Fokus auf einem Input-Element)
	//   input = Element
	//     (Element, auf dem das Event ausgeführt wird:
	//     <input type="checkbox">, <input type="number">, <input type="text">, <textarea>)
	belegSpeichern (input) {
		input.addEventListener("keydown", function(evt) {
			if (evt.which === 13) {
				if (evt.ctrlKey) {
					evt.preventDefault();
					beleg.aktionSpeichern();
					return;
				}
				if (/^beleg-dta(-bis)*$/.test(this.id)) {
					evt.preventDefault();
					belegImport.DTA();
					return;
				}
				if (document.getElementById("dropdown") &&
						/^beleg-(bd|bl|kr|sy|ts)/.test(this.id)) {
					evt.preventDefault();
					return;
				}
			}
		});
		// DTA-Feld ggf. direkt aus dem Clipboard füttern
		if (input.id === "beleg-dta") {
			input.addEventListener("focus", function() {
				if (this.value || !optionen.data.einstellungen["url-eintragen"]) {
					return;
				}
				const {clipboard} = require("electron"),
					cp = clipboard.readText();
				if (/^https*:\/\/www\.deutschestextarchiv\.de\//.test(cp)) {
					setTimeout(function() {
						// der Fokus könnte noch in einem anderen Feld sein, das dann gefüllt werden würde;
						// man muss dem Fokus-Wechsel ein bisschen Zeit geben
						if (document.activeElement.id !== "beleg-dta") {
							// ist eine URL in der Zwischenablage, fokussiert man das DTA-Feld und löscht den Inhalt,
							// defokussiert man das Programm und fokussiert es dann wieder, indem man direkt
							// auf ein anderes Textfeld klickt, würde dieses Textfeld gefüllt werden
							return;
						}
						document.execCommand("paste");
					}, 5);
				}
			});
		}
	},
	// Verteilerfunktion für Klick-Events der Tools
	//   a = Element
	//     (Link, auf den geklickt wurde)
	toolsKlick (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (this.classList.contains("icon-tools-kopieren")) {
				beleg.toolsKopieren(this);
			} else if (this.classList.contains("icon-tools-einfuegen")) {
				beleg.toolsEinfuegen(this);
			} else if (this.parentNode.classList.contains("text-tools-beleg") ||
				this.parentNode.classList.contains("text-tools-bedeutung")) {
				beleg.toolsText(this);
			}
		});
	},
	// Tool Kopieren: Text aus dem zugehörigen Textfeld komplett kopieren
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsKopieren (link) {
		// Datensatz ermitteln. Ist der Wert gefüllt?
		const ds = link.parentNode.parentNode.firstChild.getAttribute("for").replace(/^beleg-/, ""),
			text = beleg.data[ds];
		if (!text) {
			return;
		}
		beleg.toolsKopierenExec(ds, beleg.data, text, document.querySelector(`#beleg-lese-${ds} p`));
	},
	// führt die Kopieroperation aus (eigene Funktion,
	// weil sie auch für die Kopierfunktion in der Belegliste benutzt wird)
	//   ds = String
	//     (Bezeichner des Datensatzes)
	//   obj = Object
	//     (verweist auf das Datenobjekt, in dem der zu kopierende Text steht;
	//     wichtig, um die Literaturangabe beim Kopieren von Belegtext zu finden
	//   text = String
	//     (der komplette Feldtext, wie er in der DB steht)
	//   ele = Element
	//     (ein Element auf der 1. Ebene im Kopierbereich)
	toolsKopierenExec (ds, obj, text, ele) {
		// clipboard initialisieren
		const {clipboard} = require("electron");
		// Ist Text ausgewählt und ist er im Bereich des Kopier-Icons?
		if (window.getSelection().toString() &&
				popup.getTargetSelection([ele])) {
			let html = helfer.clipboardHtml(popup.textauswahl.html);
			clipboard.write({
				text: popup.textauswahl.text,
				html: html,
			});
			return;
		}
		// Kein Text ausgewählt => das gesamte Feld wird kopiert
		if (ds === "bs") { // Beleg
			let p = text.replace(/\n\s*\n/g, "\n").split("\n"),
				html = "";
			p.forEach(function(i) {
				let text = i;
				if (optionen.data.einstellungen["textkopie-wort"]) {
					text = liste.belegWortHervorheben(text, true);
				}
				html += `<p>${text}</p>`;
			});
			html = helfer.clipboardHtml(html);
			html = beleg.toolsKopierenAddQuelle(html, true, obj);
			text = text.replace(/<.+?>/g, "");
			text = beleg.toolsKopierenAddQuelle(text, false, obj);
			clipboard.write({
				text: text,
				html: html,
			});
		} else if (ds === "bd") { // Bedeutung
			const bd = beleg.bedeutungAufbereiten();
			let bds = [];
			bd.split("\n").forEach(function(i) {
				let bd = beleg.bedeutungSuchen(i);
				if (!bd.id) {
					let bdsTmp = [];
					i.split(": ").forEach(function(j, n) {
						let vor = "   ";
						if (!n) {
							vor = "";
						}
						bdsTmp.push(`${vor}<b>?</b> ${j}`);
					});
					bds.push(bdsTmp.join(""));
				} else {
					bds.push(bedeutungen.bedeutungenTief({
						gr: data.bd.gn,
						id: bd.id,
						leer: true,
					}));
				}
			});
			let html = "";
			bds.forEach(function(i) {
				html += `<p>${i}</p>`;
			});
			let text = bds.join("\n").replace(/<.+?>/g, "");
			clipboard.write({
				text: text,
				html: html,
			});
		} else { // alle anderen Felder
			clipboard.writeText(text);
		}
		// Animation, die anzeigt, dass die Zwischenablage gefüllt wurde
		helfer.animation("zwischenablage");
	},
	// Quellenangabe zum Belegtext hinzufügen
	//   text = String
	//     (Text, der um die Quelle ergänzt werden soll)
	//   html = Boolean
	//     (Text soll um eine html-formatierte Quellenangabe ergänzt werden)
	//   obj = Object
	//     (das Datenobjekt, in dem die Quelle steht)
	toolsKopierenAddQuelle (text, html, obj) {
		if (html) {
			text += "<hr>";
			let quelle = obj.qu.split("\n");
			quelle.forEach(function(i) {
				text += `<p>${helfer.escapeHtml(i)}</p>`;
			});
		} else {
			text += "\n\n---\n\n";
			text += obj.qu;
		}
		return text;
	},
	// Tool Einfügen: Text möglichst unter Beibehaltung der Formatierung einfügen
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsEinfuegen (link) {
		// Element ermitteln
		// Text einlesen
		const {clipboard} = require("electron"),
			id = link.parentNode.parentNode.firstChild.getAttribute("for"),
			ds = id.replace(/^beleg-/, "");
		let formate = clipboard.availableFormats(),
			feld = document.getElementById(id);
		// Text auslesen
		let text = "";
		if (id === "beleg-bs" && formate.includes("text/html")) {
			text = beleg.toolsEinfuegenHtml(clipboard.readHTML());
		} else {
			text = clipboard.readText();
		}
		// Felder ist leer => Text direkt eintragen
		if (!feld.value) {
			eintragen(false);
			return;
		}
		// Feld ist gefüllt + Option immer ergänzen => Text direkt ergänzen
		if (optionen.data.einstellungen["immer-ergaenzen"]) {
			eintragen(true);
			return;
		}
		// Feld ist gefüllt => ergänzen (true), überschreiben (false) oder abbrechen (null)?
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort === true ||
					dialog.antwort === false) {
				eintragen(dialog.antwort);
			}
		});
		dialog.text("Im Textfeld steht schon etwas. Soll es ergänzt werden?\n(Bei „Nein“ wird das Textfeld überschrieben.)");
		document.getElementById("dialog-text").appendChild(optionen.shortcut("Textfeld künftig ohne Nachfrage ergänzen", "immer-ergaenzen"));
		// Einfüge-Funktion
		function eintragen (ergaenzen) {
			if (ergaenzen) {
				if (feld.type === "text") { // <input>
					feld.value += ` ${text}`;
				} else if (/^beleg-(bs|no|qu)$/.test(feld.id)) { // <textarea> (Beleg, Quelle, Notizen)
					feld.value += `\n\n${text}`;
				} else { // <textarea> (alle anderen)
					feld.value += `\n${text}`;
				}
			} else {
				feld.value = text;
			}
			beleg.data[ds] = feld.value;
			helfer.textareaGrow(feld);
			beleg.belegGeaendert(true);
		}
	},
	// Bereitet HTML-Text zum Einfügen in das Beleg-Formular auf
	//   html = String
	//     (Text mit HTML-Tags, der aufbereitet und dann eingefügt werden soll)
	toolsEinfuegenHtml (html) {
		// Style-Block entfernen
		html = html.replace(/<style.*?>(.|\n)+?<\/style>/, "");
		// Inline-Styles löschen (widerspricht sonst der Content-Security-Policy)
		html = html.replace(/<([a-zA-Z0-9]+) .+?>/g, function(m, p1) {
			return `<${p1}>`;
		});
		// HTML in temporären Container schieben
		let container = document.createElement("div");
		container.innerHTML = html;
		// Inline-Tags, die erhalten bleiben bzw. ersetzt werden sollen
		let inline_keep = [
			"B",
			"CITE",
			"DEL",
			"DFN",
			"EM",
			"I",
			"MARK",
			"S",
			"SMALL",
			"STRONG",
			"SUB",
			"SUP",
			"U",
			"VAR",
		];
		const speziell = {
			"BIG": { // obsolete!
				ele: "span",
				class: "dta-groesser",
			},
			"DD": {
				ele: "b",
				class: "",
			},
			"H1": {
				ele: "span",
				class: "dta-groesser",
			},
			"H2": {
				ele: "span",
				class: "dta-groesser",
			},
			"H3": {
				ele: "span",
				class: "dta-groesser",
			},
			"H4": {
				ele: "span",
				class: "dta-groesser",
			},
			"H5": {
				ele: "span",
				class: "dta-groesser",
			},
			"H6": {
				ele: "span",
				class: "dta-groesser",
			},
		};
		// Text extrahieren
		let text = "";
		container.childNodes.forEach(function(i) {
			ana(i);
		});
		// erhaltene Inline-Auszeichnungen korrigieren
		for (let tag in speziell) {
			if (!speziell.hasOwnProperty(tag)) {
				continue;
			}
			let reg = new RegExp(`\\[#(${tag})\\](.+?)\\[\\/${tag}\\]`, "g");
			text = text.replace(reg, function(m, p1, p2) {
				let start = `<${speziell[p1].ele}`;
				if (speziell[p1].class) {
					start += ` class="${speziell[p1].class}"`;
				} 
				return `${start}>${p2}</${speziell[p1].ele}>`;
			});
		}
		for (let i = 0, len = inline_keep.length; i < len; i++) {
			const tag = inline_keep[i];
			let reg = new RegExp(`\\[#${tag}\\](.+?)\\[\\/${tag}\\]`, "g");
			text = text.replace(reg, function(m, p1) {
				return `<${tag.toLowerCase()}>${p1}</${tag.toLowerCase()}>`;
			});
		}
		// viele Absätze am Stück bereinigen
		text = text.replace(/\n{3,}/g, "\n\n");
		// gereinigtes HTML zurückgeben
		return helfer.textTrim(text, true);
		// rekursive Analyse der Tags
		//   ele = Element
		//     (Knoten im XML-Baum)
		function ana (ele) {
			if (ele.nodeType === 3) { // Text
				text += ele.nodeValue.replace(/\n/g, "");
			} else if (ele.nodeType === 1) { // Element
				// Inline-Elemente ggf. gesondert behandeln
				if (inline_keep.includes(ele.nodeName) || speziell[ele.nodeName]) {
					ele.insertBefore(document.createTextNode(`[#${ele.nodeName}]`), ele.firstChild);
					ele.appendChild(document.createTextNode(`[/${ele.nodeName}]`));
				} else if (ele.nodeName === "Q") {
					ele.insertBefore(document.createTextNode('"'), ele.firstChild);
					ele.appendChild(document.createTextNode('"'));
				} else if (ele.nodeName === "LI") {
					ele.insertBefore(document.createTextNode("– "), ele.firstChild);
				}
				// Block-Level-Elemente (und andere), die eine Sonderbehandlung benötigen
				if (/^(BR|DD|DT|FIGCAPTION|HR|LI|TR)$/.test(ele.nodeName)) { // Zeilenumbruch
					text += "\n";
				} else if (/^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIALOG|DIV|DL|FIELDSET|FIGURE|FOOTER|FORM|H([1-6]{1})|HEADER|MAIN|NAV|OL|P|PRE|SECTION|TABLE|UL)$/.test(ele.nodeName)) { // Absätze
					text = helfer.textTrim(text, false);
					text += "\n\n";
				}
				ele.childNodes.forEach(function(i) {
					ana(i);
				});
			}
		}
	},
	// Texttools Beleg
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsText (link) {
		// Sonderzeichen eingeben
		const aktion = link.getAttribute("class").replace(/.+-/, "");
		if (aktion === "sonderzeichen") {
			const feld = link.parentNode.previousSibling.getAttribute("for");
			sonderzeichen.oeffnen(feld);
			return;
		}
		// Fokus in <textarea>
		let ta = document.getElementById("beleg-bs");
		ta.focus();
		// Tags ermitteln
		let tags = {
			antiqua: {
				start: `<span class="dta-antiqua">`,
				ende: "</span>",
			},
			bold: {
				start: "<b>",
				ende: "</b>",
			},
			caps: {
				start: `<span class="dta-kapitaelchen">`,
				ende: "</span>",
			},
			italic: {
				start: "<i>",
				ende: "</i>",
			},
			mark: {
				start: `<mark class="user">`,
				ende: "</mark>",
			},
			size: {
				start: `<span class="dta-groesser">`,
				ende: "</span>",
			},
			spacing: {
				start: `<span class="dta-gesperrt">`,
				ende: "</span>",
			},
			strike: {
				start: "<s>",
				ende: "</s>",
			},
			superscript: {
				start: "<sup>",
				ende: "</sup>",
			},
			subscript: {
				start: "<sub>",
				ende: "</sub>",
			},
			underline: {
				start: "<u>",
				ende: "</u>",
			},
		};
		// illegales Nesting über die Absatzgrenze hinaus?
		let str_sel = window.getSelection().toString();
		if (/\n/.test(str_sel)) {
			const umbruch = str_sel.match(/\n/).index;
			ta.setSelectionRange(ta.selectionStart, ta.selectionStart + umbruch, "forward");
			str_sel = window.getSelection().toString();
		}
		// Auswahl ermitteln
		let start = ta.selectionStart,
			ende = ta.selectionEnd,
			str_start = ta.value.substring(0, start),
			str_ende = ta.value.substring(ende);
		// illegales Nesting von Inline-Tags?
		if (beleg.toolsTextNesting(str_sel)) {
			dialog.oeffnen("alert", function() {
				ta.focus();
			});
			dialog.text(`Die Formatierung kann an dieser Position nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nillegale Verschachtelung`);
			return;
		}
		// Aktion durchführen
		let reg_start = new RegExp(`${helfer.escapeRegExp(tags[aktion].start)}$`),
			reg_ende = new RegExp(`^${helfer.escapeRegExp(tags[aktion].ende)}`);
		if (reg_start.test(str_start) && reg_ende.test(str_ende)) { // Tag entfernen
			str_start = str_start.replace(reg_start, "");
			str_ende = str_ende.replace(reg_ende, "");
			start -= tags[aktion].start.length;
			ende -= tags[aktion].start.length;
		} else { // Tag hinzufüren
			str_sel = `${tags[aktion].start}${str_sel}${tags[aktion].ende}`;
			start += tags[aktion].start.length;
			ende += tags[aktion].start.length;
		}
		ta.value = `${str_start}${str_sel}${str_ende}`;
		// Auswahl wiederherstellen
		ta.setSelectionRange(start, ende, "forward");
		// neuen Text in data
		beleg.data.bs = ta.value;
		// Änderungsmarkierung setzen
		beleg.belegGeaendert(true);
	},
	// illegales Nesting ermitteln
	//   str = String
	//     (String mit [oder ohne] HTML-Tags)
	toolsTextNesting (str) {
		// Sind überhaupt Tags im String?
		let treffer = {
			auf: str.match(/<[a-z1-6]+/g),
			zu: str.match(/<\/[a-z1-6]+>/g),
		};
		if (!treffer.auf && !treffer.zu) {
			return false;
		}
		// Analysieren, ob zuerst ein schließender Tag erscheint
		let first_start = str.match(/<[a-z1-6]+/),
			first_end = str.match(/<\/[a-z1-6]+/);
		if (first_start && first_end && first_end.index < first_start.index) {
			return true; // offenbar illegales Nesting
		}
		// Anzahl der Treffer pro Tag ermitteln
		let tags = {
			auf: {},
			zu: {}
		};
		for (let i in treffer) {
			if (!treffer.hasOwnProperty(i)) {
				continue;
			}
			if (!treffer[i]) {
				continue;
			}
			for (let j = 0, len = treffer[i].length; j < len; j++) {
				const tag = treffer[i][j].replace(/<|>|\//g, "");
				if (!tags[i][tag]) {
					tags[i][tag] = 0;
				}
				tags[i][tag]++;
			}
		}
		// Analysieren, ob es Diskrepanzen zwischen den
		// öffnenden und schließenden Tags gibt
		let arr = ["auf", "zu"];
		for (let i = 0; i < 2; i++) {
			const a = arr[i],
				b = arr[i === 1 ? 0 : 1];
			for (let tag in tags[a]) {
				if (!tags[a].hasOwnProperty(tag)) {
					continue;
				}
				if (!tags[b][tag] || tags[a][tag] !== tags[b][tag]) {
					return true; // offenbar illegales Nesting
				}
			}
		}
		return false; // offenbar kein illegales Nesting
	},
	// Bewertung des Belegs vor- od. zurücknehmen
	//   stern = Element
	//     (Stern, auf den geklickt wurde, um eine Bewertung vorzunehmen)
	bewertung (stern) {
		let sterne = document.querySelectorAll("#beleg-bewertung a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (sterne[i] === stern) {
				let bewertung = i + 1;
				if (beleg.data.be === bewertung) {
					beleg.data.be = 0;
				} else {
					beleg.data.be = bewertung;
				}
				sterne[i].blur();
				break;
			}
		}
		beleg.belegGeaendert(true);
		beleg.bewertungAnzeigen();
	},
	// regelt die Anzeige der Bewertung des Belegs
	bewertungAnzeigen () {
		let sterne = document.querySelectorAll("#beleg-bewertung a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (i + 1 > beleg.data.be) {
				sterne[i].classList.remove("aktiv");
			} else {
				sterne[i].classList.add("aktiv");
			}
		}
	},
	// Verteilerfunktion, je nachdem welcher Event gerade stattfindet
	// (diese Funktion wird auch für die Sterne in der Filterliste benutzt)
	//   a = Element
	//     (Icon-Link mit dem Stern, der gerade aktiv ist)
	bewertungEvents (a) {
		// Mousover: Vorschau anzeigen
		a.addEventListener("mouseover", function() {
			let id = this.parentNode.id,
				sterne = document.querySelectorAll(`#${id} a`),
				aktivieren = true;
			for (let i = 0, len = sterne.length; i < len; i++) {
				if (aktivieren) {
					sterne[i].classList.add("aktiv");
					if (sterne[i] === this) {
						aktivieren = false;
					}
				} else {
					sterne[i].classList.remove("aktiv");
				}
			}
		});
		// Mouseout: die aktuelle Bewertung anzeigen
		a.addEventListener("mouseout", function() {
			let id = this.parentNode.id;
			if (/^beleg/.test(id)) {
				beleg.bewertungAnzeigen();
			} else if (/^filter/.test(id)) {
				filter.markierenSterne();
			}
		});
		// Click: den Zettel bewerten
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let id = this.parentNode.id;
			if (/^beleg/.test(id)) {
				beleg.bewertung(this);
			} else if (/^filter/.test(id)) {
				filter.anwendenSterne(this);
			}
		});
	},
	// Lesansicht umschalten
	//   user = Boolean
	//     (Leseansicht wurde durch User aktiv gewechselt)
	leseToggle (user) {
		// ggf. Annotierungs-Popup schließen
		annotieren.modSchliessen();
		// Suchleiste ggf. ausblenden
		if (document.getElementById("suchleiste")) {
			suchleiste.ausblenden();
		}
		// Ansicht umstellen
		let button = document.getElementById("beleg-link-leseansicht"),
			tab = document.querySelector("#beleg table"),
			an = true;
		if (button.classList.contains("aktiv")) {
			an = false;
			button.classList.add("beleg-opt-anzeige-letztes");
			button.title = "zur Leseansicht wechseln (Strg + U)";
			tab.classList.remove("leseansicht");
		} else {
			button.classList.remove("beleg-opt-anzeige-letztes");
			button.title = "zur Formularansicht wechseln (Strg + U)";
			tab.classList.add("leseansicht");
		}
		button.classList.toggle("aktiv");
		// Header-Icons ein- oder ausblenden
		document.querySelectorAll("#beleg .icon-leseansicht").forEach(function(i) {
			if (an) {
				i.classList.remove("aus");
			} else {
				i.classList.add("aus");
			}
		});
		// Title des Sprung-Icons anpassen
		if (an) {
			document.getElementById("beleg-link-springen").title = "zur nächsten Markierung springen (Strg + ↓)";
		} else {
			document.getElementById("beleg-link-springen").title = "zum Wort im Belegtext springen (Strg + ↓)";
		}
		// Einfüge-Icons ein- oder ausblenden
		document.querySelectorAll("#beleg .icon-tools-einfuegen").forEach(function(i) {
			if (an) {
				i.classList.add("aus");
			} else {
				i.classList.remove("aus");
			}
		});
		// Text-Tools für Beleg und Bedeutung ein- oder ausblenden
		let tools_beleg = document.querySelectorAll(".text-tools-beleg, .text-tools-bedeutung");
		for (let tools of tools_beleg) {
			if (an) {
				tools.classList.add("aus");
			} else {
				tools.classList.remove("aus");
			}
		}
		// Textwerte eintragen
		if (an) {
			beleg.leseFill();
		} else if (user) {
			document.querySelectorAll("#beleg textarea").forEach((textarea) => helfer.textareaGrow(textarea));
			document.getElementById("beleg-da").focus();
		}
	},
	// aktuelle Werte des Belegs in die Leseansicht eintragen
	leseFill () {
		// Sprungmarke zurücksetzen
		beleg.ctrlSpringenPos = -1;
		// Meta-Infos
		let cont = document.getElementById("beleg-lese-meta");
		helfer.keineKinder(cont);
		liste.metainfosErstellen(beleg.data, cont, "");
		if (!cont.hasChildNodes()) {
			cont.parentNode.classList.add("aus");
		} else {
			cont.parentNode.classList.remove("aus");
		}
		// Datensätze, die String sind
		for (let wert in beleg.data) {
			if (!beleg.data.hasOwnProperty(wert)) {
				continue;
			}
			// String?
			const v = beleg.data[wert];
			if (!helfer.checkType("String", v)) {
				continue;
			}
			// Container leeren
			let cont = document.getElementById(`beleg-lese-${wert}`);
			if (!cont) { // die Datumsdatensätze dc und dm werden nicht angezeigt
				continue;
			}
			helfer.keineKinder(cont);
			// Absätze einhängen
			const p = v.replace(/\n\s*\n/g, "\n").split("\n");
			let zuletzt_gekuerzt = false; // true, wenn der vorherige Absatz gekürzt wurde
			for (let i = 0, len = p.length; i < len; i++) {
				let nP = document.createElement("p");
				cont.appendChild(nP);
				nP.dataset.pnumber = i;
				nP.dataset.id = "";
				let text = p[i];
				if (!text) {
					text = " ";
				} else {
					// Absatz ggf. kürzen
					if (wert === "bs" &&
							optionen.data.beleg.kuerzen &&
							!liste.wortVorhanden(text)) {
						if (zuletzt_gekuerzt) {
							cont.removeChild(cont.lastChild);
						} else {
							liste.belegAbsatzGekuerzt(nP);
							zuletzt_gekuerzt = true;
						}
						continue;
					}
					zuletzt_gekuerzt = false;
					// Absatz einbinden
					if (!optionen.data.beleg.trennung) {
						text = liste.belegTrennungWeg(text, true);
					}
					if (wert !== "bd" && wert !== "bs") {
						text = helfer.escapeHtml(text);
					}
					if (/^(no|qu)$/.test(wert)) {
						text = liste.linksErkennen(text);
					}
					if (wert === "bs") {
						text = liste.belegWortHervorheben(text, true);
					}
				}
				nP.innerHTML = text;
				annotieren.init(nP);
			}
		}
		// Bedeutungen
		beleg.leseFillBedeutung();
		// Klick-Events an alles Links hängen
		document.querySelectorAll("#beleg .link").forEach(function(i) {
			helfer.externeLinks(i);
		});
	},
	// Bedeutungsfeld der Leseansicht füllen
	leseFillBedeutung () {
		let feldBd = beleg.bedeutungAufbereiten(),
			contBd = document.getElementById("beleg-lese-bd");
		helfer.keineKinder(contBd);
		if (feldBd) {
			feldBd.split("\n").forEach(function(i) {
				let bd = beleg.bedeutungSuchen(i),
					p = document.createElement("p");
				if (!bd.id) {
					i.split(": ").forEach(function(j) {
						let b = document.createElement("b");
						p.appendChild(b);
						b.textContent = "?";
						p.appendChild(document.createTextNode(j));
					});
				} else {
					p.innerHTML = bedeutungen.bedeutungenTief({
						gr: data.bd.gn,
						id: bd.id,
					});
				}
				let a = document.createElement("a");
				a.classList.add("icon-link", "icon-entfernen");
				a.dataset.bd = i;
				a.href = "#";
				beleg.leseBedeutungEx(a);
				p.insertBefore(a, p.firstChild);
				contBd.appendChild(p);
			});
		} else {
			let p = document.createElement("p");
			p.textContent = " ";
			contBd.appendChild(p);
		}
	},
	// Bedeutung in der Leseansicht aus dem Formular entfernen
	leseBedeutungEx (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Wert entfernen
			beleg.leseBedeutungExFeld(this.dataset.bd);
			// Ansicht auffrischen
			beleg.leseFillBedeutung();
			// Änderungsmarkierung setzen
			beleg.belegGeaendert(true);
			// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
			if (document.getElementById("suchleiste")) {
				suchleiste.suchen(true);
			}
		});
	},
	// Bedeutung aus dem Bedeutungsfeld entfernen
	// (wird auch anderweitig verwendet => darum ausgelagert)
	//   bd = String
	//     (die Bedeutung, in der Form, in der sie im Formularfeld stehen könnte)
	leseBedeutungExFeld (bd) {
		let reg = new RegExp(`${helfer.escapeRegExp(bd)}(\n|$)`),
			feld = document.getElementById("beleg-bd");
		if (!reg.test(feld.value)) {
			return false; // den Rückgabewert braucht man für das Austragen aus dem Bedeutungsgerüst-Fenster heraus
		}
		feld.value = feld.value.replace(reg, "");
		feld.value = beleg.bedeutungAufbereiten();
		helfer.textareaGrow(feld);
		return true;
	},
	// Verteilerfunktion für die Links im <caption>-Block
	//   a = Element
	//     (Link, auf den geklickt wurde)
	ctrlLinks (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (/navi-vorheriger$/.test(this.id)) {
				beleg.ctrlNavi(false);
			} else if (/navi-naechster$/.test(this.id)) {
				beleg.ctrlNavi(true);
			} else if (/leseansicht$/.test(this.id)) {
				beleg.leseToggle(true);
			} else if (/kuerzen$/.test(this.id)) {
				beleg.ctrlKuerzen();
			} else if (/trennung$/.test(this.id)) {
				beleg.ctrlTrennung();
			} else if (/springen$/.test(this.id)) {
				beleg.ctrlSpringen();
			} else if (/kopieren$/.test(this.id)) {
				kopieren.addKarte();
			} else if (/zwischenablage$/.test(this.id)) {
				beleg.ctrlZwischenablage(beleg.data);
			} else if (/duplikat/.test(this.id)) {
				beleg.ctrlDuplikat();
			} else if (/suchleiste$/.test(this.id)) {
				suchleiste.einblenden();
			}
		});
	},
	// Kürzung des Belegkontexts in der Leseansicht ein- bzw. ausblenden
	ctrlKuerzen () {
		// Hervorhebung umstellen
		optionen.data.beleg.kuerzen = !optionen.data.beleg.kuerzen;
		optionen.speichern();
		// Link anpassen
		beleg.ctrlKuerzenAnzeige();
		// Belegtext in der Leseansicht ggf. neu aufbauen
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.leseFill();
		}
		// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
		if (document.getElementById("suchleiste")) {
			suchleiste.suchen(true);
		}
	},
	// Kürzung des Belegkontexts in der Leseansicht ein- bzw. ausblenden (Anzeige)
	ctrlKuerzenAnzeige () {
		let link = document.getElementById("beleg-link-kuerzen");
		if (optionen.data.beleg.kuerzen) {
			link.classList.add("aktiv");
			link.title = "Belegkontext anzeigen (Strg + K)";
		} else {
			link.classList.remove("aktiv");
			link.title = "Belegkontext kürzen (Strg + K)";
		}
	},
	// Trennstriche in der Leseansicht ein- bzw. ausblenden
	ctrlTrennung () {
		// Hervorhebung umstellen
		optionen.data.beleg.trennung = !optionen.data.beleg.trennung;
		optionen.speichern();
		// Link anpassen
		beleg.ctrlTrennungAnzeige();
		// Belegtext in der Leseansicht ggf. neu aufbauen
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.leseFill();
		}
		// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
		if (document.getElementById("suchleiste")) {
			suchleiste.suchen(true);
		}
	},
	// Trennstriche in der Leseansicht ein- bzw. ausblenden (Anzeige)
	ctrlTrennungAnzeige () {
		let link = document.getElementById("beleg-link-trennung");
		if (optionen.data.beleg.trennung) {
			link.classList.add("aktiv");
			link.title = "Silbentrennung nicht anzeigen (Strg + T)";
		} else {
			link.classList.remove("aktiv");
			link.title = "Silbentrennung anzeigen (Strg + T)";
		}
	},
	// Verteiler für die Sprungfunktion (Ctrl + ↓)
	//   evt = Event-Objekt
	//     (kann fehlen, wenn über den Link im Kopf des Belegs aufgerufen)
	ctrlSpringen (evt = null) {
		// Springen unterbinden, wenn (1.) Fokus in Dropdownfeld + (2.) Auslöser Tastaturkürzel
		if (evt && document.activeElement.classList.contains("dropdown-feld")) {
			return;
		}
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.ctrlSpringenLese();
		} else {
			beleg.ctrlSpringenForm(evt);
		}
	},
	// das letzte Element, zu dem in der Karteikarte gesprungen wurde
	ctrlSpringenPos: -1,
	// durch die Hervorhebungen in der Leseansicht der Karteikarte springen
	ctrlSpringenLese () {
		let marks = document.querySelectorAll("#beleg mark.suchleiste, #beleg-lese-bs mark.user, #beleg-lese-bs mark.wort");
		if (!marks.length) {
			dialog.oeffnen("alert");
			dialog.text("Keine Markierung gefunden.");
			return;
		}
		// Element ermitteln
		beleg.ctrlSpringenPos++;
		if (beleg.ctrlSpringenPos >= marks.length) {
			beleg.ctrlSpringenPos = 0;
		}
		// Zur Position springen
		let rect = marks[beleg.ctrlSpringenPos].getBoundingClientRect(),
			quick = document.getElementById("quick"),
			quick_height = quick.offsetHeight;
		const header_height = document.querySelector("body > header").offsetHeight,
			beleg_header_height = document.querySelector("#beleg header").offsetHeight;
		if (!quick.classList.contains("an")) {
			quick_height = 0;
		}
		const platz = window.innerHeight - header_height - beleg_header_height - quick_height;
		window.scrollTo({
			left: 0,
			top: window.scrollY + rect.bottom - window.innerHeight + Math.round(platz / 2),
			behavior: "smooth",
		});
		// Element markieren
		const pos = beleg.ctrlSpringenPos; // für schnelles Springen zwischenspeichern
		marks[pos].classList.add("mark");
		let marked = [pos];
		// ggf. direkt anhängende Elemente auch noch hervorheben
		if (/-kein-ende/.test(marks[pos].getAttribute("class"))) {
			for (let i = pos + 1, len = marks.length; i < len; i++) {
				beleg.ctrlSpringenPos++;
				marked.push(i);
				let m = marks[i];
				if (/-kein-start/.test(m.getAttribute("class")) &&
						!/-kein-ende/.test(m.getAttribute("class"))) {
					m.classList.add("mark");
					break;
				}
				m.classList.add("mark");
			}
		}
		setTimeout(function() {
			for (let i of marked) {
				marks[i].classList.remove("mark");
			}
		}, 1000);
	},
	// regulärer Ausdruck für den Sprung im Beleg-Formular
	ctrlSpringenFormReg: {
		reg: null,
		again: false,
	},
	// regulären Ausdruck für den Sprung im Beleg-Formular zurücksetzen
	ctrlSpringenFormReset () {
		beleg.ctrlSpringenFormReg.reg = new RegExp(`[^${helfer.ganzesWortRegExp.links}]*(${helfer.formVariRegExpRegs.join("|")})[^${helfer.ganzesWortRegExp.rechts}]*`, "gi");
	},
	// <textarea> mit dem Belegtext zum Wort scrollen
	ctrlSpringenForm (evt) {
		if (evt) {
			evt.preventDefault();
		}
		let textarea = document.getElementById("beleg-bs"),
			val = textarea.value,
			search = beleg.ctrlSpringenFormReg.reg.exec(val);
		if (search) { // Wort gefunden
			beleg.ctrlSpringenFormReg.again = false;
			const ende = search.index + search[0].length;
			textarea.scrollTop = 0;
			textarea.value = val.substring(0, ende);
			textarea.scrollTop = ende;
			textarea.value = val;
			if (textarea.scrollTop > 0) {
				textarea.scrollTop = textarea.scrollTop + 120;
			}
			textarea.setSelectionRange(search.index, ende);
			textarea.focus();
		} else if (beleg.ctrlSpringenFormReg.again) { // Wort zum wiederholten Mal nicht gefunden => Wort nicht im Belegtext (oder nicht auffindbar)
			beleg.ctrlSpringenFormReg.again = false;
			dialog.oeffnen("alert", function() {
				textarea.scrollTop = 0;
				textarea.setSelectionRange(0, 0);
				textarea.focus();
			});
			dialog.text("Wort nicht gefunden.");
		} else { // Wort nicht gefunden => entweder nicht im Belegtext oder nicht von Index 0 aus gesucht => noch einmal suchen
			beleg.ctrlSpringenFormReg.again = true;
			beleg.ctrlSpringenForm(evt);
		}
	},
	// Kopiert den aktuellen Beleg in die Zwischenablage,
	// sodass er in eine andere Kartei kopiert werden kann
	//   dt = Object
	//     (das Datenobjekt, aus dem heraus der Beleg in die Zwischenablage kopiert werden soll)
	ctrlZwischenablage (dt) {
		const {clipboard, remote} = require("electron"),
			daten = kopieren.datenBeleg(dt);
		daten.typ = "bwgd";
		daten.version = 1;
		daten.winId = remote.getCurrentWindow().id;
		daten.wort = kartei.wort;
		clipboard.writeText(JSON.stringify(daten));
		helfer.animation("zwischenablage");
	},
	// Dupliziert den übergebenen Beleg
	ctrlDuplikat () {
		// Versuchen noch nicht gespeicherte Änderungen anzuwenden;
		// scheitert das => abbrechen
		if (beleg.geaendert && !beleg.aktionSpeichern(true)) {
			return;
		}
		// Duplizieren kann durchgeführt werden
		const daten = [kopieren.datenBeleg(beleg.data)],
			id_karte = kopieren.einfuegenEinlesen(daten, true);
		// Duplikat öffnen (in derselben Ansicht)
		let leseansicht = document.getElementById("beleg-link-leseansicht");
		const leseansicht_status = leseansicht.classList.contains("aktiv");
		beleg.oeffnen(id_karte);
		if (leseansicht.classList.contains("aktiv") !== leseansicht_status) {
			beleg.leseToggle(true);
		}
		// Animation anzeigen
		helfer.animation("duplikat");
	},
	// zur vorherigen/nächsten Karteikarte in der Belegliste springen
	//   next = Boolean
	//     (nächste Karte anzeigen)
	ctrlNavi (next) {
		// Karteikarte geändert?
		if (beleg.geaendert) {
			sicherheitsfrage.warnen(function() {
				beleg.geaendert = false;
				fokus();
				beleg.ctrlNavi(next);
			}, {
				notizen: false,
				tagger: false,
				bedeutungen: false,
				beleg: true,
				kartei: false,
			});
			return;
		}
		// Belege in der Liste und Position des aktuellen Belegs ermitteln
		let belege = [];
		document.querySelectorAll(".liste-kopf").forEach(function(i) {
			belege.push(i.dataset.id);
		});
		let pos = belege.indexOf("" + beleg.id_karte);
		// neue Position
		if (next) {
			pos++;
		} else {
			pos--;
		}
		if (pos === -2) { // kann bei neuen, noch nicht gespeicherten Karteikarten passieren
			pos = 0;
		}
		// erster oder letzter Beleg erreicht!
		if (pos < 0 || pos === belege.length) {
			dialog.oeffnen("alert", function() {
				fokus();
			});
			dialog.text(`Der aktuelle Beleg ist ${next ? "der letzte" : "der erste" } in der Belegliste.`);
			return;
		}
		// neuen Beleg öffnen:
		//   1. in derselben Ansicht
		//   2. mit demselben Icon fokussiert
		//   3. mit derselben Scroll-Position
		let leseansicht = document.getElementById("beleg-link-leseansicht");
		const leseansicht_status = leseansicht.classList.contains("aktiv"),
			scroll = window.scrollY;
		beleg.oeffnen(parseInt(belege[pos], 10));
		if (leseansicht.classList.contains("aktiv") !== leseansicht_status) {
			beleg.leseToggle(true);
		}
		fokus();
		window.scrollTo({
			left: 0,
			top: scroll,
			behavior: "auto",
		}); // nach fokus()! Das sollte nicht smooth sein!
		// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
		if (document.getElementById("suchleiste")) {
			suchleiste.suchen(true);
		}
		// Icon fokussieren
		function fokus () {
			let icon;
			if (next) {
				icon = document.getElementById("beleg-link-navi-naechster");
			} else {
				icon = document.getElementById("beleg-link-navi-vorheriger");
			}
			icon.focus();
		}
	},
	// typographische Aufbereitung des aktuellen Inhalts des Bedeutungsfeldes
	bedeutungAufbereiten () {
		return helfer.textTrim(document.getElementById("beleg-bd").value, true).replace(/::/g, ": ").replace(/\n\s*\n/g, "\n");
	},
	// sucht eine Bedeutung im Bedeutungsgerüst
	//   bd = String
	//     (die Bedeutung)
	//   gn = String || undefined
	//     (ID des Gerüsts, in dem gesucht werden soll)
	bedeutungSuchen (bd, gn = data.bd.gn) {
		let bdS = bd.split(": "),
			bdA = data.bd.gr[gn].bd;
		// Alias ggf. durch vollen Bedeutungsstring ersetzen
		bdS = beleg.bedeutungAliasAufloesen(bdS, bdA);
		// Bedeutung suchen => ID zurückgeben
		const bdSJ = bdS.join(": ");
		for (let i = 0, len = bdA.length; i < len; i++) {
			if (bdA[i].bd.join(": ").replace(/<.+?>/g, "") === bdSJ) {
				return {
					idx: i,
					id: bdA[i].id,
				};
			}
		}
		// Bedeutung nicht gefunden (IDs beginnen mit 1)
		return {
			idx: -1,
			id: 0,
		};
	},
	// manuell eingetragene Bedeutung in den Bedeutungsbaum einhängen
	// (wird nur aufgerufen, wenn die Bedeutung noch nicht vorhanden ist)
	//   bd = String
	//     (die Bedeutung; Hierarchien getrennt durch ": ")
	//   gn = String || undefined
	//     (ID des Gerüsts, in dem gesucht werden soll)
	bedeutungErgaenzen (bd, gn = data.bd.gn) {
		// Zeiger auf das betreffende Gerüst ermitteln
		let gr = data.bd.gr[gn];
		// ggf. höchste ID ermitteln
		if (!bedeutungen.makeId) {
			let lastId = 0;
			gr.bd.forEach(function(i) {
				if (i.id > lastId) {
					lastId = i.id;
				}
			});
			bedeutungen.makeId = bedeutungen.idGenerator(lastId + 1);
		}
		// Alias ggf. durch vollen Bedeutungsstring ersetzen
		let bdS = bd.split(": ");
		bdS = beleg.bedeutungAliasAufloesen(bdS, gr.bd);
		// jetzt wird's kompliziert: korrekte Position der Bedeutung im Gerüst suchen
		let slice = 1,
			arr = bdS.slice(0, slice),
			arrVor = [],
			arrTmpVor = [],
			pos = -1; // der Index, an dessen Stelle das Einfügen beginnt
		// 1) Position (initial) und Slice finden
		for (let i = 0, len = gr.bd.length; i < len; i++) {
			let arrTmp = gr.bd[i].bd.slice(0, slice);
			if (arrTmp.join(": ") === arr.join(": ")) {
				pos = i;
				// passender Zweig gefunden
				if (slice === bdS.length) {
					// hier geht es nicht weiter
					break;
				} else {
					// weiter in die Tiefe wandern
					arrVor = [...arr];
					arrTmpVor = [...arrTmp];
					slice++;
					arr = bdS.slice(0, slice);
				}
			} else if (arrVor.join(": ") !== arrTmpVor.join(": ")) {
				// jetzt bin ich zu weit: ein neuer Zweig beginnt
				break;
			}
		}
		let bdAdd = bdS.slice(slice - 1);
		// 2) Position korrigieren (hoch zum Slot, an dessen Stelle eingefügt wird)
		if (pos === -1 || pos === gr.bd.length - 1) { // Sonderregel: die Bedeutung muss am Ende eingefügt werden
			pos = gr.bd.length;
		} else {
			let i = pos,
				len = gr.bd.length;
			do { // diese Schleife muss mindestens einmal durchlaufen; darum keine gewöhnliche for-Schleife
				i++;
				if (!gr.bd[i] || gr.bd[i].bd.length <= arrVor.length) {
					pos = i;
					break;
				}
			} while (i < len);
		}
		// 3) jetzt kann eingehängt werden (die nachfolgenden Slots rutschen alle um einen hoch)
		for (let i = 0, len = bdAdd.length; i < len; i++) {
			let bd = arrVor.concat(bdAdd.slice(0, i + 1));
			gr.bd.splice(pos + i, 0, bedeutungen.konstitBedeutung(bd));
		}
		// Zählung auffrischen
		bedeutungen.konstitZaehlung(gr.bd, gr.sl);
		// ID zurückgeben
		return beleg.bedeutungSuchen(bd, gn);
	},
	// Alias durch vollen Bedeutungsstring ersetzen
	//   bdS = Array
	//     (in diesen Bedeutungen sollen die Aliasses aufgelöst werden)
	//   bdA = Array
	//     (in diesen Bedeutungen soll nach den Aliases gesucht werden)
	bedeutungAliasAufloesen (bdS, bdA) {
		for (let i = 0, len = bdS.length; i < len; i++) {
			for (let j = 0, len = bdA.length; j < len; j++) {
				if (bdS[i] === bdA[j].al) {
					bdS[i] = bdA[j].bd[bdA[j].bd.length - 1].replace(/<.+?>/g, "");
					break;
				}
			}
		}
		return bdS;
	},
	// trägt eine Bedeutung, die aus dem Bedeutungen-Fenster an das Hauptfenster geschickt wurde,
	// in einer oder mehreren Karten ein oder aus (Verteilerfunktion)
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	//   eintragen = Boolean
	//     (eintragen oder austragen)
	bedeutungEinAustragen (bd, eintragen) {
		// Ziel ermitteln
		if (!document.getElementById("beleg").classList.contains("aus")) {
			if (eintragen) {
				beleg.bedeutungEintragenKarte(bd);
			} else {
				beleg.bedeutungAustragenKarte(bd);
			}
			return;
		} else if (!document.getElementById("liste").classList.contains("aus")) {
			if (eintragen) {
				beleg.bedeutungEintragenListe(bd);
			} else {
				beleg.bedeutungAustragenListe(bd);
			}
			return;
		}
		// unklar, wo eingetragen werden soll => Fehlermeldung
		dialog.oeffnen("alert");
		dialog.text("Weder eine Karteikarte noch die Belegliste ist geöffnet.\nDie Bedeutung kann nur eingetragen werden, wenn eine der beiden Ansichten aktiv ist.");
	},
	// Bedeutung in eine einzelne Karteikarte eintragen
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	bedeutungEintragenKarte (bd) {
		// nicht aktives Gerüst => einfach eintragen, wenn nicht vorhanden
		if (data.bd.gn !== bd.gr) {
			if (bedeutungen.schonVorhanden({
						bd: beleg.data.bd,
						gr: bd.gr,
						id: bd.id,
					})[0]) {
				dialog.oeffnen("alert");
				dialog.text("Die Bedeutung wurde <strong>nicht</strong> eingetragen. Grund: Sie ist schon vorhanden.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)");
				return;
			}
			beleg.data.bd.push({...bd});
			beleg.belegGeaendert(true);
			dialog.oeffnen("alert");
			dialog.text("Die Bedeutung wurde eingetragen.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)");
			return;
		}
		// aktives Gerüst => Text ermitteln und an die Dropdown-Funktion übergeben
		let text = bedeutungen.bedeutungenTief({
			gr: bd.gr,
			id: bd.id,
			za: false,
			strip: true,
		});
		dropdown.caller = "beleg-bd";
		dropdown.cursor = -1;
		dropdown.auswahl(document.getElementById("beleg-bd"), text);
	},
	// Bedeutung aus einer einzelneb Karteikarte entfernen
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	bedeutungAustragenKarte (bd) {
		// nicht aktives Gerüst => einfach austragen, wenn vorhanden
		if (data.bd.gn !== bd.gr) {
			let vorhanden = bedeutungen.schonVorhanden({
				bd: beleg.data.bd,
				gr: bd.gr,
				id: bd.id,
			});
			if (vorhanden[0]) {
				beleg.data.bd.splice(vorhanden[1], 1);
				beleg.belegGeaendert(true);
				dialog.oeffnen("alert");
				dialog.text("Die Bedeutung wurde entfernt.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)");
				return;
			}
			dialog.oeffnen("alert");
			dialog.text("Die Bedeutung wurde <strong>nicht</strong> entfernt. Grund: Sie ist der aktuellen Karteikarte überhaupt nicht zugeordnet.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)");
			return;
		}
		// aktives Gerüst => Text ermitteln und entfernen
		let text = bedeutungen.bedeutungenTief({
			gr: bd.gr,
			id: bd.id,
			za: false,
			strip: true,
		});
		const ex = beleg.leseBedeutungExFeld(text);
		if (!ex) {
			dialog.oeffnen("alert");
			dialog.text("Die Bedeutung wurde <strong>nicht</strong> entfernt. Grund: Sie ist der aktuellen Karteikarte überhaupt nicht zugeordnet.");
			return;
		}
		beleg.belegGeaendert(true);
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.leseFillBedeutung();
		}
	},
	// Bedeutung in jede Karte der Belegliste eintragen
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	bedeutungEintragenListe (bd) {
		let bdText = bedeutungen.bedeutungenTief({gr: bd.gr, id: bd.id});
		bdText = bdText.replace(/<b>/, `<b class="zaehlung">`); // erstes Zählzeichen
		bdText = bdText.replace(/<b>/g, `<b class="zaehlung nach-text">`); // weitere Zählzeichen
		// keine Belege in der Liste
		if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
			dialog.oeffnen("alert");
			dialog.text(`Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum in keine Karteikarte eingetragen werden.`);
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				// Bedeutung eintragen
				document.querySelectorAll("#liste-belege-cont .liste-kopf").forEach(function(i) {
					const id = i.dataset.id;
					if (!bedeutungen.schonVorhanden({
								bd: data.ka[id].bd,
								gr: bd.gr,
								id: bd.id,
							})[0]) {
						data.ka[id].bd.push({...bd});
					}
				});
				kartei.karteiGeaendert(true);
				// Rückmeldung
				let geruest_inaktiv = "\n(Im Hauptfenster ist ein anderes Gerüst als im Bedeutungsgerüst-Fenster eingestellt.)";
				if (data.bd.gn === bd.gr) {
					geruest_inaktiv = "";
				}
				dialog.oeffnen("alert");
				dialog.text(`Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde in allen Karteikarten der Belegliste ergänzt.${geruest_inaktiv}`);
				// Liste auffrischen
				if (!geruest_inaktiv) {
					liste.status(true);
				}
			}
		});
		dialog.text(`Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich in alle Karteikarten, die derzeit in der Belegliste sichtbar sind, eingetragen werden?`);
	},
	// Bedeutung aus jeder Karte der Belegliste entfernen
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	bedeutungAustragenListe (bd) {
		const bdText = bedeutungen.bedeutungenTief({gr: bd.gr, id: bd.id});
		// keine Belege in der Liste
		if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
			dialog.oeffnen("alert");
			dialog.text(`Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum aus keiner Karteikarte entfernt werden.`);
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				// Bedeutung eintragen
				let treffer = false;
				document.querySelectorAll("#liste-belege-cont .liste-kopf").forEach(function(i) {
					const id = i.dataset.id;
					let vorhanden = bedeutungen.schonVorhanden({
						bd: data.ka[id].bd,
						gr: bd.gr,
						id: bd.id,
					});
					if (vorhanden[0]) {
						data.ka[id].bd.splice(vorhanden[1], 1);
						treffer = true;
					}
				});
				// Rückmeldung
				let geruest_inaktiv = "\n(Im Hauptfenster ist ein anderes Gerüst als im Bedeutungsgerüst-Fenster eingestellt.)";
				if (data.bd.gn === bd.gr) {
					geruest_inaktiv = "";
				}
				if (!treffer) {
					dialog.oeffnen("alert");
					dialog.text(`Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde in keiner der Karteikarten in der aktuellen Belegliste gefunden.${geruest_inaktiv}`);
					return;
				}
				dialog.oeffnen("alert");
				dialog.text(`Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde aus allen Karteikarten der Belegliste entfernt.${geruest_inaktiv}`);
				// Änderungsmarkierung
				kartei.karteiGeaendert(true);
				// Liste auffrischen
				if (!geruest_inaktiv) {
					liste.status(true);
				}
			}
		});
		dialog.text(`Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich aus allen Karteikarten, die derzeit in der Belegliste sichtbar sind, entfernt werden?`);
	},
};
