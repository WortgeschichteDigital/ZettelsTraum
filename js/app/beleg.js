"use strict";

let beleg = {
	// speichert, ob die Leseansicht gerade angezeigt wird
	// (ansonsten sieht man die Formularansicht)
	leseansicht: false,
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// Kopie der Daten der aktuell angezeigten Karte
	data: {},
	// Liste häufig verwendeter Korpora für das Dropdown-Menü
	korpora: [
		"DTA",
		"IDS",
		"DWDS: Kernkorpus",
		"DWDS: Kernkorpus 21",
		"DWDS: Zeitungskorpus",
		"DWDS: Berliner Zeitung",
		"DWDS: Berliner Wendecorpus",
		"DWDS: Blogs",
		"DWDS: DDR",
		"DWDS: Dortmunder Chat-Korpus",
		"DWDS: Filmuntertitel",
		"DWDS: Gesprochene Sprache",
		"DWDS: IT-Blogs",
		"DWDS: Mode- und Beauty-Blogs",
		"DWDS: neues deutschland",
		"DWDS: Politische Reden",
		"DWDS: Polytechnisches Journal",
		"DWDS: Referenz- und Zeitungskorpora",
		"DWDS: Tagesspiegel",
		"DWDS: Text+Berg",
		"DWDS: Webkorpus 2016c",
		"DWDS: Die ZEIT",
		"DWDS: ZDL-Regionalkorpus",
	],
	// neue Karteikarte erstellen
	async erstellen () {
		// registrieren, dass die Hauptfunktion "Karteikarte" offen ist
		helfer.hauptfunktion = "karte";
		// alle Overlay-Fenster schließen
		await overlay.alleSchliessen();
		// nächste ID ermitteln
		beleg.id_karte = beleg.idErmitteln();
		// neues Karten-Objekt anlegen
		beleg.data = beleg.karteErstellen();
		// ggf. die Leseansicht verlassen
		if (beleg.leseansicht) {
			beleg.leseToggle(false);
		}
		// Karte anzeigen
		beleg.formular(true);
		// Fenster nach oben scrollen
		window.scrollTo({
			left: 0,
			top: 0,
			behavior: "smooth",
		});
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
			bx: "", // Beleg-XML
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
			up: false, // ungeprüft
		};
	},
	// bestehende Karteikarte öffnen
	//   id = Number
	//     (ID der Karte, die geöffnet werden soll)
	oeffnen (id) {
		// registrieren, dass die Hauptfunktion "Karteikarte" offen ist
		helfer.hauptfunktion = "karte";
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
		if (optionen.data.einstellungen.leseansicht) {
			beleg.formular(false); // wegen der Bedeutungen *vor* dem Füllen der Leseansicht
			if (!beleg.leseansicht) {
				beleg.leseToggle(false);
			} else {
				beleg.leseFill();
			}
		} else {
			if (beleg.leseansicht) {
				beleg.leseToggle(false);
			}
			beleg.formular(false); // wegen der Textarea-Größe *nach* dem Umschalten der Leseansicht
		}
	},
	// Formular füllen und anzeigen
	//   neu = Boolean
	//     (neue Karteikarte erstellen)
	async formular (neu) {
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
			} else if (/^(bd|datei-latin1)$/.test(feld)) {
				continue;
			} else if (felder[i].type === "checkbox") {
				felder[i].checked = beleg.data[feld];
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
		anhaenge.auflisten(document.getElementById("beleg-an"), "beleg|data|an");
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
		// (hier braucht es eine Verzögerung: Wird die Karte z.B. direkt nach dem
		// Erstellen einer neuen Wortkartei aufgerufen, wird der fokussierte Button
		// automatisch ausgeführt, wenn man Enter gedrückt hat)
		await new Promise(resolve => setTimeout(() => resolve(true), 25));
		if (neu && !beleg.leseansicht) {
			// Was ist in der Zwischenablage?
			const {clipboard} = require("electron"),
				cp = clipboard.readText().trim(),
				ppnCp = belegImport.PPNCheck({ppn: cp}) ? true : false,
				dwds = belegImport.DWDSXMLCheck(cp),
				xml = belegImport.XMLCheck({xmlStr: cp}),
				bibtexCp = belegImport.BibTeXCheck(cp);
			if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(cp)) { // DTA-URL
				beleg.formularImport("dta");
			} else if (dwds) { // DWDS-Snippet
				belegImport.DWDS(dwds, "– Zwischenablage –", false);
				beleg.formularImport("dwds");
			} else if (xml) {
				belegImport.XML(cp, "– Zwischenablage –", false);
				beleg.formularImport("xml");
			} else if (bibtexCp) {
				belegImport.BibTeX(cp, "– Zwischenablage –", false);
				beleg.formularImport("bibtex");
			} else if (ppnCp) {
				belegImport.PPNAnzeigeKarteikarte({typ: "xml"});
			} else if (belegImport.Datei.data.length) {
				beleg.formularImport(belegImport.Datei.typ);
			} else {
				let feld = document.querySelector("#beleg-da");
				if (optionen.data.einstellungen["karteikarte-fokus-beleg"]) {
					feld = document.querySelector("#beleg-bs");
				}
				feld.focus();
			}
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
						/^https?:\/\/www\.deutschestextarchiv\.de\//.test(this.value)) { // Bis-Seite ermitteln und eintragen
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
				let noLeer = "";
				if (feld === "no" && /^\n/.test(this.value)) {
					// am Anfang der Notizen müssen Leerzeilen erlaubt sein,
					// weil die erste Zeile in der Belegliste angezeigt werden kann
					noLeer = this.value.match(/^\n+/)[0];
				}
				beleg.data[feld] = noLeer + helfer.textTrim(this.value, true);
			}
			beleg.belegGeaendert(true);
		});
	},
	// zwischen den Import-Formularen hin- und herschalten (Listener)
	//   radio = Element
	//     (Radio-Button zum Umschalten des Import-Formulars)
	formularImportListener (radio) {
		radio.addEventListener("change", function() {
			const src = this.id.replace(/.+-/, "");
			beleg.formularImport(src);
		});
	},
	// zwischen den Import-Formularen hin- und herschalten
	//   src = String
	//     (ID der Quelle, aus der importiert werden soll: dta || dwds || dereko || xml || bibtex)
	formularImport (src) {
		// ggf. src umstellen
		src = src === "ppn" ? "xml" : src;
		// Checkbox für ISO 8859-15 umstellen
		let latin1 = document.getElementById("beleg-datei-latin1");
		if (src === "dereko") {
			latin1.checked = true;
		} else {
			latin1.checked = false;
		}
		// Radio-Buttons umstellen
		// (weil Wechsel nicht nur auf Klick, sondern auch automatisch geschieht)
		let radios = ["beleg-import-dta", "beleg-import-dwds", "beleg-import-dereko", "beleg-import-xml", "beleg-import-bibtex"];
		for (let r of radios) {
			let radio = document.getElementById(r);
			if (r.includes(src)) {
				radio.checked = true;
			} else {
				radio.checked = false;
			}
		}
		// Formular umstellen
		let forms = ["beleg-form-dta", "beleg-form-datei"],
			formsZiel = src;
		if (/^(dwds|dereko|xml|bibtex)/.test(src)) {
			formsZiel = "datei";
		}
		let eleAktiv = null;
		for (let f of forms) {
			let ele = document.getElementById(f);
			if (f.includes(formsZiel)) {
				ele.classList.remove("aus");
				eleAktiv = ele;
			} else {
				ele.classList.add("aus");
			}
		}
		// Fokus setzen
		if (/^(dwds|dereko|xml|bibtex)$/.test(src)) {
			let inputs = eleAktiv.querySelectorAll("input");
			if (src === belegImport.Datei.typ &&
					belegImport.Datei.data.length ||
				 belegImport.Datei.typ === "ppn") {
				inputs[inputs.length - 1].focus();
			} else {
				inputs[inputs.length - 2].focus();
			}
			// ggf. Dateiname eintragen
			beleg.formularImportDatei(src);
		} else {
			eleAktiv.querySelector("input").focus();
		}
	},
	// ggf. Dateiname eintragen
	//   src = String
	//     (ID der Quelle, aus der importiert werden soll: dwds || dereko || xml || bibtex)
	formularImportDatei (src) {
		let name = document.getElementById("beleg-datei-name");
		if (src === "dwds" && belegImport.Datei.typ === "dwds" ||
				src === "dereko" && belegImport.Datei.typ === "dereko" ||
				src === "xml" && belegImport.Datei.typ === "xml" ||
				src === "bibtex" && belegImport.Datei.typ === "bibtex" ||
				/^(xml|bibtex)$/.test(src) && belegImport.Datei.typ === "ppn") {
			name.textContent = `\u200E${belegImport.Datei.pfad}\u200E`; // vgl. meta.oeffnen()
			name.classList.remove("leer");
		} else {
			name.textContent = "keine Datei geladen";
			name.classList.add("leer");
		}
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
			} else if (aktion === "datei-oeffnen") {
				belegImport.DateiOeffnen();
			} else if (aktion === "datei-importieren") {
				belegImport.DateiImport();
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
			if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie müssen ein Datum angeben.",
					callback: () => {
						beleg.selectFormEle(da);
					},
				});
			} else {
				beleg.selectFormEle(da);
				beleg.fehlerFormEle(da);
			}
			return false;
		}
		// Test: Datum mit vierstelliger Jahreszahl oder Jahrhundertangabe?
		if (!/[0-9]{4}|[0-9]{2}\.\sJh\./.test(dav)) {
			if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
				dialog.oeffnen({
					typ: "alert",
					text: "Das Datum muss eine vierstellige Jahreszahl (z. B. „1813“) oder eine Jahrhundertangabe (z. B. „17. Jh.“) enthalten.\nZusätzlich können auch andere Angaben gemacht werden (z. B. „ca. 1815“, „1610, vielleicht 1611“).",
					callback: () => {
						beleg.selectFormEle(da);
					},
				});
			} else {
				beleg.selectFormEle(da);
				beleg.fehlerFormEle(da);
			}
			return false;
		}
		// Test: Beleg angegeben?
		let bs = document.getElementById("beleg-bs");
		if (!helfer.textTrim(bs.value, true)) {
			if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie müssen einen Beleg eingeben.",
					callback: () => {
						beleg.selectFormEle(bs);
					},
				});
			} else {
				beleg.selectFormEle(bs);
				beleg.fehlerFormEle(bs);
			}
			return false;
		}
		// Test: Quelle angegeben?
		let qu = document.getElementById("beleg-qu");
		if (!helfer.textTrim(qu.value, true)) {
			if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie müssen eine Quelle angeben.",
					callback: () => {
						beleg.selectFormEle(qu);
					},
				});
			} else {
				beleg.selectFormEle(qu);
				beleg.fehlerFormEle(qu);
			}
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
					dialog.oeffnen({
						typ: "alert",
						text: "Beim Speichern der Karteikarte ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nEinhängen der neuen Bedeutung in das Bedeutungsgerüst fehlgeschalgen",
					});
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
	// ein Element soll selektiert werden;
	// ist es nicht im Blick => in den Blick scrollen
	//   ele = Element
	//     (das Element, das selektiert werden soll)
	selectFormEle (ele) {
		let hBody = document.querySelector("body > header").offsetHeight,
			hKarte = document.querySelector("#beleg > header").offsetHeight,
			quick = document.getElementById("quick"),
			hQuick = quick.offsetHeight,
			h = hBody + hKarte,
			rect = ele.getBoundingClientRect();
		if (quick.classList.contains("an")) {
			h += hQuick;
		}
		if (rect.top - 24 < h || rect.top + 24 > window.innerHeight) {
			scrollTo({
				left: 0,
				top: rect.top + window.scrollY - h - 24,
				behavior: "smooth",
			});
		}
		ele.select();
	},
	// visualisiert, dass in einem Elementfeld ein Fehler aufgetreten ist
	// (wird nur aufgerufen, wenn Fehlermeldungen abgestellt wurden)
	//   ele = Element
	//     (das Element, das selektiert wird)
	fehlerFormEle (ele) {
		ele.classList.add("fehler");
		ele.addEventListener("input", fehlerEntfernen);
		ele.addEventListener("blur", fehlerEntfernen);
		function fehlerEntfernen() {
			ele.classList.remove("fehler");
			ele.removeEventListener("input", fehlerEntfernen);
			ele.removeEventListener("blur", fehlerEntfernen);
		}
	},
	// Bearbeiten des Belegs beenden, Beleg also schließen
	// (Der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
	aktionAbbrechen () {
		speichern.checkInit(async () => {
			await liste.wechseln(); // erst zur Liste wechseln, sonst wird die Meldung, dass der neue Beleg gerade nicht sichtbar ist, sofort wieder ausgeblendet
			if (beleg.listeGeaendert) {
				liste.status(true);
			}
			beleg.listeGeaendert = false;
		});
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
		dialog.oeffnen({
			typ: "confirm",
			text: `Soll <i>${liste.detailAnzeigenH3(id.toString())}</i> wirklich gelöscht werden?`,
			callback: async () => {
				if (!dialog.antwort) {
					return;
				}
				delete data.ka[id];
				beleg.belegGeaendert(false);
				kartei.karteiGeaendert(true);
				liste.statusNeu = "";
				liste.statusGeaendert = "";
				liste.status(true);
				await liste.wechseln();
				beleg.listeGeaendert = false;
				bedeutungenWin.daten();
				if (kopieren.an && kopieren.belege.includes(id.toString())) {
					kopieren.belege.splice(kopieren.belege.indexOf(id.toString()), 1);
					kopieren.uiText();
				}
			},
		});
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
			tastatur.detectModifiers(evt);
			if ((!tastatur.modifiers || tastatur.modifiers === "Ctrl") && evt.key === "Enter") {
				if (tastatur.modifiers === "Ctrl") {
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
				if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(cp)) {
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
	// blockiert die Verarbeitung von beleg.pasteBs() kurzzeitig
	pasteBsBlock: false,
	// fängt das Pasten im Belegfeld ab
	// (wird auch von notizen.paste() benutz)
	//   evt = Object
	//     (das Event-Objekt des Paste-Events)
	//   pasten = false || undefined
	//     (der bereinigte Text soll gepastet werden)
	pasteBs (evt, pasten = true) {
		if (beleg.pasteBsBlock) {
			return;
		}
		// Welche Daten gibt es in der Zwischenablage?
		const clipHtml = evt.clipboardData.getData("text/html"),
			clipText = evt.clipboardData.getData("text/plain");
		if (!clipHtml && !clipText) {
			return;
		}
		// Text bereinigen und pasten
		evt.preventDefault();
		let text = "";
		if (clipHtml) {
			text = clipHtml;
		} else {
			text = clipText;
		}
		text = beleg.toolsEinfuegenHtml(text);
		if (pasten) {
			const {clipboard} = require("electron");
			clipboard.writeText(text);
			beleg.pasteBsBlock = true;
			document.execCommand("paste");
			beleg.pasteBsBlock = false;
		} else {
			return text;
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
			} else if (this.parentNode.classList.contains("text-tools-quelle")) {
				beleg.toolsQuelle(this);
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
		beleg.toolsKopierenExec({
			ds,
			obj: beleg.data,
			text,
			ele: document.querySelector(`#beleg-lese-${ds} p`),
		});
	},
	// führt die Kopieroperation aus (eigene Funktion,
	// weil sie auch für die Kopierfunktion in der Belegliste benutzt wird)
	//   ds = String
	//     (Bezeichner des Datensatzes)
	//   obj = Object
	//     (verweist auf das Datenobjekt, in dem der zu kopierende Text steht;
	//     wichtig, um die Literaturangabe beim Kopieren von Belegtext zu finden)
	//   text = String
	//     (der komplette Feldtext, wie er in der DB steht)
	//   ele = Element | null
	//     (ein Element auf der 1. Ebene im Kopierbereich; "ele" kann "null" sein,
	//     wenn die Leseansicht noch nie aufgebaut wurde)
	//   cb = false | undefined
	//     (Text nicht Zwischenablage kopieren;
	//     nur wenn alle Belegtexte kopiert werden auf false)
	toolsKopierenExec ({ds, obj, text, ele, cb = true}) {
		// clipboard initialisieren
		const {clipboard} = require("electron");
		// Ist Text ausgewählt und ist er im Bereich des Kopier-Icons?
		if (cb && window.getSelection().toString() &&
				popup.getTargetSelection([ele])) {
			clipboard.write({
				text: popup.textauswahl.text,
				html: popup.textauswahl.html,
			});
			return;
		}
		// Kein Text ausgewählt => das gesamte Feld wird kopiert
		if (ds === "bs") { // Beleg
			let p = text.replace(/\n\s*\n/g, "\n").split("\n"),
				html = "";
			p.forEach(text => {
				text = beleg.toolsKopierenKlammern({text, html: true});
				if (optionen.data.einstellungen["textkopie-wort"]) {
					text = liste.belegWortHervorheben(text, true);
				}
				html += `<p>${text}</p>`;
			});
			// Referenz vorbereiten
			popup.referenz.data = obj;
			if (cb) {
				let eleListe, eleKarte;
				if (!ele) {
					// wenn die Leseansicht noch nie aufgebaut wurde,
					// kann ele === null sein; dann erfolgt das Kopieren immer
					// aus dem Karteikartenformular heraus
					eleKarte = true;
				} else if (ele) {
					eleListe = ele.closest(".liste-details");
					eleKarte = ele.closest("tr");
				}
				if (eleListe) {
					popup.referenz.id = eleListe.previousSibling.dataset.id;
				} else if (eleKarte) {
					popup.referenz.id = "" + beleg.id_karte;
				}
			}
			// Texte aufbereiten
			html = helfer.clipboardHtml(html);
			html = helfer.typographie(html);
			html = beleg.toolsKopierenAddQuelle(html, true, obj);
			html = beleg.toolsKopierenAddJahr(html, true);
			text = text.replace(/<br>/g, "\n");
			text = text.replace(/<.+?>/g, "");
			text = beleg.toolsKopierenKlammern({text});
			text = helfer.typographie(text);
			text = beleg.toolsKopierenAddQuelle(text, false, obj);
			text = beleg.toolsKopierenAddJahr(text, false);
			if (optionen.data.einstellungen["textkopie-notizen"]) {
				html = beleg.toolsKopierenAddNotizen(html, true, obj);
				text = beleg.toolsKopierenAddNotizen(text, false, obj);
			}
			// Text in Zwischenablage oder Text zurückgeben
			if (cb) {
				clipboard.write({
					text: text,
					html: html,
				});
			} else {
				return {
					html,
					text,
				};
			}
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
		if (cb) {
			helfer.animation("zwischenablage");
		}
	},
	// Klammern im Belegtext aufbereiten
	//   text = String
	//     (Belegtext, in dem die Klammern aufbereitet werden sollen)
	//   html = true | undefined
	//     (Text wird in HTML formatiert)
	toolsKopierenKlammern ({text, html = false}) {
		// Bindestriche einfügen
		text = text.replace(/\[¬\]([A-ZÄÖÜ])/g, (m, p1) => `-${p1}`);
		// technische Klammern entfernen
		text = text.replace(/\[¬\]|\[:.+?:\]/g, "");
		// eckige Klammern
		text = text.replace(/\[{1,2}.+?\]{1,2}/g, m => {
			const typ = /^\[{2}/.test(m) ? "loeschung" : "streichung";
			let r = "[…]";
			if (/^\[Anmerkung:\s/.test(m) ||
					typ === "loeschung" && optionen.data.einstellungen["textkopie-klammern-loeschung"] ||
					typ === "streichung" && optionen.data.einstellungen["textkopie-klammern-streichung"]) {
				r = m.replace(/^\[{2}/, "[").replace(/\]{2}$/, "]");
			}
			if (html && optionen.data.einstellungen["textkopie-klammern-farbe"]) {
				let farbe = typ === "loeschung" ? "#f00" : "#00f";
				r = `<span style="color: ${farbe}">${r}</span>`;
			}
			return r;
		});
		// Autorenzusatz
		text = text.replace(/\{(.+?)\}/g, (m, p1) => {
			if (html && optionen.data.einstellungen["textkopie-klammern-farbe"]) {
				return `<span style="color: #0a0">[${p1}]</span>`;
			}
			return `[${p1}]`;
		});
		// Ergebnis zurückgeben
		return helfer.textTrim(text, true);
	},
	// Jahreszahl und/oder ID des Belegs als eine Art Überschrift hinzufügen
	//   text = String
	//     (Text, der ergänzt werden soll)
	//   html = Boolean
	//     (Text soll um eine in html-formatierte Angabe ergänzt werden)
	toolsKopierenAddJahr (text, html) {
		// ID und Jahr ermitteln
		let id = xml.belegId({}),
			jahr = helferXml.datum(popup.referenz.data.da, false, true); // könnte auch Jh. sein
		// Elemente für Überschrift ermitteln
		let h = [];
		if (optionen.data.einstellungen["textkopie-h-jahr"]) {
			h.push(jahr);
		}
		if (optionen.data.einstellungen["textkopie-h-id"]) {
			h.push(id);
		}
		// keine Überschrift
		if (!h.length) {
			return text;
		}
		// Überschrift vorbereiten
		let hText = "";
		if (h.length > 1) {
			hText = `${h[0]} (${h[1]})`;
		} else {
			hText = h[0];
		}
		// Rückgabe mit Überschrift
		if (html) {
			return `<p><b>${hText}</b></p>${text}`;
		}
		return `${hText}\n\n${text}`;
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
			quelle.forEach(i => {
				i = helfer.textTrim(i, true);
				if (!i) {
					return;
				}
				text += `<p>${helfer.escapeHtml(i)}</p>`;
			});
		} else {
			text += "\n\n---\n\n";
			text += obj.qu;
		}
		return text;
	},
	// Notizen zum Belegtext hinzufügen
	//   text = String
	//     (Text, der um die Notizen ergänzt werden soll)
	//   html = Boolean
	//     (Text soll um eine html-formatierte Notizenangaben ergänzt werden)
	//   obj = Object
	//     (das Datenobjekt, in dem die Notizen steht)
	toolsKopierenAddNotizen (text, html, obj) {
		if (!obj.no) {
			return text;
		}
		if (html) {
			text += "<hr>";
			let notizen = obj.no.trim().split("\n");
			notizen.forEach(i => {
				i = helfer.textTrim(i, true);
				if (!i) {
					return;
				}
				text += `<p>${helfer.escapeHtml(i)}</p>`;
			});
		} else {
			text += "\n\n---\n\n";
			text += obj.no.trim();
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
			id = link.closest("th").firstChild.getAttribute("for"),
			ds = id.replace(/^beleg-/, "");
		let feld = document.getElementById(id);
		// Text auslesen
		let text = "";
		if (id === "beleg-bs") {
			if (clipboard.availableFormats().includes("text/html")) {
				text = clipboard.readHTML();
			} else {
				text = clipboard.readText(); // aus Sicherheitsgründen auch Plain-Text bereinigen
			}
			text = beleg.toolsEinfuegenHtml(text);
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
		dialog.oeffnen({
			typ: "confirm",
			text: "Im Textfeld steht schon etwas. Soll es ergänzt werden?\n(Bei „Nein“ wird das Textfeld überschrieben.)",
			callback: () => {
				if (dialog.antwort === true ||
						dialog.antwort === false) {
					eintragen(dialog.antwort);
				}
			},
		});
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
	//   minimum = true || undefined
	//     (nur ein absolutes Minimum an Tags bleibt erhalten)
	toolsEinfuegenHtml (html, minimum = false) {
		// wenn <body> => splitten
		let body = html.split(/<body.*?>/);
		if (body.length > 1) {
			html = body[1];
		}
		// Style-Block(s) und Kommentare entfernen
		html = html.replace(/<style.*?>(.|\n)+?<\/style>/g, "");
		html = html.replace(/<!--.+?-->/gs, "");
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
		let speziell = {
			"BIG": { // obsolete!
				ele: "span",
				class: "dta-groesser",
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
		// ggf. Anzahl der Tags reduzieren, die erhalten bleiben sollen
		if (minimum) {
			inline_keep = [
				"B",
				"I",
				"U",
			];
			speziell = {};
		}
		// Text extrahieren
		let text = "";
		container.childNodes.forEach(function(i) {
			ana(i, false);
		});
		// erhaltene Inline-Auszeichnungen korrigieren
		Object.keys(speziell).forEach(tag => {
			let reg = new RegExp(`\\[#(${tag})\\](.+?)\\[\\/${tag}\\]`, "g");
			text = text.replace(reg, function(m, p1, p2) {
				let start = `<${speziell[p1].ele}`;
				if (speziell[p1].class) {
					start += ` class="${speziell[p1].class}"`;
				} 
				return `${start}>${p2}</${speziell[p1].ele}>`;
			});
		});
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
		function ana (ele, preformatted) {
			if (ele.nodeType === 3) { // Text
				if (preformatted) {
					text += ele.nodeValue;
				} else {
					text += ele.nodeValue.replace(/\n/g, " ");
				}
			} else if (ele.nodeType === 1) { // Element
				// Inline-Elemente ggf. gesondert behandeln
				if (inline_keep.includes(ele.nodeName) || speziell[ele.nodeName]) {
					ele.insertBefore(document.createTextNode(`[#${ele.nodeName}]`), ele.firstChild);
					ele.appendChild(document.createTextNode(`[/${ele.nodeName}]`));
				} else if (!minimum && ele.nodeName === "Q") {
					ele.insertBefore(document.createTextNode('"'), ele.firstChild);
					ele.appendChild(document.createTextNode('"'));
				} else if (!minimum && ele.nodeName === "LI") {
					ele.insertBefore(document.createTextNode("– "), ele.firstChild);
				}
				// Block-Level-Elemente (und andere), die eine Sonderbehandlung benötigen
				let preformatted = false;
				if (/^(BR|DT|FIGCAPTION|HR|LI|TR)$/.test(ele.nodeName)) { // Zeilenumbruch
					text += "\n";
				} else if (/^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIALOG|DIV|DL|FIELDSET|FIGURE|FOOTER|FORM|H([1-6]{1})|HEADER|MAIN|NAV|OL|P|PRE|SECTION|TABLE|UL)$/.test(ele.nodeName)) { // Absätze
					text = helfer.textTrim(text, false);
					text += "\n\n";
					if (/^PRE$/.test(ele.nodeName)) {
						preformatted = true;
					}
				}
				ele.childNodes.forEach(function(i) {
					ana(i, preformatted);
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
			autorenzusatz: {
				start: "{",
				ende: "}",
			},
			bold: {
				start: "<b>",
				ende: "</b>",
			},
			br: {
				start: "<br>",
				ende: "",
			},
			caps: {
				start: `<span class="dta-kapitaelchen">`,
				ende: "</span>",
			},
			italic: {
				start: "<i>",
				ende: "</i>",
			},
			loeschung: {
				start: "[[",
				ende: "]]",
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
			streichung: {
				start: "[",
				ende: "]",
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
			dialog.oeffnen({
				typ: "alert",
				text: `Die Formatierung kann an dieser Position nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nillegale Verschachtelung`,
				callback: () => {
					ta.focus();
				},
			});
			return;
		}
		// Aktion durchführen
		let reg_start = new RegExp(`${helfer.escapeRegExp(tags[aktion].start)}$`),
			reg_ende = new RegExp(`^${helfer.escapeRegExp(tags[aktion].ende)}`);
		if (aktion !== "br" && reg_start.test(str_start) && reg_ende.test(str_ende)) { // Tag entfernen
			str_start = str_start.replace(reg_start, "");
			str_ende = str_ende.replace(reg_ende, "");
			start -= tags[aktion].start.length;
			ende -= tags[aktion].start.length;
		} else { // Tag hinzufügen
			str_sel = `${tags[aktion].start}${str_sel}${tags[aktion].ende}`;
			start += tags[aktion].start.length;
			ende += tags[aktion].start.length;
		}
		ta.value = `${str_start}${str_sel}${str_ende}`;
		// Auswahl wiederherstellen
		ta.setSelectionRange(start, ende, "forward");
		// neuen Text in data
		beleg.data.bs = ta.value;
		// Höhe des Textfelds anpassen
		helfer.textareaGrow(ta);
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
	// Tools für Quelle-Feld
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsQuelle (link) {
		if (link.classList.contains("icon-pfeil-kreis")) {
			beleg.toolsQuelleLaden();
		} else if (link.classList.contains("icon-link-link")) {
			beleg.toolsQuelleDTALink();
		}
	},
	// Inhalt des Quelle-Felds neu laden
	//   shortcut = true || undefined
	async toolsQuelleLaden (shortcut = false) {
		// Zwischenspeicher für Änderungen
		let aenderungen = {};
		// Titelinfos aus bx laden
		let bx = beleg.bxTyp({bx: beleg.data.bx});
		if (bx.typ) {
			let titel = "";
			if (bx.typ === "bibtex") {
				let bibtex = belegImport.BibTeXLesen(bx.daten, true);
				if (bibtex.length) {
					titel = bibtex[0].ds.qu;
				}
			} else if (bx.typ === "dereko") {
				let reg = new RegExp(`^(${belegImport.DeReKoId})(.+)`);
				titel = bx.daten.match(reg)[2] + ".";
			} else if (bx.typ === "xml-dwds") {
				let dwds = belegImport.DWDSLesenXML({
					clipboard: "",
					xml: bx.daten,
					returnResult: true,
				});
				let url = liste.linksErkennen(dwds.qu);
				if (/href="/.test(url)) {
					url = url.match(/href="(.+?)"/)[1];
				}
				let direktAusDTA = false;
				if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
					direktAusDTA = await new Promise(resolve => {
						dialog.oeffnen({
							typ: "confirm",
							text: "Die Karteikarte wurde aus einem DWDS-Snippet gefüllt, der Beleg stammt allerdings aus dem DTA.\nSoll der Zitiertitel direkt aus dem DTA geladen werden?",
							callback: () => {
								if (dialog.antwort) {
									resolve(true);
								} else {
									resolve(false);
								}
							},
						});
					});
				}
				if (direktAusDTA) {
					titel = await beleg.toolsQuelleLadenDTA({url});
					if (titel) {
						aenderungen.Autor = {
							key: "au",
							ori: beleg.data.au,
							neu: belegImport.DTAData.autor.join("/"),
						};
						if (!aenderungen.Autor.neu) {
							aenderungen.Autor.neu = "N. N.";
						}
					}
				} else if (dwds.qu) {
					if (beleg.data.au &&
							!/^(N\.\s?N\.|Name|Nn|o\.\s?A\.|unknown|unkown)/.test(beleg.data.au)) {
						// für den Fall, dass der Autor manuell nachgetragen wurde
						dwds.qu = dwds.qu.replace(/^N\.\sN\./, beleg.data.au);
						dwds.au = beleg.data.au;
					}
					aenderungen.Autor = {
						key: "au",
						ori: beleg.data.au,
						neu: dwds.au,
					};
					titel = dwds.qu;
				}
			} else if (bx.typ === "xml-fundstelle") {
				let daten = redLit.eingabeXMLFundstelle({xmlDoc: bx.daten, xmlStr: ""});
				titel = daten.ds.qu;
			} else if (bx.typ === "xml-mods") {
				let daten = redLit.eingabeXMLMODS({xmlDoc: bx.daten, xmlStr: ""});
				titel = daten.ds.qu;
			}
			if (titel) {
				aenderungen.Quelle = {
					key: "qu",
					ori: beleg.data.qu,
					neu: titel,
				};
				ausfuellen();
			} else if (titel === "") {
				// "titel" könnte "false" sein, wenn die Anfrage an das DTA gescheitert ist;
				// in diesem Fall kommt eine Fehlermeldung von der Fetch-Funktion
				lesefehler();
			}
			return;
		}
		// wenn Korpus "DWDS" => mit dem Text arbeiten, der im Quelle-Feld steht
		if (/^DWDS/.test(beleg.data.kr)) {
			let quelle = beleg.data.qu.split("\n");
			let data = {
				au: beleg.data.au,
				da: beleg.data.da,
				qu: quelle[0],
			};
			// versuchen, relativ wild in das Quelle-Feld
			// kopierte Daten zu Titel und Autor auszulesen
			let titeldaten = {},
				autor = /, Autor: (?<Autor>.+?), Titel:/.exec(data.qu),
				titel = /, Titel: (?<Titel>.+?)(?<Ende>$|, S)/.exec(data.qu);
			if (autor) {
				data.au = autor.groups.Autor;
				data.qu = data.qu.replace(/, Autor: .+?, Titel:/, ", Titel:");
			}
			if (titel) {
				titeldaten.titel = titel.groups.Titel;
				let reg = new RegExp(", Titel: .+" + titel.groups.Ende);
				data.qu = data.qu.replace(reg, titel.groups.Ende);
			}
			// Autor und Quelle nachbearbeiten
			data.au = belegImport.DWDSKorrekturen({
				typ: "au",
				txt: data.au,
			});
			belegImport.DWDSKorrekturen({
				typ: "qu",
				txt: data.qu,
				data,
				titeldaten,
			});
			// Änderungen ermitteln
			aenderungen.Autor = {
				key: "au",
				ori: beleg.data.au,
				neu: data.au,
			};
			quelle[0] = data.qu;
			aenderungen.Quelle = {
				key: "qu",
				ori: beleg.data.qu,
				neu: quelle.join("\n"),
			};
			// fragen, ob Änderungen übernommen werden sollen
			ausfuellen();
			return;
		}
		// Titelinfos aus dem DTA herunterladen
		let url = liste.linksErkennen(beleg.data.qu);
		if (/href="/.test(url)) {
			url = url.match(/href="(.+?)"/)[1];
		}
		if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
			const titel = await beleg.toolsQuelleLadenDTA({url});
			if (titel) {
				aenderungen.Autor = {
					key: "au",
					ori: beleg.data.au,
					neu: belegImport.DTAData.autor.join("/"),
				};
				if (!aenderungen.Autor.neu) {
					aenderungen.Autor.neu = "N. N.";
				}
				aenderungen.Quelle = {
					key: "qu",
					ori: beleg.data.qu,
					neu: titel,
				};
				ausfuellen();
			} else if (titel === "") {
				lesefehler();
			}
			return;
		}
		// keine Quelle gefunden
		dialog.oeffnen({
			typ: "alert",
			text: "Es wurde keine Quelle gefunden, aus der die Titeldaten automatisch neu geladen werden könnten.",
		});
		// Quellenfeld ausfüllen (wenn gewünscht)
		function ausfuellen () {
			// Änderungen ermitteln
			let txt = [];
			for (let [k, v] of Object.entries(aenderungen)) {
				const ori = v.ori.split(/\n+https?:/)[0],
					neu = v.neu.split(/\n+https?:/)[0];
				if (ori === neu) {
					continue;
				}
				let val = `<strong>${k}</strong><br>`;
				val += `${v.ori ? v.ori : "<i>kein Autor</i>"}<br>     →<br>${v.neu}`;
				txt.push(val);
			}
			// abbrechen, weil keine Änderungen gefunden wurden
			let quelle = document.getElementById("beleg-qu");
			if (!txt.length) {
				if (!shortcut) {
					quelle.focus();
				} else {
					dialog.oeffnen({
						typ: "alert",
						text: "Keine Änderungen nötig.",
					});
				}
				return;
			}
			// nachfragen, ob Änderungen übernommen werden sollen
			let numerus = "Soll die folgende Änderung";
			if (txt.length > 1) {
				numerus = "Sollen die folgenden Änderungen";
			}
			dialog.oeffnen({
				typ: "confirm",
				text: `${numerus} vorgenommen werden?\n${txt.join("\n")}`,
				callback: () => {
					if (dialog.antwort) {
						for (let v of Object.values(aenderungen)) {
							beleg.data[v.key] = v.neu;
							document.getElementById(`beleg-${v.key}`).value = v.neu;
							if (v.key === "qu") {
								helfer.textareaGrow(quelle);
							}
						}
						beleg.belegGeaendert(true);
						beleg.aktionSpeichern();
					} else if (!shortcut) {
						quelle.focus();
					}
					setTimeout(() => {
						document.querySelector("#dialog > div").classList.remove("breit");
					}, 200);
				},
			});
			document.querySelector("#dialog > div").classList.add("breit");
			document.querySelectorAll("#dialog-text p").forEach(p => p.classList.add("force-wrap"));
		}
		// generische Fehlermeldung
		function lesefehler () {
			dialog.oeffnen({
				typ: "alert",
				text: "Beim Einlesen der Titeldaten ist etwas schiefgelaufen.",
			});
		}
	},
	// Zitiertitelanfrage an das DTA
	//   url = String
	//     (DTA-Link)
	toolsQuelleLadenDTA ({url}) {
		return new Promise(async resolve => {
			let quelle = document.getElementById("beleg-qu");
			// Seitenangabe auslesen
			let mHier = /, hier (?<seiten>[^\s]+)( |\.\n\n)/.exec(quelle.value),
				mSeiten = /(?<typ>, Sp?\.)\s(?<seiten>[^\s]+)( |\.\n\n)/.exec(quelle.value);
			let seitenData = {
				seite: "",
				seite_zuletzt: "",
				spalte: false,
			};
			let seiten;
			if (mHier) {
				seiten = mHier.groups.seiten;
			} else if (mSeiten) {
				seiten = mSeiten.groups.seiten;
				if (mSeiten.groups.typ === ", Sp.") {
					seitenData.spalte = true;
				}
			}
			if (seiten) {
				let seitenSp = seiten.split(/[-–]/);
				seitenData.seite = seitenSp[0];
				if (seitenSp[1]) {
					seitenData.seite_zuletzt = seitenSp[1];
				}
			}
			// TEI-Header herunterladen
			const fetchOk = await redLit.eingabeDTAFetch({
				url,
				fokusId: "beleg-qu",
				seitenData,
			});
			// Rückgabewerte
			if (fetchOk) {
				resolve(belegImport.DTAQuelle(true));
			} else {
				resolve(false);
			}
		});
	},
	// Typ der Daten im bx-Datensatz ermitteln
	//   bx = String
	//     (Datensatz, der überprüft werden soll)
	bxTyp ({bx}) {
		// keine Daten vorhanden
		if (!bx) {
			return {
				typ: "",
				daten: "",
			};
		}
		// BibTeX-Daten
		if (belegImport.BibTeXCheck(bx)) {
			return {
				typ: "bibtex",
				daten: bx,
			};
		}
		// DeReKo-Daten
		let reg = new RegExp(`^${belegImport.DeReKoId}`);
		if (reg.test(bx)) {
			return {
				typ: "dereko",
				daten: bx,
			};
		}
		// XML-Daten
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(bx.replace(/ xmlns=".+?"/, ""), "text/xml");
		if (!xmlDoc.querySelector("parsererror")) {
			let evaluator = (xpath) => {
				return xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null).iterateNext();
			};
			let typ = "";
			if (evaluator("//teiHeader/sourceDesc/biblFull")) {
				typ = "xml-dta";
			} else if (evaluator("/Beleg/Fundstelle")) {
				typ = "xml-dwds";
			} else if (evaluator("/Fundstelle")) {
				typ = "xml-fundstelle";
			} else if (evaluator("/mods/titleInfo")) {
				typ = "xml-mods";
			} else {
				typ = "";
			}
			return {
				typ,
				daten: xmlDoc,
			};
		}
		// Datenformat unbekannt
		return {
			typ: "",
			daten: "",
		};
	},
	// DTA-Link aus dem Quelle-Feld in das Importformular holen
	toolsQuelleDTALink () {
		const quelle = document.querySelector("#beleg-qu").value,
			link = quelle.match(/https?:\/\/www\.deutschestextarchiv\.de\/[^\s]+/);
		if (!link) {
			dialog.oeffnen({
				typ: "alert",
				text: "Kein DTA-Link gefunden.",
			});
			return;
		}
		window.scrollTo({
			left: 0,
			top: 0,
			behavior: "smooth",
		});
		document.querySelector("#beleg-import-dta").click();
		const dta = document.querySelector("#beleg-dta");
		dta.value = link[0];
		dta.dispatchEvent(new Event("input"));
		document.querySelector("#beleg-dta-bis").select();
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
			tab = document.querySelector("#beleg table");
		if (beleg.leseansicht) {
			beleg.leseansicht = false;
			button.classList.add("beleg-opt-anzeige-letztes");
			button.title = `zur Leseansicht wechseln (${tastatur.shortcutsTextAktuell("Strg")} + U)`;
			tab.classList.remove("leseansicht");
		} else {
			beleg.leseansicht = true;
			button.classList.remove("beleg-opt-anzeige-letztes");
			button.title = `zur Formularansicht wechseln (${tastatur.shortcutsTextAktuell("Strg")} + U)`;
			tab.classList.add("leseansicht");
		}
		button.classList.toggle("aktiv");
		// Header-Icons ein- oder ausblenden
		document.querySelectorAll("#beleg .icon-leseansicht").forEach(function(i) {
			if (beleg.leseansicht) {
				i.classList.remove("aus");
			} else {
				i.classList.add("aus");
			}
		});
		// Title des Sprung-Icons anpassen
		if (beleg.leseansicht) {
			document.getElementById("beleg-link-springen").title = `zur nächsten Markierung springen (${tastatur.shortcutsTextAktuell("Strg")} + ↓)`;
		} else {
			document.getElementById("beleg-link-springen").title = `zum Wort im Belegtext springen (${tastatur.shortcutsTextAktuell("Strg")} + ↓)`;
		}
		// Einfüge-Icons ein- oder ausblenden
		document.querySelectorAll("#beleg .icon-tools-einfuegen").forEach(function(i) {
			if (beleg.leseansicht) {
				i.classList.add("aus");
			} else {
				i.classList.remove("aus");
			}
		});
		// Text-Tools für Beleg und Bedeutung ein- oder ausblenden
		let tools_beleg = document.querySelectorAll(".text-tools-beleg, .text-tools-bedeutung");
		for (let tools of tools_beleg) {
			if (beleg.leseansicht) {
				tools.classList.add("aus");
			} else {
				tools.classList.remove("aus");
			}
		}
		// Textwerte eintragen
		if (beleg.leseansicht) {
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
			if (!cont) { // manche Datensätze (dc, dm, bx) werden nicht angezeigt
				continue;
			}
			helfer.keineKinder(cont);
			// Absätze einhängen
			const p = v.replace(/\n\s*\n/g, "\n").split("\n");
			let zuletzt_gekuerzt = false; // true, wenn der vorherige Absatz gekürzt wurde
			for (let i = 0, len = p.length; i < len; i++) {
				let text = p[i];
				if (!text && wert === "no" && i === 0 && len > 1) {
					// der erste Absatz im Notizenfeld kann leer sein, soll aber nicht gedruckt
					// werden, wenn er leer ist; dies gilt allerdings nur, wenn darauf noch ein Absatz folgt
					continue;
				}
				let nP = document.createElement("p");
				cont.appendChild(nP);
				nP.dataset.pnumber = i;
				nP.dataset.id = "";
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
						text = liste.belegKlammernHervorheben({text});
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
		if (beleg.leseansicht) {
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
			link.title = `Belegkontext anzeigen (${tastatur.shortcutsTextAktuell("Strg")} + K)`;
		} else {
			link.classList.remove("aktiv");
			link.title = `Belegkontext kürzen (${tastatur.shortcutsTextAktuell("Strg")} + K)`;
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
		if (beleg.leseansicht) {
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
			link.title = `Silbentrennung nicht anzeigen (${tastatur.shortcutsTextAktuell("Strg")} + T)`;
		} else {
			link.classList.remove("aktiv");
			link.title = `Silbentrennung anzeigen (${tastatur.shortcutsTextAktuell("Strg")} + T)`;
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
		if (beleg.leseansicht) {
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
			dialog.oeffnen({
				typ: "alert",
				text: "Keine Markierung gefunden.",
			});
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
		let regs = [];
		for (let i of helfer.formVariRegExpRegs) {
			if (!data.fv[i.wort].tr) {
				regs.push(`(^|[${helfer.ganzesWortRegExp.links}])(${i.reg})($|[${helfer.ganzesWortRegExp.rechts}])`);
			} else {
				regs.push(`[^${helfer.ganzesWortRegExp.links}]*(${i.reg})[^${helfer.ganzesWortRegExp.rechts}]*`);
			}
		}
		beleg.ctrlSpringenFormReg.reg = new RegExp(regs.join("|"), "gi");
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
			dialog.oeffnen({
				typ: "alert",
				text: "Wort nicht gefunden.",
				callback: () => {
					textarea.scrollTop = 0;
					textarea.setSelectionRange(0, 0);
					textarea.focus();
				},
			});
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
		const {clipboard} = require("electron"),
			daten = kopieren.datenBeleg(dt);
		daten.typ = "ztb";
		daten.version = 2;
		daten.winId = winInfo.winId;
		daten.wort = kartei.wort;
		clipboard.writeText(JSON.stringify(daten));
		helfer.animation("zwischenablage");
	},
	// Dupliziert den übergebenen Beleg
	async ctrlDuplikat () {
		// Versuchen noch nicht gespeicherte Änderungen anzuwenden;
		// scheitert das => abbrechen
		if (beleg.geaendert && !beleg.aktionSpeichern(true)) {
			return;
		}
		// Duplizieren kann durchgeführt werden
		const daten = [kopieren.datenBeleg(beleg.data)],
			id_karte = await kopieren.einfuegenEinlesen(daten, true);
		// Duplikat öffnen (in derselben Ansicht)
		const leseansicht_status = beleg.leseansicht;
		beleg.oeffnen(id_karte);
		if (beleg.leseansicht !== leseansicht_status) {
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
			speichern.checkInit(() => beleg.ctrlNavi(next));
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
			dialog.oeffnen({
				typ: "alert",
				text: `Der aktuelle Beleg ist ${next ? "der letzte" : "der erste" } in der Belegliste.`,
				callback: () => {
					fokus();
				},
			});
			return;
		}
		// neuen Beleg öffnen:
		//   1. in derselben Ansicht
		//   2. mit demselben Icon fokussiert
		//   3. mit derselben Scroll-Position
		const leseansicht_status = beleg.leseansicht,
			scroll = window.scrollY;
		beleg.oeffnen(parseInt(belege[pos], 10));
		if (beleg.leseansicht !== leseansicht_status) {
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
		// Overlay-Fenster ist offen => Abbruch
		if (overlay.oben()) {
			dialog.oeffnen({
				typ: "alert",
				text: `Bedeutungen können nur ${eintragen ? "eingetragen" : "ausgetragen"} werden, wenn Karteikarte oder Belegliste nicht durch andere Fenster verdeckt werden.`,
			});
			return;
		}
		// Ziel ermitteln
		if (helfer.hauptfunktion === "karte") {
			if (eintragen) {
				beleg.bedeutungEintragenKarte(bd);
			} else {
				beleg.bedeutungAustragenKarte(bd);
			}
			return;
		} else if (helfer.hauptfunktion === "liste") {
			if (eintragen) {
				beleg.bedeutungEintragenListe(bd);
			} else {
				beleg.bedeutungAustragenListe(bd);
			}
			return;
		}
		// unklar, wo eingetragen werden soll => Fehlermeldung
		dialog.oeffnen({
			typ: "alert",
			text: `Weder eine Karteikarte noch die Belegliste ist geöffnet.\nDie Bedeutung kann nur ${eintragen ? "eingetragen" : "ausgetragen"} werden, wenn eine der beiden Ansichten aktiv ist.`,
		});
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
				dialog.oeffnen({
					typ: "alert",
					text: "Die Bedeutung wurde <strong>nicht</strong> eingetragen. Grund: Sie ist schon vorhanden.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
				});
				return;
			}
			beleg.data.bd.push({...bd});
			beleg.belegGeaendert(true);
			dialog.oeffnen({
				typ: "alert",
				text: "Die Bedeutung wurde eingetragen.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
			});
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
				dialog.oeffnen({
					typ: "alert",
					text: "Die Bedeutung wurde entfernt.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
				});
				return;
			}
			dialog.oeffnen({
				typ: "alert",
				text: "Die Bedeutung wurde <strong>nicht</strong> entfernt. Grund: Sie ist der aktuellen Karteikarte überhaupt nicht zugeordnet.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
			});
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
			dialog.oeffnen({
				typ: "alert",
				text: "Die Bedeutung wurde <strong>nicht</strong> entfernt. Grund: Sie ist der aktuellen Karteikarte überhaupt nicht zugeordnet.",
			});
			return;
		}
		beleg.belegGeaendert(true);
		if (beleg.leseansicht) {
			beleg.leseFillBedeutung();
		}
	},
	// Bedeutung in jede Karte der Belegliste eintragen
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	bedeutungEintragenListe (bd) {
		const bdText = bedeutungen.bedeutungenTief({gr: bd.gr, id: bd.id, zaCl: true});
		// keine Belege in der Liste
		if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
			dialog.oeffnen({
				typ: "alert",
				text: `Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum in keine Karteikarte eingetragen werden.`,
			});
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen({
			typ: "confirm",
			text: `Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich in alle Karteikarten, die derzeit in der Belegliste sichtbar sind, <strong>eingetragen</strong> werden?`,
			callback: () => {
				if (!dialog.antwort) {
					return;
				}
				// Bedeutung eintragen
				document.querySelectorAll("#liste-belege-cont .liste-kopf").forEach(function(i) {
					const id = i.dataset.id;
					if (!bedeutungen.schonVorhanden({
								bd: data.ka[id].bd,
								gr: bd.gr,
								id: bd.id,
							})[0]) {
						data.ka[id].bd.push({...bd});
						data.ka[id].dm = new Date().toISOString();
					}
				});
				kartei.karteiGeaendert(true);
				// Rückmeldung
				let geruest_inaktiv = "\n(Im Hauptfenster ist ein anderes Gerüst als im Bedeutungsgerüst-Fenster eingestellt.)";
				if (data.bd.gn === bd.gr) {
					geruest_inaktiv = "";
				}
				dialog.oeffnen({
					typ: "alert",
					text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde in allen Karteikarten der Belegliste ergänzt.${geruest_inaktiv}`,
				});
				// Liste auffrischen
				if (!geruest_inaktiv) {
					liste.status(true);
				}
			},
		});
	},
	// Bedeutung aus jeder Karte der Belegliste entfernen
	//   bd = Object
	//     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
	bedeutungAustragenListe (bd) {
		const bdText = bedeutungen.bedeutungenTief({gr: bd.gr, id: bd.id, zaCl: true});
		// keine Belege in der Liste
		if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
			dialog.oeffnen({
				typ: "alert",
				text: `Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum aus keiner Karteikarte entfernt werden.`,
			});
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen({
			typ: "confirm",
			text: `Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich aus allen Karteikarten, die derzeit in der Belegliste sichtbar sind, <strong>entfernt</strong> werden?`,
			callback: () => {
				if (!dialog.antwort) {
					return;
				}
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
						data.ka[id].dm = new Date().toISOString();
						treffer = true;
					}
				});
				// Rückmeldung
				let geruest_inaktiv = "\n(Im Hauptfenster ist ein anderes Gerüst als im Bedeutungsgerüst-Fenster eingestellt.)";
				if (data.bd.gn === bd.gr) {
					geruest_inaktiv = "";
				}
				if (!treffer) {
					dialog.oeffnen({
						typ: "alert",
						text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde in keiner der Karteikarten in der aktuellen Belegliste gefunden.${geruest_inaktiv}`,
					});
					return;
				}
				dialog.oeffnen({
					typ: "alert",
					text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde aus allen Karteikarten der Belegliste entfernt.${geruest_inaktiv}`,
				});
				// Änderungsmarkierung
				kartei.karteiGeaendert(true);
				// Liste auffrischen
				if (!geruest_inaktiv) {
					liste.status(true);
				}
			},
		});
	},
};
