"use strict";

let xml = {
	// enthält die Daten
	//   autorinnen = Array
	//     (Liste der bekannten Autorinnen)
	//   contentsId = Number
	//     (ID des webContents, von dem aus das Fenster geöffnet wurde)
	//   gerueste = Object
	//     (Namen der bekannten Bedeutungsgerüste: geruest[ID])
	//   themenfelder = Array
	//     (Liste der bekannten Themenfelder)
	//   wort = String
	//     (das Karteiwort)
	//   xl = Object
	//     (die aktuellen Redaktionsdaten: data.rd.xl)
	data: {},
	// Dropdown: Auswahlmöglichkeiten für Dropdown-Felder
	dropdown: {
		artikelTypen: ["Vollartikel", "Überblicksartikel"],
		lemmaTypen: ["Hauptlemma", "Nebenlemma"],
		abschnittTypen: ["Mehr erfahren"],
		abschnittBloecke: ["Überschrift", "Textblock", "Blockzitat", "Illustration"],
		nachweisTypen: ["Literatur", "Link"],
	},
	// Dropdown: Referenzen zusammentragen
	dropdownReferenzen () {
		let arr = [],
			bloecke = ["ab", "tx"];
		for (let block of bloecke) {
			for (let i of xml.data.xl[block]) {
				if (i.id) {
					arr.push(i.id);
				}
				for (let j of i.ct) {
					if (j.id) {
						arr.push(j.id);
					}
				}
			}
		}
		return arr;
	},
	// Dropdown: Siglen sammeln
	dropdownSiglen () {
		let si = [];
		for (let i of xml.data.xl.lt) {
			si.push(i.si);
		}
		return si;
	},
	// Dropdown: Daten zu den vorhandenen Gerüsten sammeln
	dropdownGerueste () {
		let arr = [];
		for (let i of xml.data.xl.bg) {
			const na = xml.data.gerueste[i.gn] ? ` (${xml.data.gerueste[i.gn]})` : "";
			arr.push(`Bedeutungsgerüst ${i.gn}${na}`);
		}
		arr.sort(helfer.sortAlpha);
		return arr;
	},
	// Dropdown: Lesarten sammeln
	dropdownLesarten () {
		let data = {
			bg: {},
			arr: [],
			err: false,
		};
		// kein Bedeutungsgerüst vorhanden
		if (!xml.data.xl.bg.length) {
			return data;
		}
		// Bedeutungsgerüst nicht wohlgeformt
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xml.data.xl.bg[xml.bgAkt].xl, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			data.err = true;
			return data;
		}
		// Bedeutungsgerüst parsen
		let evaluator = xpath => {
			return xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null);
		};
		let l = evaluator("//Lesart"),
			item = l.iterateNext();
		while (item) {
			// ID ermitteln
			let id = item.getAttribute("xml:id");
			// Zählzeichen ermitteln
			let n = [item.getAttribute("n")],
				parent = item.parentNode;
			while (parent.nodeName !== "Lesarten") {
				n.push(parent.getAttribute("n"));
				parent = parent.parentNode;
			}
			n.reverse();
			// Text ermitteln
			let txt = "";
			for (let knoten of item.childNodes) {
				if (/^Diasystematik|Lesart|Textreferenz/.test(knoten.nodeName)) {
					continue;
				}
				txt += knoten.textContent;
			}
			txt = helfer.textTrim(txt, true);
			// Daten speichern
			data.bg[id] = {
				n: n.join(" "),
				txt,
			};
			data.arr.push(`${data.bg[id].n} ${txt}`);
			// nächste Lesart
			item = l.iterateNext();
		}
		return data;
	},
	// Counter, der fortlaufende Ziffern auswirft
	// (für Formularfelder, die eine ID brauchen)
	counter: null,
	*counterGenerator (n) {
		while (true) {
			yield n++;
		}
	},
	// Anzeige mit den gelieferten Daten aufbereiten
	async init () {
		// Counter initialisieren
		if (!xml.counter) {
			// init() wird auch von reset() aufgerufen;
			// in diesem Fall den Generator nicht neu initialisieren, weil
			// das zu einem merkwürdigen Fehler führt in den Formularen führt
			xml.counter = xml.counterGenerator(1);
		}
		// Wort eintragen
		document.querySelector("h1").textContent = xml.data.wort;
		// Init: Metadaten
		let mdId = document.getElementById("md-id"),
			mdTy = document.getElementById("md-ty"),
			mdTf = document.getElementById("md-tf");
		mdId.value = xml.data.xl.md.id;
		mdTy.value = xml.data.xl.md.ty;
		mdTf.value = xml.data.xl.md.tf;
		for (let i = 0, len = xml.data.xl.md.re.length; i < len; i++) {
			xml.mdRevisionMake({
				slot: i,
				restore: true,
			});
		}
		// Init: Lemmata
		for (let i = 0, len = xml.data.xl.le.length; i < len; i++) {
			xml.lemmaMake({
				slot: i,
				restore: true,
			});
		}
		// Init: Abstract/Text
		let bloecke = ["ab", "tx"];
		for (let block of bloecke) {
			let cont = document.getElementById(block);
			// Abschnitte erzeugen
			for (let i = 0, len = xml.data.xl[block].length; i < len; i++) {
				xml.abschnittMake({
					key: block,
					slot: i,
					cont: cont,
					restore: true,
				});
				// Textblöcke erzeugen
				for (let j = 0, len = xml.data.xl[block][i].ct.length; j < len; j++) {
					xml.textblockMake({
						key: block,
						slot: i,
						slotBlock: j,
						element: cont.lastChild.firstChild,
						restore: true,
					});
				}
			}
			// Abschnitte schließen
			// (werden nicht automatisch geschlossen, weil das Anhängen des
			// Toggle-Events leicht verzögert ist)
			if (xml.data.xl[block].length) {
				await new Promise(warten => setTimeout(() => warten(true), 25));
				xml.elementKopfToggle({auf: false, key: block});
			}
		}
		// Init: Belege/Literatur (Standard-Arrays)
		let keys = ["bl", "lt"];
		for (let key of keys) {
			let cont = document.getElementById(key);
			for (let i = 0, len = xml.data.xl[key].length; i < len; i++) {
				let ele = xml.elementKopf({key, slot: i});
				cont.appendChild(ele);
			}
			if (!xml.data.xl[key].length) {
				xml.elementLeer({ele: cont});
			} else {
				xml.layoutTabellig({
					id: key,
					ele: [2, 3],
					warten: 300,
				});
			}
		}
		// Init: Wortinformationen
		if (xml.data.xl.wi.length) {
			xml.wiMake();
		} else {
			xml.elementLeer({
				ele: document.getElementById("wi"),
			});
		}
		// Init: Bedeutungsgerüst (Nachweise, Textreferenzen, XML)
		xml.bgReset();
	},
	// Daten zurücksetzen
	async reset () {
		// Sollen die Daten wirklich zurückgesetzt werden?
		const antwort = await new Promise(resolve => {
			dialog.oeffnen({
				typ: "confirm",
				text: "Sollen die Daten im Redaktionsfenster wirklich zurückgesetzt werden?",
				callback: () => {
					if (dialog.antwort) {
						resolve(true);
					} else {
						resolve(false);
					}
				},
			});
		});
		if (!antwort) {
			return;
		}
		// Daten zurücksetzen
		xml.data.xl = helferXml.redXmlData();
		xml.speichern();
		// Formular zurücksetzen
		document.querySelectorAll(`[data-geaendert="true"]`).forEach(i => {
			delete i.dataset.geaendert;
		});
		let delKoepfe = ["md", "le", "ab", "tx"],
			delTotal = ["bl", "lt", "wi", "bg"],
			close = delKoepfe.concat(delTotal),
			closed = false;
		for (let i of close) {
			let koepfe = document.querySelectorAll(`#${i} > .kopf`);
			for (let kopf of koepfe) {
				let next = kopf.nextSibling;
				if (next &&
						(next.classList.contains("pre-cont") ||
						next.classList.contains("abschnitt-cont") && !next.dataset.off)) {
					kopf.dispatchEvent(new Event("click"));
					closed = true;
				}
			}
		}
		if (closed) { // Schließen der Köpfe dauert .3s
			await new Promise(warten => setTimeout(() => warten(true), 350));
		}
		for (let i of delKoepfe) {
			let koepfe = document.querySelectorAll(`#${i} > .kopf`);
			for (let kopf of koepfe) {
				kopf.parentNode.removeChild(kopf);
			}
		}
		for (let i of delTotal) {
			helfer.keineKinder(document.getElementById(i));
		}
		xml.init();
	},
	// Metadaten: ID
	mdIdMake () {
		// ID erstellen
		let id = document.getElementById("md-id"),
			lemmata = xml.lemmata();
		for (let i = 0, len = lemmata.length; i < len; i++) {
			lemmata[i] = lemmata[i].replace(/\s/g, "_");
		}
		id.value = `WGd-${lemmata.join(".")}-1`;
		// Datensatz speichern
		xml.data.xl.md.id = id.value;
		xml.speichern();
	},
	// Metadaten/Revision: neue Revision erstellen
	mdRevisionAdd () {
		let au = document.getElementById("md-re-au"),
			da = document.getElementById("md-re-da"),
			no = document.getElementById("md-re-no"),
			auVal = helfer.textTrim(au.value, true),
			daVal = da.value,
			noVal = helfer.typographie(helfer.textTrim(no.value, true));
		// Überprüfungen
		if (!auVal) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine AutorIn angegeben.",
				callback: () => au.select(),
			});
			return;
		}
		if (!daVal) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben kein Datum angegeben.",
				callback: () => da.select(),
			});
			return;
		}
		// XML erzeugen
		let datum = /^(?<jahr>[0-9]{4})-(?<monat>[0-9]{2})-(?<tag>[0-9]{2})$/.exec(daVal),
			xmlStr = `<Revision>`;
		xmlStr += `<Autor>${auVal}</Autor>`;
		xmlStr += `<Datum>${datum.groups.tag}.${datum.groups.monat}.${datum.groups.jahr}</Datum>`;
		xmlStr += `<Aenderung>${noVal}</Aenderung>`;
		xmlStr += `</Revision>`;
		// Position des Datensatzes finden
		const daValNr = parseInt(daVal.replace(/-/g, ""), 10);
		let pos = -1;
		for (let i = 0, len = xml.data.xl.md.re.length; i < len; i++) {
			const daNr = parseInt(xml.data.xl.md.re[i].da.replace(/-/g, ""), 10);
			if (daNr > daValNr) {
				pos = i;
				break;
			}
		}
		// Datensatz erzeugen und speichern
		let data = {
			au: auVal,
			da: daVal,
			no: noVal,
			xl: xmlStr,
		};
		if (pos === -1) {
			xml.data.xl.md.re.push(data);
		} else {
			xml.data.xl.md.re.splice(pos, 0, data);
		}
		xml.speichern();
		// Container erzeugen
		xml.mdRevisionMake({
			slot: pos === -1 ? xml.data.xl.md.re.length - 1 : pos,
		});
		// Formular leeren und wieder fokussieren
		au.value = "";
		da.value = "";
		no.value = "";
		au.focus();
	},
	// Metadaten/Revision: Revisionsblock aufbauen
	//   slot = Number
	//     (Slot, in dem der Datensatz steht)
	//   restore = true || undefined
	//     (die Inhalte werden beim Öffnen des Fensters wiederhergestellt)
	mdRevisionMake ({slot, restore = false}) {
		// neuen Revisionskopf hinzufügen
		let kopf = xml.elementKopf({key: "re", slot});
		if (restore || slot === xml.data.xl.md.re.length - 1) {
			document.getElementById("md").appendChild(kopf);
		} else {
			let koepfe = document.querySelectorAll("#md .kopf");
			document.getElementById("md").insertBefore(kopf, koepfe[slot]);
		}
		// Slots neu durchzählen
		xml.refreshSlots({key: "md"});
		// Layout der Köpfe anpassen
		let layout = {
			id: "md",
			ele: [3, 4],
		};
		if (restore) {
			layout.warten = 300;
		}
		xml.layoutTabellig(layout);
	},
	// Metadaten: Change-Listener für Artikel-ID, Artikeltyp und Themenfeld
	//   input = Element
	//     (das Textfeld)
	mdChange ({input}) {
		input.addEventListener("change", function() {
			const key = this.id.replace(/.+-/, "");
			let val = helfer.textTrim(this.value, true);
			// Validierung
			if (key === "id") {
				let id = xml.abschnittNormId({id: val});
				id = id.replace(/[,;]/g, "");
				if (id) {
					if (!/^WGd-/.test(id)) {
						id = `WGd-${id}`;
					}
					if (!/-[0-9]+$/.test(id)) {
						id += "-1";
					}
				}
				if (id !== val) {
					val = id;
					this.value = id;
				}
			} else if (key === "ty" &&
					!xml.dropdown.artikelTypen.includes(val)) {
				this.value = "";
				const typen = xml.typen({key: "artikelTypen"});
				dialog.oeffnen({
					typ: "alert",
					text: `Als Artikeltyp sind nur ${typen} erlaubt.`,
					callback: () => this.focus(),
				});
				return;
			}
			// Speichern
			xml.data.xl.md[key] = val;
			xml.speichern();
		});
	},
	// Lemma: neues Lemma erstellen
	lemmaAdd () {
		let le = document.getElementById("le-le"),
			ty = document.getElementById("le-ty"),
			re = document.getElementById("le-re"),
			leVal = le.value ? le.value.split(/\//) : [],
			tyVal = ty.value.trim(),
			reVal = re.value.trim();
		for (let i = 0, len = leVal.length; i < len; i++) {
			leVal[i] = helfer.textTrim(leVal[i], true);
		}
		// Überprüfungen
		if (!leVal.length) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben kein Lemma angegeben.",
				callback: () => le.select(),
			});
			return;
		}
		let schon = "";
		x: for (let i of xml.data.xl.le) {
			for (let j of leVal) {
				if (i.le.includes(j)) {
					schon = j;
					break x;
				}
			}
		}
		if (schon) {
			dialog.oeffnen({
				typ: "alert",
				text: `Das Lemma „${schon}“ wurde schon angelegt.`,
				callback: () => le.select(),
			});
			return;
		}
		if (!tyVal) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keinen Typ angegeben.",
				callback: () => ty.select(),
			});
			return;
		}
		if (!xml.dropdown.lemmaTypen.includes(tyVal)) {
			const typen = xml.typen({key: "lemmaTypen"});
			dialog.oeffnen({
				typ: "alert",
				text: `Als Typen sind nur ${typen} vorgesehen.`,
				callback: () => ty.select(),
			});
			return;
		}
		if (tyVal === "Nebenlemma" && !reVal) {
			dialog.oeffnen({
				typ: "alert",
				text: "Nebenlemmata müssen immer an eine bestimmte Textposition gebunden werden.\nTextpositionen werden über IDs identifiziert.",
				callback: () => re.select(),
			});
			return;
		}
		if (tyVal === "Hauptlemma" && reVal) {
			reVal = "";
		}
		// XML erzeugen
		let xmlStr = `<Lemma Typ="${tyVal}">`;
		for (let i of leVal) {
			xmlStr += `<Schreibung>${i}</Schreibung>`;
		}
		if (reVal) {
			xmlStr += `<Textreferenz Ziel="${reVal}"/>`;
		}
		xmlStr += `</Lemma>`;
		// Datensatz erzeugen und speichern
		let data = {
			le: leVal,
			ty: tyVal,
			re: reVal,
			xl: xmlStr,
		};
		xml.data.xl.le.push(data);
		xml.speichern();
		// Container erzeugen
		xml.lemmaMake({
			slot: xml.data.xl.le.length - 1,
		});
		// Formular leeren und wieder fokussieren
		le.value = "";
		ty.value = "";
		re.value = "";
		le.focus();
	},
	// Lemma: Lemmablock aufbauen
	//   slot = Number
	//     (Slot, in dem der Datensatz steht)
	//   restore = true || undefined
	//     (die Inhalte werden beim Öffnen des Fensters wiederhergestellt)
	lemmaMake ({slot, restore = false}) {
		// neuen Lemmakopf hinzufügen
		let kopf = xml.elementKopf({key: "le", slot});
		document.getElementById("le").appendChild(kopf);
		// Layout der Köpfe anpassen
		let layout = {
			id: "le",
			ele: [3, 4],
		};
		if (restore) {
			layout.warten = 300;
		}
		xml.layoutTabellig(layout);
	},
	// Empfangen von Datensätzen: Verteilerfunktion
	//   xmlDatensatz = Object
	//     (der Datensatz; enthält die übergebenen Daten:
	//       data.key = String [Schlüssel, der den Datentyp angibt]
	//       data.ds = Object [der je spezifisch strukturierte Datensatz])
	async empfangen ({xmlDatensatz}) {
		if (/^bl|lt$/.test(xmlDatensatz.key)) {
			xml.empfangenArr({
				key: xmlDatensatz.key,
				ds: xmlDatensatz.ds,
			});
			if (xmlDatensatz.key === "lt") {
				xml.bgNwTfMake({key: "nw"});
			}
		} else if (xmlDatensatz.key === "bg") {
			const slot = xml.data.xl.bg.findIndex(i => i.gn === xmlDatensatz.ds.gn);
			if (slot > -1) {
				xml.data.xl.bg[slot] = xmlDatensatz.ds;
				xml.bgAkt = slot;
			} else {
				xml.data.xl.bg.push(xmlDatensatz.ds);
				xml.bgAkt = xml.data.xl.bg.length - 1;
			}
			xml.bgNwTyReset();
			xml.bgMakeXML();
			xml.bgNwTfMake({key: "nw"});
			xml.bgNwTfMake({key: "tf"});
			xml.bgSelSet();
		} else if (xmlDatensatz.key === "wi") {
			xml.data.xl.wi = xmlDatensatz.ds;
			xml.wiMake();
		} else if (xmlDatensatz.key === "wi-single") {
			if (!xml.data.xl.wi.length) {
				xml.data.xl.wi.push(xmlDatensatz.ds);
				xml.wiMake();
			} else {
				let slot = xml.data.xl.wi.findIndex(i => i.tx === xmlDatensatz.ds.tx),
					koepfe = document.querySelectorAll("#wi > .kopf");
				if (slot > -1) { // Datensatz ersetzen
					xml.data.xl.wi[slot] = xmlDatensatz.ds;
					// ggf. Preview schließen
					let pre = koepfe[slot].nextSibling;
					if (pre?.classList.contains("pre-cont")) { // jshint ignore:line
						await xml.elementPreviewOff({pre});
					}
					// Kopf erzeugen
					let kopf = xml.elementKopf({
						key: "wi",
						slot,
					});
					// ggf. als Verweistypgrenze markieren
					if (koepfe[slot].classList.contains("grenze")) {
						kopf.classList.add("grenze");
					}
					// Kopf ersetzen
					koepfe[slot].parentNode.replaceChild(kopf, koepfe[slot]);
				} else { // Datensatz einhängen
					xml.data.xl.wi.push(xmlDatensatz.ds);
					// Wortinformationen sortieren
					xml.data.xl.wi.sort(helfer.sortWi);
					// Kopf ersetzen
					const slot = xml.data.xl.wi.findIndex(i => i.tx === xmlDatensatz.ds.tx);
					let kopf = xml.elementKopf({
						key: "wi",
						slot,
					});
					if (slot === xml.data.xl.wi.length - 1) {
						document.getElementById("wi").appendChild(kopf);
					} else {
						koepfe[slot].parentNode.insertBefore(kopf, koepfe[slot]);
					}
					// Slots auffrischen und Verweistypgrenze neu markieren
					xml.refreshSlots({key: "wi"});
					xml.wiVerweistypGrenze();
				}
				// Layout der Köpfe anpassen
				xml.layoutTabellig({
					id: "wi",
					ele: [3, 4],
				});
			}
		}
		xml.speichern();
	},
	// Empfangen von Datensätzen: Standard-Arrays
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   ds = Object
	//     (der Datensatz mit den Inhalten)
	empfangenArr ({key, ds}) {
		let cont = document.getElementById(key);
		// ggf. Leermeldung löschen
		let leer = cont.querySelector(".leer");
		if (leer) {
			cont.removeChild(leer);
		}
		// Datensatz ersetzen oder hinzufügen
		const slot = xml.data.xl[key].findIndex(i => i.id === ds.id);
		if (slot >= 0) {
			// ggf. speichern Anstoßen
			let contAlt = cont.querySelector(`[data-id="${ds.id}"]`).nextSibling;
			if (contAlt) {
				xml.textblockSave({cont: contAlt});
			}
			// Datensatz ersetzen
			xml.data.xl[key][slot] = ds;
			// Element ersetzen
			let ele = xml.elementKopf({key, slot}),
				divs = cont.querySelectorAll(".kopf");
			cont.replaceChild(ele, divs[slot]);
			// ggf. Vorschau auffrischen
			let pre = ele.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				xml.preview({
					xmlStr: xml.data.xl[key][slot].xl,
					key,
					slot,
					after: ele,
				});
			}
		} else {
			// Datensatz hinzufügen
			xml.data.xl[key].push(ds);
			// Datensätze sortieren
			xml.empfangenArrSort({key});
			// neues Element einhängen
			const slot = xml.data.xl[key].findIndex(i => i.id === ds.id);
			let ele = xml.elementKopf({key, slot}),
				divs = cont.querySelectorAll(".kopf");
			if (slot === xml.data.xl[key].length - 1) {
				cont.appendChild(ele);
			} else {
				cont.insertBefore(ele, divs[slot]);
			}
		}
		// Ansicht tabellenartig gestalten
		xml.layoutTabellig({
			id: key,
			ele: [2, 3],
		});
	},
	// Empfangen von Datensätzen: Arrays sortieren
	//   key = String
	//     (der Schlüssel des Datensatzes)
	empfangenArrSort ({key}) {
		let sortStr = [];
		for (let i of xml.data.xl[key]){
			if (key === "bl") {
				sortStr.push({
					ds: i.ds,
					id: i.id,
				});
			} else if (key === "lt") {
				sortStr.push(i.si);
			}
		}
		if (key === "bl") {
			sortStr.sort((a, b) => {
				let key = "ds",
					arr = [a.ds, b.ds]; // sortieren nach Sortierdatum
				if (a.ds === b.ds) {
					key = "id";
					arr = [a.id, b.id]; // Fallback: sortieren nach ID
				}
				arr.sort();
				if (a[key] === arr[0]) {
					return -1;
				}
				return 1;
			});
			xml.data.xl.bl.sort((a, b) => {
				return sortStr.findIndex(i => i.id === a.id) - sortStr.findIndex(i => i.id === b.id);
			});
		} else if (key === "lt") {
			sortStr.sort(helfer.sortSiglen);
			xml.data.xl.lt.sort((a, b) => sortStr.indexOf(a.si) - sortStr.indexOf(b.si));
		}
	},
	// Beleg aus Zwischenablage einfügen
	belegEinfuegen () {
		let {clipboard} = require("electron"),
			cp = clipboard.readText(),
			parser = new DOMParser(),
			xmlDoc = parser.parseFromString(cp, "text/xml");
		// Validierung
		if (xmlDoc.querySelector("parsererror")) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Einlesen des Belegs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">kein wohlgeformtes XML-Snippet gefunden</p>`,
			});
			return;
		}
		if (xmlDoc.documentElement.nodeName !== "Beleg" ||
				!xmlDoc.querySelector("Belegtext")) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Einlesen des Belegs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">kein XML-Snippet mit Belegtext gefunden</p>`,
			});
			return;
		}
		// Datensatz erstellen
		let datum = helferXml.datumFormat({xmlStr: cp});
		let xmlDatensatz = {
			key: "bl",
			ds: {
				da: datum.anzeige,
				ds: datum.sortier,
				id: xmlDoc.documentElement.getAttribute("xml:id"),
				xl: cp,
			},
		};
		// Beleg einfügen und speichern
		xml.empfangenArr(xmlDatensatz);
		xml.speichern();
	},
	// Wortinformationen: alle Wörter aufbauen
	wiMake () {
		// alle Köpfe entfernen
		let wi = document.getElementById("wi");
		helfer.keineKinder(wi);
		// alle Köpfe aufbauen
		for (let i = 0, len = xml.data.xl.wi.length; i < len; i++) {
			let kopf = xml.elementKopf({
				key: "wi",
				slot: i,
			});
			wi.appendChild(kopf);
		}
		// Verweistypgrenze markieren
		xml.wiVerweistypGrenze();
		// Layout der Köpfe anpassen
		xml.layoutTabellig({
			id: "wi",
			ele: [3, 4],
			restore: 300,
		});
	},
	// Wortinformationen: Verweistypgrenze markieren
	wiVerweistypGrenze () {
		let koepfe = document.querySelectorAll("#wi > .kopf");
		if (!koepfe.length) {
			return;
		}
		let vtZuletzt = koepfe[0].querySelector(".id").textContent;
		koepfe[0].classList.remove("grenze");
		for (let i = 1, len = koepfe.length; i < len; i++) {
			const vt = koepfe[i].querySelector(".id").textContent;
			if (vt !== vtZuletzt) {
				koepfe[i].classList.add("grenze");
				vtZuletzt = vt;
			} else {
				koepfe[i].classList.remove("grenze");
			}
		}
	},
	// Bedeutungsgerüst: speichert den Slot des aktuellen Bedeutungsgerüsts
	bgAkt: -1,
	// Bedeutungsgerüst: Nachweisformular umstellen
	bgNachweisToggle () {
		let typ = document.getElementById("nw-ty").value,
			formLit = document.getElementById("nw-lit"),
			formLink = document.getElementById("nw-link");
		if (typ === "Literatur") {
			formLit.classList.remove("aus");
			formLit.querySelectorAll("input").forEach(i => i.value = "");
			formLit.querySelector("input").focus();
		} else {
			formLit.classList.add("aus");
		}
		if (typ === "Link") {
			formLink.classList.remove("aus");
			formLink.querySelectorAll("input").forEach(i => i.value = "");
			formLink.querySelector(`[id$="da"]`).value = new Date().toISOString().split("T")[0];
			formLink.querySelector("input").focus();
		} else {
			formLink.classList.add("aus");
		}
	},
	// Bedeutungsgerüst: neuen Nachweis erstellen
	async bgNachweisAdd () {
		// Ist das Formular noch im Bearbeiten-Modus?
		const antwort = await xml.bgCloseXML();
		if (antwort === null) {
			return;
		}
		// Fehler, die das Bedeutungsgerüst betreffen
		let ty = document.getElementById("nw-ty");
		if (!xml.data.xl.bg.length) {
			dialog.oeffnen({
				typ: "alert",
				text: "Kein Bedeutungsgerüst gefunden.",
				callback: () => ty.select(),
			});
			return;
		}
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xml.data.xl.bg[xml.bgAkt].xl, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			dialog.oeffnen({
				typ: "alert",
				text: "Das Bedeutungsgerüst ist nicht wohlgeformt.",
				callback: () => ty.select(),
			});
			return;
		}
		// Typ ermitteln
		let tyVal = ty.value.trim();
		if (!xml.dropdown.nachweisTypen.includes(tyVal)) {
			let typen = xml.typen({key: "nachweisTypen"});
			dialog.oeffnen({
				typ: "alert",
				text: `Als Nachweis-Typen stehen nur ${typen} zur Verfügung.`,
				callback: () => ty.select(),
			});
			return;
		}
		// Formular auslesen, validieren und XML erstellen
		let xmlStr = "";
		if (tyVal === "Literatur") {
			let si = document.getElementById("nw-lit-si"),
				siVal = si.value.trim();
			if (!siVal) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie haben keine Sigle eingegeben.",
					callback: () => si.select(),
				});
				return;
			}
			const ltSlot = xml.data.xl.lt.findIndex(i => i.si === siVal);
			if (ltSlot === -1) {
				dialog.oeffnen({
					typ: "alert",
					text: `Zu der Sigle „${siVal}“ wurde kein passender Literaturtitel gefunden.`,
					callback: () => si.select(),
				});
				return;
			}
			const id = xml.data.xl.lt[ltSlot].id;
			for (let i of xml.data.xl.bg[xml.bgAkt].nw) {
				if (!/^<Literaturreferenz/.test(i)) {
					continue;
				}
				const ziel = i.match(/Ziel="(.+?)"/)[1];
				if (ziel === id) {
					dialog.oeffnen({
						typ: "alert",
						text: `Der Titel „${siVal}“ befindet sich schon in den Nachweisen.`,
						callback: () => si.select(),
					});
					return;
				}
			}
			let stVal = helfer.textTrim(document.getElementById("nw-lit-st").value, true);
			if (!stVal) {
				xmlStr = `<Literaturreferenz Ziel="${id}"/>`;
			} else {
				xmlStr = `<Literaturreferenz Ziel="${id}">${stVal}</Literaturreferenz>`;
			}
		} else if (tyVal === "Link") {
			let tx = document.getElementById("nw-link-tx"),
				txVal = helfer.textTrim(tx.value, true);
			if (!txVal) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie haben keinen Linktext eingegeben.",
					callback: () => tx.select(),
				});
				return;
			}
			let ul = document.getElementById("nw-link-ul"),
				ulVal = ul.value.trim();
			if (!ulVal) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie haben keine URL eingegeben.",
					callback: () => ul.select(),
				});
				return;
			} else if (/\s/.test(ulVal) || !/^https?:\/\//.test(ulVal)) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie haben keine gültige URL eingegeben.",
					callback: () => ul.select(),
				});
				return;
			}
			let da = document.getElementById("nw-link-da"),
				daVal = da.value;
			if (!daVal) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie haben kein Aufrufdatum angegeben.",
					callback: () => da.select(),
				});
				return;
			}
			const fundort = helferXml.fundort({url: ulVal});
			let datum = daVal.split("-");
			xmlStr = "<Verweis_extern>\n";
			xmlStr += `  <Verweistext>${txVal}</Verweistext>\n`;
			xmlStr += "  <Verweisziel/>\n";
			xmlStr += "  <Fundstelle>\n";
			xmlStr += `    <Fundort>${fundort}</Fundort>\n`;
			xmlStr += `    <URL>${ulVal}</URL>\n`;
			xmlStr += `    <Aufrufdatum>${datum[2]}.${datum[1]}.${datum[0]}</Aufrufdatum>\n`;
			xmlStr += "  </Fundstelle>\n";
			xmlStr += "</Verweis_extern>";
		}
		// Datensatz pushen
		xml.data.xl.bg[xml.bgAkt].nw.push(xmlStr);
		// Bedeutungsgerüst auffrischen
		xml.bgNachweiseRefresh();
		// Datensatz speichern
		xml.speichern();
		// Köpfe erzeugen
		xml.bgNwTfMake({key: "nw"});
		// Formular zurücksetzen und wieder fokussieren
		ty.value = "";
		ty.focus();
		ty.dispatchEvent(new Event("input"));
	},
	// Bedeutungsgerüst: Nachweise im Bedeutungsgerüst auffrischen
	bgNachweiseRefresh () {
		let xl = xml.data.xl.bg[xml.bgAkt].xl;
		if (!/^<Lesarten>/.test(xl)) { // das XML ist wohl korrupt
			return;
		}
		// <Nachweise> neu erstellen
		let nw = "<Lesarten>\n  <Nachweise/>";
		if (xml.data.xl.bg[xml.bgAkt].nw.length) {
			nw = "<Lesarten>\n  <Nachweise>";
			for (let i of xml.data.xl.bg[xml.bgAkt].nw) {
				nw += "\n" + " ".repeat(4) + i.replace(/\n/g, "\n" + " ".repeat(4));
			}
			nw += "\n  </Nachweise>";
		}
		// Daten auffrischen
		xl = xl.replace(/\s+(<Nachweise\/>|<Nachweise>.+?<\/Nachweise>)/s, "");
		xl = xl.replace(/<Lesarten>/, nw);
		xml.data.xl.bg[xml.bgAkt].xl = xl;
		// ggf. Preview auffrischen
		let bg = document.getElementById("bg");
		if (bg.querySelector(".pre-cont")) {
			xml.preview({
				xmlStr: xl,
				key: "bg",
				slot: -1,
				after: bg.querySelector(".kopf"),
				editable: true,
			});
		}
	},
	// Bedeutungsgerüst: neue Textreferenz erstellen
	async bgTextreferenzAdd () {
		// Ist das Formular noch im Bearbeiten-Modus?
		const antwort = await xml.bgCloseXML();
		if (antwort === null) {
			return;
		}
		// Variablen zusammentragen
		let li = document.getElementById("bg-tf-li"),
			ti = document.getElementById("bg-tf-ti"),
			liVal = li.value.trim(),
			tiVal = ti.value.trim(),
			bgData = xml.dropdownLesarten();
		// Überprüfungen
		if (!bgData.arr.length && !bgData.err) {
			dialog.oeffnen({
				typ: "alert",
				text: "Kein Bedeutungsgerüst gefunden.",
				callback: () => li.select(),
			});
			return;
		}
		if (bgData.err) {
			dialog.oeffnen({
				typ: "alert",
				text: "Das Bedeutungsgerüst ist nicht wohlgeformt.",
				callback: () => li.select(),
			});
			return;
		}
		if (!liVal.length) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine Lesart angegeben.",
				callback: () => li.select(),
			});
			return;
		}
		if (!bgData.arr.includes(liVal)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Die angegebene Lesart wurde im Bedeutungsgerüst nicht gefunden.",
				callback: () => li.select(),
			});
			return;
		}
		if (!tiVal) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine Textreferenz angegeben.",
				callback: () => ti.select(),
			});
			return;
		}
		// Datensatz erzeugen und einhängen
		let id = "";
		for (let [k, v] of Object.entries(bgData.bg)) {
			if (`${v.n} ${v.txt}` === liVal) {
				id = k;
				break;
			}
		}
		let data = {
			li: id,
			ti: tiVal,
		};
		const slot = xml.data.xl.bg[xml.bgAkt].tf.findIndex(i => i.li === id);
		if (slot > -1) {
			xml.data.xl.bg[xml.bgAkt].tf.splice(slot, 1, data);
		} else {
			xml.data.xl.bg[xml.bgAkt].tf.push(data);
		}
		// Datensätze sortieren
		xml.data.xl.bg[xml.bgAkt].tf.sort((a, b) => {
			const aTxt = `${bgData.bg[a.li].n} ${bgData.bg[a.li].txt}`,
				bTxt = `${bgData.bg[b.li].n} ${bgData.bg[b.li].txt}`;
			return bgData.arr.indexOf(aTxt) - bgData.arr.indexOf(bTxt);
		});
		// Bedeutungsgerüst auffrischen
		xml.bgTextreferenzenRefresh();
		// Datensatz speichern
		xml.speichern();
		// Köpfe erzeugen
		xml.bgNwTfMake({key: "tf"});
		// Formular leeren und wieder fokussieren
		li.value = "";
		ti.value = "";
		li.focus();
	},
	// Bedeutungsgerüst: Textreferenzen im Bedeutungsgerüst auffrischen
	bgTextreferenzenRefresh () {
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xml.data.xl.bg[xml.bgAkt].xl, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			return;
		}
		xmlDoc.querySelectorAll("Lesart").forEach(i => {
			// IDs ermitteln
			let id = i.getAttribute("xml:id"),
				tag = i.querySelector("Textreferenz"),
				ziel = "";
			if (tag) {
				if (tag.parentNode !== i) {
					tag = null;
				} else {
					ziel = tag.getAttribute("Ziel");
				}
			}
			// Textreferenz updaten?
			let tf = xml.data.xl.bg[xml.bgAkt].tf;
			const slot = tf.findIndex(i => i.li === id);
			if (ziel && slot === -1) { // Tag entfernen
				i.removeChild(tag.previousSibling);
				i.removeChild(tag);
			} else if (ziel && tf[slot].ti !== ziel) { // Attribut ändern
				tag.removeAttribute("Ziel");
				tag.setAttributeNS("http://www.w3.org/1999/xhtml", "Ziel", tf[slot].ti);
			} else if (!ziel && slot > -1) { // Tag hinzufügen
				// Whitespace erzeugen
				let next = i.querySelector("Diasystematik").nextSibling,
					lb = document.createTextNode(next.nodeValue.match(/\s+/)[0]);
				i.insertBefore(lb, next);
				// Textreferenz erzeugen
				let Textreferenz = document.createElementNS("http://www.w3.org/1999/xhtml", "Textreferenz");
				Textreferenz.setAttributeNS("http://www.w3.org/1999/xhtml", "Ziel", tf[slot].ti);
				i.insertBefore(Textreferenz, lb.nextSibling);
			}
		});
		// Stringify + Namespaces entfernen
		let xmlStr = new XMLSerializer().serializeToString(xmlDoc);
		xmlStr = xmlStr.replace(/ xmlns.*?=".+?"/g, "");
		xmlStr = xmlStr.replace(/[a-z0-9]+:Ziel/g, "Ziel");
		xmlStr = xmlStr.replace(/><\/Textreferenz>/g, "/>");
		// Daten auffrischen
		xml.data.xl.bg[xml.bgAkt].xl = xmlStr;
		// ggf. Preview auffrischen
		let bg = document.getElementById("bg");
		if (bg.querySelector(".pre-cont")) {
			xml.preview({
				xmlStr: xmlStr,
				key: "bg",
				slot: -1,
				after: bg.querySelector(".kopf"),
				editable: true,
			});
		}
	},
	// Bedeutungsgerüst: alle Nachweise/Textreferenzen (neu) aufbauen
	//   key = String
	//     (Schlüssel des Datensatzes, der neu aufgebaut werden soll)
	bgNwTfMake ({key}) {
		// alle Köpfe entfernen
		let cont = document.getElementById(`bg-${key}`);
		cont.querySelectorAll(".kopf").forEach(i => i.parentNode.removeChild(i));
		// alle Köpfe aufbauen
		if (xml.data.xl.bg.length) {
			for (let i = 0, len = xml.data.xl.bg[xml.bgAkt][key].length; i < len; i++) {
				let kopf = xml.elementKopf({
					key,
					slot: i,
				});
				cont.appendChild(kopf);
			}
		}
		// Layout der Köpfe anpassen
		let ele = [2, 3];
		if (key === "nw") {
			ele = [3, 4];
		}
		xml.layoutTabellig({
			id: `bg-${key}`,
			ele,
			restore: 300,
		});
	},
	// Bedeutungsgerüst: Nachweistyp-Formular zurücksetzen
	bgNwTyReset () {
		let nwTy = document.getElementById("nw-ty");
		nwTy.value = "";
		nwTy.dispatchEvent(new Event("input"));
	},
	// Bedeutungsgerüst: Formulardaten nach manuellem Bearbeiten auffrischen
	async bgRefreshData () {
		// kein Bedeutungsgerüst mehr => alle Strukturen und Daten entfernen
		// (passiert, wenn das Bedeutungsgerüst-Feld beim Bearbeiten
		// komplett geleert wurde)
		if (!xml.data.xl.bg[xml.bgAkt].xl) {
			let pre = document.querySelector("#bg .pre-cont");
			await xml.elementPreviewOff({pre});
			helfer.keineKinder(document.getElementById("bg"));
			xml.data.xl.bg.splice(xml.bgAkt, 1);
			xml.speichern();
			xml.bgReset();
			return;
		}
		// Bedeutungsgerüst nicht wohlgeformt
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xml.data.xl.bg[xml.bgAkt].xl, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			return;
		}
		// Bedeutungsgerüst parsen
		let evaluator = xpath => {
			return xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null);
		};
		// Nachweise
		let lr = evaluator("//Nachweise"),
			nw = lr.iterateNext(),
			arrNw = [];
		for (let knoten of nw.childNodes) {
			if (knoten.nodeType === 1) {
				arrNw.push(knoten.outerHTML.replace(/\n\s{4}/g, "\n"));
			}
		}
		// Lesarten
		let l = evaluator("//Lesart"),
			item = l.iterateNext(),
			arrTf = [];
		while (item) {
			// Textreferenz vorhanden?
			let tf = item.querySelector("Textreferenz");
			if (!tf || tf.parentNode !== item) {
				item = l.iterateNext();
				continue;
			}
			// Datensatz erstellen
			arrTf.push({
				li: item.getAttribute("xml:id"),
				ti: tf.getAttribute("Ziel"),
			});
			// nächste Lesart
			item = l.iterateNext();
		}
		// Daten auffrischen und speichern
		xml.data.xl.bg[xml.bgAkt].nw = arrNw;
		xml.data.xl.bg[xml.bgAkt].tf = arrTf;
		xml.speichern();
		// Köpfe neu aufbauen
		xml.bgNwTfMake({key: "nw"});
		xml.bgNwTfMake({key: "tf"});
	},
	// Bedeutungsgerüst: XML aufbauen
	async bgMakeXML () {
		let bg = document.getElementById("bg");
		// Struktur schon vorhanden?
		if (bg.querySelector(".kopf")) {
			let cont = bg.querySelector(".pre-cont");
			if (cont) {
				xml.editSpeichernAbschluss({
					cont,
					xmlStr: xml.data.xl.bg[xml.bgAkt].xl,
				});
			}
			return;
		}
		// Kopf erzeugen
		let div = xml.elementKopf({
			key: "bg",
		});
		// Kopf einhängen
		helfer.keineKinder(bg);
		bg.appendChild(div);
		// Vorschau aufklappen
		// (Toggle-Event wird verzögert an den Kopf gehängt, darum kurz warten)
		await new Promise(warten => setTimeout(() => warten(true), 25));
		div.dispatchEvent(new Event("click"));
	},
	// Bedeutungsgerüst: Bearbeiten-Modus beenden
	bgCloseXML () {
		return new Promise(async resolve => {
			let pre = document.querySelector("#bg .pre-cont");
			if (pre && !pre.querySelector("pre")) {
				await new Promise(warten => setTimeout(() => warten(true), 25));
				const antwort = await xml.editFrage({
					pre,
					fun: () => {},
				});
				let ta = pre.querySelector("textarea");
				if (antwort) {
					pre.querySelector(`[value="Speichern"]`).dispatchEvent(new Event("click"));
				} else if (antwort === false) {
					delete ta.dataset.geaendert;
					ta.value = xml.data.xl.bg[xml.bgAkt].xl;
					pre.querySelector(`[value="Abbrechen"]`).dispatchEvent(new Event("click"));
				} else if (antwort === null) {
					ta.setSelectionRange(0, 0);
					ta.focus();
				}
				resolve(antwort);
			}
			resolve(true);
		});
	},
	// Bedeutungsgerüst: zurücksetzen bzw. initialisieren
	bgReset () {
		if (xml.data.xl.bg.length) {
			xml.bgAkt = 0;
			xml.bgMakeXML();
		} else {
			xml.bgAkt = -1;
			xml.elementLeer({
				ele: document.getElementById("bg"),
			});
		}
		xml.bgNwTyReset();
		xml.bgNwTfMake({key: "nw"});
		xml.bgNwTfMake({key: "tf"});
		xml.bgSelSet();
	},
	// Bedeutungsgerüst: anderes Gerüst auswählen
	//   caller = String
	//     (ID des Input-Feldes, das geändert wurde)
	bgSel ({caller}) {
		let reg = /gerüst (?<gn>[0-9]+)/.exec(document.getElementById(caller).value);
		if (reg) {
			xml.bgAkt = xml.data.xl.bg.findIndex(i => i.gn === reg.groups.gn);
			// Update des anderen Input-Feldes
			xml.bgSelSet();
			// Update Wortinformationen TODO
			// Update Bedeutungsgerüste
			xml.bgNwTyReset();
			xml.bgMakeXML();
			xml.bgNwTfMake({key: "nw"});
			xml.bgNwTfMake({key: "tf"});
		}
	},
	// Bedeutungsgerüst: ID und Name des aktuellen Gerüsts in die Auswahlfelder
	bgSelSet () {
		let selWi = document.getElementById("wi-sel-gr"),
			selBg = document.getElementById("bg-sel-gr"),
			val = "";
		if (xml.data.xl.bg.length) {
			const gn = xml.data.xl.bg[xml.bgAkt].gn,
				na = xml.data.gerueste[gn] ? ` (${xml.data.gerueste[gn]})` : "";
			val = `Bedeutungsgerüst ${gn}${na}`;
		}
		selWi.value = val;
		selBg.value = val;
	},
	// Element erzeugen: Standard-Kopf
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   slot = Number || undefined
	//     (Slot, in dem der Datensatz steht)
	//   slotBlock = Number || undefined
	//     (Slot, in dem der Textblock steht)
	//   textKopf = String ("abschnitt" || "textblock") || undefined
	//     (Typ des Textkopfs)
	elementKopf ({key, slot = -1, slotBlock = null, textKopf = ""}) {
		let div = document.createElement("div");
		div.classList.add("kopf");
		div.dataset.key = key;
		if (slot > -1 && /^(re|le|wi|nw|tf)$/.test(key)) {
			div.dataset.slot = slot;
		} else if (slot > -1 && textKopf !== "textblock") {
			div.dataset.id = xml.data.xl[key][slot].id;
		}
		if (textKopf === "abschnitt") { // Abschnittköpfe
			div.dataset.slot = slot;
			div.classList.add(`level-${xml.data.xl[key][slot].le}`);
		} else if (slotBlock !== null) { // Textblockköpfe
			div.dataset.slot = slot;
			div.dataset.slotBlock = slotBlock;
			const id = xml.data.xl[key][slot].ct[slotBlock].id;
			if (id) {
				div.dataset.id = id;
			}
		}
		// Warn-Icon
		let warn = document.createElement("span");
		div.appendChild(warn);
		warn.classList.add("warn");
		if (!textKopf || textKopf !== "abschnitt") {
			let xmlStr = "";
			if (key === "re") {
				xmlStr = xml.data.xl.md.re[slot].xl;
			} else if (key === "nw") {
				xmlStr = xml.data.xl.bg[xml.bgAkt].nw[slot];
			} else if (key === "tf") {
				xmlStr = `<Textreferenz Ziel="${xml.data.xl.bg[xml.bgAkt].tf[slot].ti}"/>`;
			} else if (key === "bg") {
				xmlStr = xml.data.xl.bg[xml.bgAkt].xl;
			} else if (slotBlock === null) {
				xmlStr = xml.data.xl[key][slot].xl;
			} else {
				xmlStr = xml.data.xl[key][slot].ct[slotBlock].xl;
			}
			xml.check({
				warn,
				xmlStr,
			});
		}
		// Lösch-Icon
		let a = document.createElement("a");
		div.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-x-dick");
		a.title = "Löschen";
		// Verschiebe-Icons
		if (textKopf || /^(re|le|wi|nw)$/.test(key)) {
			let pfeile = {
				"icon-pfeil-gerade-hoch": "nach oben",
				"icon-pfeil-gerade-runter": "nach unten",
				"icon-pfeil-gerade-links": "nach links",
				"icon-pfeil-gerade-rechts": "nach rechts",
			};
			let pfeileCont = document.createElement("span");
			pfeileCont.classList.add("pfeile");
			div.appendChild(pfeileCont);
			for (let [k, v] of Object.entries(pfeile)) {
				if ((textKopf === "textblock" || /^(re|le|wi|nw)/.test(key)) &&
						k === "icon-pfeil-gerade-links") {
					break;
				}
				let a = document.createElement("a");
				pfeileCont.appendChild(a);
				a.href = "#";
				a.classList.add("icon-link", k);
				a.title = v;
			}
		}
		// ID
		let id = document.createElement("span");
		div.appendChild(id);
		id.classList.add("id");
		let idText;
		if (textKopf === "textblock") {
			if (xml.data.xl[key][slot].ct[slotBlock].it === "Textblock") {
				idText = xml.data.xl[key][slot].ct[slotBlock].id;
			} else {
				idText = " ";
			}
		} else if (key === "re") {
			idText = xml.data.xl.md.re[slot].au;
		} else if (key === "le") {
			idText = xml.data.xl[key][slot].le.join("/");
		} else if (key === "wi") {
			idText = xml.data.xl.wi[slot].vt;
		} else if (key === "nw") {
			let xl = xml.data.xl.bg[xml.bgAkt].nw[slot];
			if (/<Literaturreferenz/.test(xl)) {
				idText = xl.match(/Ziel="(.+?)"/)[1];
			} else {
				idText = xl.match(/<Verweistext>(.+?)<\/Verweistext>/)[1];
			}
		} else if (key === "tf") {
			idText = xml.data.xl.bg[xml.bgAkt].tf[slot].li;
		} else if (key === "bg") {
			idText = "XML";
		} else {
			idText = xml.data.xl[key][slot].id;
		}
		id.textContent = idText ? idText : "keine ID";
		if (!idText) {
			id.classList.add("keine-id");
		}
		// Hinweisfeld
		if (key !== "bg" && (!textKopf || textKopf === "abschnitt")) {
			let hinweis = document.createElement("span");
			div.appendChild(hinweis);
			hinweis.classList.add("hinweis");
			if (key === "re") {
				let da = /^(?<jahr>[0-9]{4})-(?<monat>[0-9]{2})-(?<tag>[0-9]{2})$/.exec(xml.data.xl.md.re[slot].da);
				hinweis.textContent = `${da.groups.tag}.${da.groups.monat}.${da.groups.jahr}`;
			} else if (key === "le") {
				hinweis.textContent = xml.data.xl.le[slot].ty;
			} else if (textKopf === "abschnitt") {
				const typ = xml.data.xl[key][slot].ty;
				hinweis.textContent = typ ? typ : "Standard";
			} else if (key === "bl") {
				hinweis.textContent = xml.data.xl.bl[slot].da;
			} else if (key === "lt") {
				hinweis.textContent = xml.data.xl.lt[slot].si;
			} else if (key === "wi") {
				hinweis.textContent = xml.data.xl.wi[slot].tx;
			} else if (key === "nw") {
				let xl = xml.data.xl.bg[xml.bgAkt].nw[slot];
				if (/<Literaturreferenz/.test(xl)) {
					const id = xl.match(/Ziel="(.+?)"/)[1];
					let i = xml.data.xl.lt.find(i => i.id === id),
						text = "";
					if (i) {
						text = i.si;
					} else {
						text = "Titel nicht gefunden";
						hinweis.classList.add("err");
					}
					hinweis.textContent = text;
				} else {
					hinweis.textContent = xl.match(/<URL>(.+?)<\/URL>/)[1];
				}
			} else if (key === "tf") {
				hinweis.textContent = `#${xml.data.xl.bg[xml.bgAkt].tf[slot].ti}`;
			}
		}
		// Vorschaufeld
		if (!/^(nw|tf|bg)$/.test(key) && (!textKopf || textKopf === "textblock")) {
			let vorschau = document.createElement("span");
			div.appendChild(vorschau);
			let text = "";
			if (key === "re") {
				text = xml.data.xl.md.re[slot].no ? xml.data.xl.md.re[slot].no : " ";
			} else if (key === "le") {
				text = xml.data.xl.le[slot].re ? `#${xml.data.xl.le[slot].re}` : " ";
			} else if (textKopf) {
				let xmlStr = xml.data.xl[key][slot].ct[slotBlock].xl;
				if (xml.data.xl[key][slot].ct[slotBlock].it === "Überschrift") {
					xmlStr = xmlStr.replace(/<Anmerkung>.+?<\/Anmerkung>/s, "");
					vorschau.classList.add("ueberschrift");
				}
				text = xmlStr.replace(/<.+?>/g, "");
				if (xml.data.xl[key][slot].ct[slotBlock].it === "Blockzitat") {
					let b = document.createElement("b");
					vorschau.appendChild(b);
					// blöder Hack mit den beiden Leerzeichen; Problem ist, dass der Container
					// display: inline bleiben muss, damit die Textellipse schön funktioniert
					// darum hier lieber kein display: block + margin.
					b.textContent = "Blockzitat  ";
				}
			} else if (key === "bl") {
				let belegtext = xml.data.xl.bl[slot].xl.match(/<Belegtext>(.+?)<\/Belegtext>/s);
				text = helferXml.maskieren({
					text: belegtext[1].replace(/<.+?>/g, ""),
					demaskieren: true,
				});
			} else if (key === "lt") {
				let unstrukturiert = xml.data.xl.lt[slot].xl.match(/<unstrukturiert>(.+?)<\/unstrukturiert>/);
				text = helferXml.maskieren({
					text: unstrukturiert[1],
					demaskieren: true,
				});
			} else if (key === "wi") {
				text = xml.data.xl.wi[slot].lt;
			}
			text = text.substring(0, 300);
			vorschau.appendChild(document.createTextNode(text));
		}
		// Events anhängen
		xml.elementKopfEvents({kopf: div});
		// Kopf zurückgeben
		return div;
	},
	// Element: Events an Kopfelemente hängen
	//   kopf = Element
	//     (der .kopf, der die Events erhalten soll)
	async elementKopfEvents ({kopf}) {
		// warten bis der Kopf eingehängt wurde
		while (!kopf.closest("body")) {
			await new Promise(resolve => setTimeout(() => resolve(true), 5));
		}
		// Köpfe umschalten
		if (kopf.closest(".text-cont")) {
			// Abschnittköpfe, Textblockköpfe
			xml.abtxToggle({div: kopf});
		} else if (!kopf.closest("#bg-nw, #bg-tf")) {
			// alle anderen Köpfe (außer Nachweise, Textreferenzen)
			xml.elementPreviewArr({div: kopf});
		}
		// Warn-Icon
		let warn = kopf.querySelector(".warn");
		if (warn) {
			warn.addEventListener("click", function(evt) {
				if (!this.classList.contains("aktiv")) {
					return;
				}
				evt.stopPropagation();
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Parsen des XML-Snippets ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${this.dataset.err}`,
				});
			});
		}
		// Lösch-Icon
		let loeschen = kopf.querySelector(".icon-x-dick");
		if (loeschen.closest(".text-cont")) {
			xml.abtxLoeschen({a: loeschen});
		} else {
			xml.elementLoeschenArr({a: loeschen});
		}
		// Pfeile
		kopf.querySelectorAll(".pfeile a").forEach(a => {
			// verschieben
			if (a.classList.contains("icon-pfeil-gerade-hoch") ||
					a.classList.contains("icon-pfeil-gerade-runter")) {
				a.addEventListener("click", function(evt) {
					evt.preventDefault();
					evt.stopPropagation();
					if (evt.detail > 1) { // Doppelklicks abfangen
						return;
					}
					xml.move({
						dir: this.classList.contains("icon-pfeil-gerade-hoch") ? "up" : "down",
						kopf: this.closest(".kopf"),
					});
				});
			}
		});
	},
	/* jshint ignore:start */
	// Elemente umschalten: Blöcke auf oder zuklappen
	//   auf = Boolean
	//     (die Blöcke sollen geöffnet werden)
	//   key = String
	//     (Schlüssel des Abschnitts)
	elementKopfToggle ({auf, key}) {
		let koepfe = document.querySelectorAll(`#${key} > .kopf`);
		for (let kopf of koepfe) {
			let next = kopf.nextSibling,
				nextKopf = next?.classList.contains("kopf"),
				nextPre = next?.classList.contains("pre-cont"),
				nextAbschnitt = next?.classList.contains("abschnitt-cont"),
				nextOff = nextAbschnitt && next.dataset.off;
			if (auf && (!next || nextKopf || nextAbschnitt && nextOff) ||
					!auf && (nextPre || nextAbschnitt && !nextOff)) {
				kopf.dispatchEvent(new MouseEvent("click"));
			}
		}
	},
	/* jshint ignore:end */
	// Element-Vorschau umschalten: Standard-Arrays
	//   div = Element
	//     (Kopf, zu dem die Vorschau eingeblendet werden soll)
	elementPreviewArr ({div}) {
		div.addEventListener("click", function() {
			// Preview ausblenden
			let pre = this.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				xml.editFrage({
					pre,
					fun: () => xml.elementPreviewOff({pre}),
					triggerSave: true,
				});
				return;
			}
			// Preview einblenden
			let kopf = this.closest(".kopf"),
				key = kopf.dataset.key,
				id = kopf.dataset.id,
				slot = -1;
			if (key !== "bg" && /^(re|le|wi)$/.test(key)) {
				slot = parseInt(kopf.dataset.slot, 10);
			} else if (key !== "bg") {
				slot = xml.data.xl[key].findIndex(i => i.id === id);
			}
			let xmlStr = "";
			if (key === "re") {
				xmlStr = xml.data.xl.md.re[slot].xl;
			} else if (key === "bg") {
				xmlStr = xml.data.xl.bg[xml.bgAkt].xl;
			} else {
				xmlStr = xml.data.xl[key][slot].xl;
			}
			xml.preview({
				xmlStr,
				key,
				slot,
				after: this,
				editable: /^(bg|bl|wi)$/.test(key) ? true : false,
			});
		});
	},
	// Element-Vorschau ausblenden
	//   pre = Element
	//     (Vorschau, die ausgeblendet werden soll)
	elementPreviewOff ({pre}) {
		return new Promise(resolve => {
			pre.style.height = `${pre.offsetHeight}px`;
			setTimeout(() => {
				pre.style.height = "0px";
				setTimeout(() => {
					pre.parentNode.removeChild(pre);
					resolve(true);
				}, 300);
			}, 0);
		});
	},
	// Element entfernen: Standard-Arrays
	//   a = Element
	//     (der Lösch-Link)
	elementLoeschenArr ({a}) {
		a.addEventListener("click", async function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			// Variablen ermitteln
			let kopf = this.closest(".kopf"),
				key = kopf.dataset.key,
				id = kopf.dataset.id,
				slot = -1;
			if (key !== "bg" && /^(re|le|wi|nw|tf)$/.test(key)) {
				slot = parseInt(kopf.dataset.slot, 10);
			} else if (key !== "bg") {
				slot = xml.data.xl[key].findIndex(i => i.id === id);
			}
			// Ist das Bedeutungsgerüst noch im Bearbeiten-Modus?
			if (/^(nw|tf)$/.test(key)) {
				const antwort = await xml.bgCloseXML();
				if (antwort === null) {
					return;
				}
			}
			// Datensatz löschen
			if (/^(nw|tf)$/.test(key)) {
				xml.data.xl.bg[xml.bgAkt][key].splice(slot, 1);
			} else if (key === "bg") {
				xml.data.xl.bg.splice(xml.bgAkt, 1);
			} else if (key === "re") {
				xml.data.xl.md.re.splice(slot, 1);
			} else {
				xml.data.xl[key].splice(slot, 1);
			}
			if (!/^(nw|tf)$/.test(key)) {
				// ggf. Preview ausblenden
				let pre = kopf.nextSibling;
				if (pre && pre.classList.contains("pre-cont")) {
					await xml.elementPreviewOff({pre});
				}
				// Element entfernen
				kopf.parentNode.removeChild(kopf);
			}
			// Leermeldung erzeugen oder Ansicht auffrischen
			if (/^(re|le|wi|nw|tf)$/.test(key)) {
				let id = "";
				if (key === "re") {
					id = "md";
				} else if (/^(nw|tf)$/.test(key)) {
					id = `bg-${key}`;
				} else {
					id = key;
				}
				if (key === "le" && xml.data.xl.le.length ||
						key === "re" && xml.data.xl.md.re.length ||
						key === "wi" && xml.data.xl.wi.length) {
					if (key === "re") {
						xml.refreshSlots({key: "md"});
					} else {
						xml.refreshSlots({key});
					}
					if (key === "wi") {
						xml.wiVerweistypGrenze();
					}
					xml.layoutTabellig({
						id,
						ele: [3, 4],
					});
				} else if (key === "wi" && !xml.data.xl.wi.length) {
					xml.elementLeer({
						ele: document.getElementById("wi"),
					});
				} else if (/^(nw|tf)$/.test(key)) {
					let ele = [2, 3];
					if (key === "nw") {
						ele = [3, 4];
						xml.bgNachweiseRefresh();
					} else {
						xml.bgTextreferenzenRefresh();
					}
					xml.bgNwTfMake({key});
					if (xml.data.xl.bg[xml.bgAkt][key].length) {
						xml.layoutTabellig({
							id,
							ele,
						});
					}
				}
			} else if (key === "bg") {
				xml.bgReset();
			} else if (!xml.data.xl[key].length) {
				xml.elementLeer({
					ele: document.getElementById(key),
				});
			} else {
				if (key === "lt") {
					xml.bgNwTfMake({key: "nw"});
				}
				xml.layoutTabellig({
					id: key,
					ele: [2, 3],
				});
			}
			// Daten speichern
			xml.speichern();
		});
	},
	// Meldung anzeigen, dass in einer Datenstruktur noch keine Daten zu finden sind
	//   ele = Element
	//     (Container dessen Datenstruktur betroffen ist)
	elementLeer ({ele}) {
		let p = document.createElement("p");
		ele.appendChild(p);
		p.classList.add("leer");
		p.textContent = "keine Daten";
	},
	// Abschnitt: neuen Datensatz anlegen
	//   element = Element
	//     (das Element, von dem ausgehend entschieden wird,
	//     wo der Abschnitt hinzugefügt werden soll)
	async abschnittAdd ({element}) {
		// Datensatz erzeugen und speichern
		let data = {
			id: "",
			le: 1,
			ty: "",
			ct: [],
		};
		let cont = element.closest("div");
		const key = cont.id;
		xml.data.xl[key].push(data);
		xml.speichern();
		// Container erzeugen
		xml.abschnittMake({
			key,
			slot: xml.data.xl[key].length - 1,
			cont: cont,
		});
		// ggf. an die richtige Fensterposition scrollen
		// 300ms warten, weil evtl. andere Blöcke gerade geschlossen werden
		await new Promise(resolve => setTimeout(() => resolve(true), 300));
		let aktiv = document.activeElement,
			rect = aktiv.getBoundingClientRect();
		const header = document.querySelector("header").offsetHeight,
				kopf = aktiv.closest(".abschnitt-cont").previousSibling.offsetHeight;
		if (rect.bottom > window.innerHeight ||
				rect.top - header - kopf - 15 < 0) {
			window.scrollTo({
				top: rect.top + window.scrollY - header - kopf - 15, // 15px Extra-Margin nach oben
				left: 0,
				behavior: "smooth",
			});
		}
	},
	// Abschnitt: neuen Datensatz anlegen (Shortcut)
	abschnittAddShortcut () {
		let cont = document.activeElement.closest(".text-cont"),
			element;
		if (cont) { // oberhalb des aktiven Elements
			const key = cont.id;
			element = document.querySelector(`#${key} .abschnitt-add`);
		} else if (!xml.data.xl.ab.length) { // in Abstract
			element = document.querySelector("#ab .abschnitt-add");
		} else { // in Text
			element = document.querySelector("#tx .abschnitt-add");
		}
		xml.abschnittAdd({element});
	},
	// Abschnitt: Kopf und Container erzeugen
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   slot = Number
	//     (Slot, in dem der Datensatz steht)
	//   cont = Element
	//     (Element, an das der Abschnitt angehängt werden soll)
	//   restore = true || undefined
	//     (die Inhalte werden beim Öffnen des Fensters wiederhergestellt)
	abschnittMake ({key, slot, cont, restore = false}) {
		// offene Abschnitte und Unterabschnitte schließen
		document.querySelectorAll(`#${cont.id} > .kopf`).forEach(async div => {
			if (!div.nextSibling.dataset.off) {
				div.dispatchEvent(new MouseEvent("click"));
			}
		});
		// neuen Abschnittskopf hinzufügen
		let kopf = xml.elementKopf({key, slot, textKopf: "abschnitt"});
		cont.appendChild(kopf);
		// Abschnitt-Container hinzufügen
		let div = document.createElement("div");
		div.classList.add("abschnitt-cont");
		cont.appendChild(div);
		// Formular
		let p = document.createElement("p");
		div.appendChild(p);
		p.classList.add("dropdown-cont", "input-text");
		// ID-Feld
		let id = document.createElement("input");
		p.appendChild(id);
		id.id = `abschnitt-${xml.counter.next().value}-id`;
		id.placeholder = "Abschnitt-ID";
		id.type = "text";
		id.value = xml.data.xl[key][slot].id;
		xml.abtxChange({ele: id});
		// Abschnitt-Typ-Feld
		let typ = document.createElement("input");
		p.appendChild(typ);
		typ.classList.add("dropdown-feld");
		typ.id = `abschnitt-${xml.counter.next().value}-ty`;
		typ.placeholder = "Abschnitt-Typ";
		typ.type = "text";
		typ.value = xml.data.xl[key][slot].ty;
		dropdown.feld(typ);
		let aTyp = dropdown.makeLink("dropdown-link-element", "Abschnitt-Typ auswählen", true);
		p.appendChild(aTyp);
		xml.abtxChange({ele: typ});
		// Block-Typ-Feld
		let span = document.createElement("span");
		p.appendChild(span);
		span.classList.add("dropdown-cont");
		let add = document.createElement("input");
		span.appendChild(add);
		add.classList.add("dropdown-feld");
		add.id = `textblock-add-${xml.counter.next().value}-${key}`;
		add.setAttribute("readonly", "true");
		add.type = "text";
		if (restore) {
			add.value = "Textblock";
		} else {
			add.value = "Überschrift";
		}
		add.placeholder = "Block-Typ";
		dropdown.feld(add);
		add.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers &&
					evt.key === "Enter" &&
					!document.getElementById("dropdown")) {
				setTimeout(() => { // ohne Timeout bekommt man direkt einen Zeilenumbruch im Textfeld
					xml.textblockAdd({input: this});
				}, 25);
			}
		});
		if (!restore) {
			add.select();
		}
		let aAdd = dropdown.makeLink("dropdown-link-element", "Block-Typ auswählen", true);
		span.appendChild(aAdd);
		// Add-Link
		let a = document.createElement("a");
		span.appendChild(a);
		a.classList.add("icon-link", "icon-plus-dick");
		a.href = "#";
		a.textContent = " ";
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let input = this.parentNode.querySelector("input");
			xml.textblockAdd({input});
		});
		// Layout der Köpfe anpassen
		let layout = {
			id: key,
			ele: [3, 4],
		};
		if (restore) {
			layout.warten = 300;
		}
		xml.layoutTabellig(layout);
	},
	// Abschnitt: ID automatisch anpassen (nach Speichern einer Überschrift)
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   slot = Number
	//     (Slot, in dem der Datensatz steht)
	//   slotBlock = Number
	//     (Slot, in dem der Textblock steht)
	abschnittSetId ({key, slot, slotBlock}) {
		// ID ermitteln und normieren
		let id = "",
			xl = xml.data.xl[key][slot].ct[slotBlock]?.xl; // jshint ignore:line
		if (xl) { // wird nach dem Löschen einer Überschrift genutzt
			id = xl.replace(/<Anmerkung>.+?<\/Anmerkung>/s, "");
			id = id.replace(/<.+?>/g, "");
			id = helfer.textTrim(id, true);
			id = xml.abschnittNormId({id});
		}
		// ID schreiben und Datensatz speichern
		xml.data.xl[key][slot].id = id;
		xml.speichern();
		// Kopf und Abschnitt ermitteln
		let kopf = document.querySelector(`#${key} .kopf[data-slot="${slot}"]`),
			abschnitt = kopf.nextSibling;
		abschnitt.querySelector(`input[id$="-id"]`).value = id;
		// Kopf anpassen
		let kopfNeu = xml.elementKopf({key, slot, textKopf: "abschnitt"});
		kopf.parentNode.replaceChild(kopfNeu, kopf);
		xml.checkAbschnitt({
			cont: abschnitt,
		});
	},
	// Abschnitt: ID normieren
	//   id = String
	//     (die ID)
	//   input = Element || undefined
	//     (das Input-Element, aus dem die ID ausgelesen wurde)
	abschnittNormId ({id, input = null}) {
		let val = id.replace(/^[0-9]+|[&/=?#]+/g, "");
		val = val.replace(/\s/g, "_");
		val = val.replace(/_{2,}/g, "_");
		if (input && val !== id) {
			input.value = val;
		}
		return val;
	},
	// Textblock: neuen Datensatz für einen Textblock anlegen
	//   input = Element
	//     (das Textfeld mit dem Textblocktyp)
	textblockAdd ({input}) {
		const typ = helfer.textTrim(input.value, true);
		// korrekter Typ?
		if (!xml.dropdown.abschnittBloecke.includes(typ)) {
			const typen = xml.typen({key: "abschnittBloecke"});
			dialog.oeffnen({
				typ: "alert",
				text: `Als Block-Typen stehen nur ${typen} zur Verfügung.`,
				callback: () => input.select(),
			});
			return;
		}
		// Textfeld zurücksetzen
		input.value = "Textblock";
		// Key und Slot ermitteln
		let cont = input.closest(".abschnitt-cont"),
			kopf = cont.previousSibling;
		const key = kopf.dataset.key,
			slot = parseInt(kopf.dataset.slot, 10);
		// Schon eine Überschrift vorhanden?
		if (typ === "Überschrift") {
			let ueberschrift = xml.data.xl[key][slot].ct.find(i => i.it === "Überschrift");
			if (ueberschrift) {
				dialog.oeffnen({
					typ: "alert",
					text: "Der Abschnitt hat schon eine Überschrift.",
					callback: () => input.select(),
				});
				return;
			}
		}
		// Datensatz erzeugen und hinzufügen
		let data = {
			it: typ,
			xl: "",
		};
		if (typ === "Textblock") {
			data.id = "";
		}
		let slotBlock = -1;
		if (typ === "Überschrift") {
			xml.data.xl[key][slot].ct.unshift(data);
			slotBlock = 0;
			cont.querySelectorAll(".kopf, .pre-cont").forEach(i => {
				const slotBlock = parseInt(i.dataset.slotBlock, 10) + 1;
				i.dataset.slotBlock = slotBlock;
			});
		} else {
			xml.data.xl[key][slot].ct.push(data);
			slotBlock = xml.data.xl[key][slot].ct.length - 1;
		}
		xml.speichern();
		// alle offenen Blöcke schließen
		cont.querySelectorAll(".kopf").forEach(div => {
			if (!div.nextSibling.dataset.off) {
				div.dispatchEvent(new MouseEvent("click"));
			}
		});
		// Container erzeugen
		xml.textblockMake({
			key,
			slot,
			slotBlock,
			element: cont.firstChild,
		});
	},
	// Textblock: Kopf und Container erzeugen
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   slot = Number
	//     (Slot, in dem der Datensatz steht)
	//   slotBlock = Number || undefined
	//     (Slot, in dem der Textblock steht)
	//   element = Element
	//     (Element, an dem sich beim Einfügen orientiert wird)
	//   restore = true || undefined
	//     (die Inhalte werden beim Öffnen des Fensters wiederhergestellt)
	textblockMake ({key, slot, slotBlock, element, restore = false}) {
		// Kopf erzeugen und Textblock-Container hinzufügen
		let kopf = xml.elementKopf({key, slot, slotBlock, textKopf: "textblock"}),
			div = document.createElement("div");
		div.classList.add("textblock-cont");
		if (element.nextSibling &&
				xml.data.xl[key][slot].ct[slotBlock].it === "Überschrift") {
			element.parentNode.insertBefore(kopf, element.nextSibling);
			kopf.parentNode.insertBefore(div, kopf.nextSibling);
		} else {
			element.parentNode.appendChild(kopf);
			element.parentNode.appendChild(div);
		}
		xml.checkAbschnitt({
			cont: element.closest(".abschnitt-cont"),
		});
		// Formular
		if (xml.data.xl[key][slot].ct[slotBlock].it === "Textblock") {
			let p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("dropdown-cont", "input-text");
			// ID-Feld
			let id = document.createElement("input");
			p.appendChild(id);
			id.id = `textblock-${xml.counter.next().value}-id`;
			id.placeholder = "Textblock-ID";
			id.type = "text";
			id.value = xml.data.xl[key][slot].ct[slotBlock].id;
			xml.abtxChange({ele: id});
		}
		// Textfeld erzeugen
		xml.preview({
			xmlStr: xml.data.xl[key][slot].ct[slotBlock].xl,
			key,
			slot,
			slotBlock,
			after: div.firstChild,
			textblockCont: div,
			animation: false,
			editable: true,
		});
		if (!restore) {
			xml.edit({
				cont: div.lastChild,
			});
		}
		// Layout der Köpfe anpassen
		let layout = {
			id: key,
			ele: [3],
			inAbschnitt: div.closest(".abschnitt-cont"),
		};
		if (restore) {
			layout.warten = 300;
		}
		xml.layoutTabellig(layout);
	},
	// Textblock: Textfeld automatisch speichern, sollte das Bearbeiten-Feld noch offen sein
	//   cont = Element
	//     (.textblock-cont)
	textblockSave ({cont}) {
		let speichernButton = cont.querySelector(`input[value="Speichern"]`);
		if (speichernButton) {
			speichernButton.dispatchEvent(new MouseEvent("click"));
		}
	},
	// Textblock: XML-String zusammenbauen
	//   xmlStr = String || null
	//     (null, wenn der String aus dem Datensatz ausgelesen werden soll)
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   slot = Number
	//     (Slot, in dem der Datensatz steht)
	//   slotBlock = Number
	//     (Slot, in dem der Textblock steht)
	textblockXmlStr ({xmlStr, key, slot, slotBlock}) {
		// XML-String ggf. auslesen
		if (xmlStr === null) {
			xmlStr = xml.data.xl[key][slot].ct[slotBlock].xl;
		}
		// sollte der XML-String jetzt immer noch leer sein => einen leeren String zurückgeben
		// (leere Textfelder sollten immer einen Fehler zurückgeben, was so sichergestellt wird)
		if (!xmlStr) {
			return "";
		}
		// Attribute ermitteln
		let attr = [];
		if (xml.data.xl[key][slot].ct[slotBlock].id) {
			attr.push(`xml:id="${xml.data.xl[key][slot].ct[slotBlock].id}"`);
		}
		// XML-String anpassen
		const rootEle = xml.data.xl[key][slot].ct[slotBlock].it.replace(/^Ü/, "Ue"),
			rootEleStart = `<${rootEle}${attr.length ? " " + attr.join(" ") : ""}>`;
		if (!new RegExp(`^<${rootEle}`).test(xmlStr)) {
			xmlStr = `${rootEleStart}${xmlStr}</${rootEle}>`;
		} else {
			xmlStr = xmlStr.replace(/^<.+?>/, rootEleStart);
		}
		// Ergebnis auswerfen
		return xmlStr;
	},
	// Abschnitt/Textblock: Anzeige der Blöcke in Abstract und Text umschalten
	//   div = Element
	//     (Kopf, dessen Formularteil ein- oder ausgeblendet werden soll)
	abtxToggle ({div}) {
		div.addEventListener("click", function() {
			let cont = this.nextSibling;
			if (cont.dataset.off) {
				cont.style.height = "auto";
				const height = cont.offsetHeight;
				cont.style.height = "0px";
				setTimeout(() => {
					cont.style.height = `${height}px`;
					delete cont.dataset.off;
					setTimeout(() => {
						cont.style.removeProperty("overflow");
						cont.style.removeProperty("height");
					}, 300);
				}, 0);
			} else {
				if (this.closest(".abschnitt-cont")) {
					xml.textblockSave({cont});
				} else {
					cont.querySelectorAll(".kopf").forEach(kopf => {
						if (!kopf.nextSibling.dataset.off) {
							kopf.dispatchEvent(new MouseEvent("click"));
						}
					});
				}
				cont.style.overflow = "hidden";
				cont.style.height = `${cont.offsetHeight}px`;
				setTimeout(() => {
					cont.style.height = "0px";
					cont.dataset.off = "true";
				}, 0);
			}
		});
	},
	// Abschnitt/Textblock, Change-Listener: generischer Listener für Textformulare
	//   ele = Element
	//     (das Input-Element, auf dessen Änderung gehört wird)
	abtxChange ({ele}) {
		ele.addEventListener("change", function() {
			let abschnitt = this.closest(".abschnitt-cont"),
				textblock = this.closest(".textblock-cont"),
				kopf = abschnitt.previousSibling,
				key = kopf.dataset.key,
				slot = parseInt(kopf.dataset.slot, 10),
				feld = this.id.replace(/.+-/, ""),
				val = helfer.textTrim(this.value, true);
			if (textblock) {
				// Textblock (Textblock, Illustration)
				if (feld === "id") {
					// ID aufbereiten
					val = xml.abschnittNormId({id: val, input: this});
				}
				let kopfBlock = textblock.previousSibling;
				const slotBlock = parseInt(kopfBlock.dataset.slotBlock, 10);
				xml.data.xl[key][slot].ct[slotBlock][feld] = val;
				// Kopf anpassen
				let kopfNeu = xml.elementKopf({key, slot, slotBlock, textKopf: "textblock"});
				kopfBlock.parentNode.replaceChild(kopfNeu, kopfBlock);
				xml.checkAbschnitt({
					cont: abschnitt,
				});
				// XML-String auffrischen
				const xmlStr = xml.textblockXmlStr({xmlStr: null, key, slot, slotBlock});
				// Pre zurücksetzen
				// (aber nur, wenn er nicht gerade in Bearbeitung ist)
				let cont = textblock.querySelector(".pre-cont");
				if (cont.querySelector("pre")) {
					let pre = document.createElement("pre");
					cont.replaceChild(pre, cont.firstChild);
					xml.preview({
						xmlStr,
						after: cont.previousSibling,
						textblockCont: textblock,
					});
					xml.editPreDbl({pre});
				}
				// XML updaten
				xml.data.xl[key][slot].ct[slotBlock].xl = xmlStr;
				// Layout der Köpfe anpassen
				xml.layoutTabellig({
					id: key,
					ele: [3],
					inAbschnitt: abschnitt,
				});
			} else if (abschnitt) {
				// Abschnitt
				if (feld === "id") {
					// ID aufbereiten
					val = xml.abschnittNormId({id: val, input: this});
				} else if (val && feld === "ty" && !xml.dropdown.abschnittTypen.includes(val)) {
					val = "";
					this.value = "";
				}
				xml.data.xl[key][slot][feld] = val;
				// Kopf anpassen
				let kopfNeu = xml.elementKopf({key, slot, textKopf: "abschnitt"});
				kopf.parentNode.replaceChild(kopfNeu, kopf);
				xml.checkAbschnitt({
					cont: abschnitt,
				});
				// Layout der Köpfe anpassen
				xml.layoutTabellig({
					id: key,
					ele: [3, 4],
				});
			}
			xml.speichern();
		});
	},
	// Abschnitt/Textblock: Löschen
	//   a = Element
	//     (der Lösch-Link)
	abtxLoeschen ({a}) {
		a.addEventListener("click", async function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			// Datensatz ermitteln
			let kopf = this.closest(".kopf"),
				key = kopf.dataset.key,
				slot = parseInt(kopf.dataset.slot, 10),
				slotBlock = null;
			if (kopf.dataset.slotBlock) {
				slotBlock = parseInt(kopf.dataset.slotBlock, 10);
			}
			// Sicherheitsfrage
			if (slotBlock === null && xml.data.xl[key][slot].ct.length) {
				const frage = await new Promise(resolve => {
					dialog.oeffnen({
						typ: "confirm",
						text: "Soll der Abschnitt zusammen mit allen untergeordneten Blöcken wirklich gelöscht werden?",
						callback: () => resolve(dialog.antwort),
					});
				});
				if (!frage) {
					return;
				}
			}
			// ggf. Block ausblenden
			let abschnitt = kopf.closest(".abschnitt-cont"), // null, wenn Abschnitt gelöscht wird
				cont = kopf.nextSibling,
				parent = kopf.parentNode;
			if (!cont.dataset.off) {
				kopf.dispatchEvent(new MouseEvent("click"));
				await new Promise(warten => setTimeout(() => warten(true), 300));
			}
			// Elemente entfernen
			// (wird beim Schließen der Container ein Speichern angestoßen, wird
			// der Kopf neu erstellt => die Referenz zu parentNode besteht dann nicht mehr;
			// das kann nur bei Textblöcken geschehen)
			if (!kopf.parentNode && slotBlock !== null) {
				kopf = parent.querySelector(`[data-slot-block="${slotBlock}"]`);
			}
			kopf.parentNode.removeChild(cont);
			kopf.parentNode.removeChild(kopf);
			// Fehlercheck des Abschnitts anstoßen
			xml.checkAbschnitt({
				cont: abschnitt,
			});
			// Datensatz löschen
			if (slotBlock !== null) {
				// ID des Abschnitts leeren?
				let setId = false;
				if (xml.data.xl[key][slot].ct[slotBlock].it === "Überschrift") {
					setId = true;
				}
				xml.data.xl[key][slot].ct.splice(slotBlock, 1);
				if (setId) {
					xml.abschnittSetId({key, slot, slotBlock});
				}
			} else {
				xml.data.xl[key].splice(slot, 1);
			}
			// Slot-Datasets anpassen
			xml.refreshSlots({key, abschnitt});
			// ggf. Ansicht auffrischen
			if (slotBlock !== null && xml.data.xl[key][slot].ct.length) {
				xml.layoutTabellig({
					id: key,
					ele: [3],
					inAbschnitt: abschnitt,
				});
			} else if (slotBlock === null && xml.data.xl[key].length) {
				xml.layoutTabellig({
					id: key,
					ele: [3, 4],
				});
			}
			// Daten speichern
			xml.speichern();
		});
	},
	// XML-Vorschau erzeugen
	//   xmlStr = String
	//     (XML-Snippet, das angezeigt werden soll)
	//   key = String || undefined
	//     (der Schlüssel des Datensatzes; undefined, wenn Anzeige zurückgesetzt wird)
	//   slot = Number || undefined
	//     (Slot, in dem der Datensatz steht; undefined, wenn Anzeige zurückgesetzt wird)
	//   slotBlock = Number || undefined
	//     (Slot, in dem der Textblock steht)
	//   after = Element || undefined
	//     (Elemente, hinter dem das Preview erscheinen soll)
	//   textblockCont = Element || undefined
	//     (Container eines Textblocks: .textblock-cont)
	//   animation = false || undefined
	//     (Animation beim Einblenden)
	//   editable = Boolean || undefined
	//     (XML-Snippet darf editiert werden)
	preview ({xmlStr, key, slot, slotBlock = null, after = null, textblockCont = null, animation = true, editable = false}) {
		// Einzüge hinzufügen (wenn möglich)
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xmlStr, "text/xml");
		if (!xmlDoc.querySelector("parsererror")) {
			xmlDoc = helferXml.indent(xmlDoc);
			xmlStr = new XMLSerializer().serializeToString(xmlDoc);
		}
		// Fehler auslesen (falls vorhanden)
		let kopf = after;
		if (!after) {
			kopf = textblockCont.previousSibling;
		} else if (!kopf.classList.contains("kopf")) {
			kopf = after.closest(".textblock-cont").previousSibling;
		}
		let warn = kopf.querySelector(".warn"),
			xmlErr = null;
		if (warn?.dataset?.err) { // jshint ignore:line
			let err = warn.dataset.err.match(/on line ([0-9]+) at column ([0-9]+)/);
			if (err) {
				xmlErr = {
					line: parseInt(err[1], 10),
					column: parseInt(err[2], 10),
					entity: /Entity/.test(warn.dataset.err),
				};
			}
		}
		// Pre-Container wird schon angezeigt => neu ausfüllen
		let preCont = after ? after.nextSibling : textblockCont.firstChild;
		if (preCont && preCont.classList.contains("pre-cont")) {
			preCont.firstChild.innerHTML = helferXml.prettyPrint({xmlStr, xmlErr});
			return;
		}
		// Pre-Container mit Pre erzeugen und einhängen
		let cont = document.createElement("div");
		cont.classList.add("pre-cont");
		cont.dataset.key = key;
		cont.dataset.slot = slot;
		if (slotBlock !== null) {
			cont.dataset.slotBlock = slotBlock;
		}
		let pre = document.createElement("pre");
		cont.appendChild(pre);
		pre.innerHTML = helferXml.prettyPrint({xmlStr, xmlErr});
		if (after) {
			after.parentNode.insertBefore(cont, after.nextSibling);
		} else {
			textblockCont.appendChild(cont);
		}
		// ggf. Editier-Button ergänzen
		if (editable) {
			let p = document.createElement("p");
			cont.appendChild(p);
			xml.editBearbeiten({p});
			xml.editPreDbl({pre});
		}
		// Pre-Container smooth einblenden
		if (!animation) {
			return;
		}
		let height = cont.offsetHeight;
		cont.style.height = "0px";
		setTimeout(() => {
			cont.style.height = `${height}px`;
			setTimeout(() => cont.style.removeProperty("height"), 300);
		}, 0);
	},
	// XML-Vorschau: nach Erzeugen des Bearbeitenfeldes an die Nullposition
	editSelect0: true,
	// XML-Vorschau: generische Funktion zum Erzeugen eines Bearbeitenfeldes
	//   cont = Element
	//     (.pre-cont)
	edit ({cont}) {
		let key = cont.dataset.key,
			slot = -1,
			slotBlock = null;
		if (cont.dataset.slot) {
			slot = parseInt(cont.dataset.slot, 10);
		}
		if (cont.dataset.slotBlock) {
			slotBlock = parseInt(cont.dataset.slotBlock, 10);
		}
		// Bearbeiten-Feld erzeugen
		let div = document.createElement("div");
		div.classList.add("bearbeiten");
		let ta = document.createElement("textarea");
		div.appendChild(ta);
		ta.setAttribute("rows", "1");
		if (key === "bg") {
			ta.value = xml.data.xl.bg[xml.bgAkt].xl;
		} else if (slotBlock !== null) {
			ta.value = xml.data.xl[key][slot].ct[slotBlock].xl;
		} else {
			ta.value = xml.data.xl[key][slot].xl;
		}
		ta.addEventListener("input", function() {
			this.dataset.geaendert = "true";
			helfer.textareaGrow(this, 0);
		});
		if (slotBlock !== null) {
			ta.addEventListener("paste", function() {
				// Zeitverzögerung, sonst ist das Feld noch leer
				// und es kann nichts ausgelesen werden
				setTimeout(() => {
					let val = this.value;
					// Zeilenumbrüche aus Überschriften entfernen (wenn noch keine Tags drin sind)
					if (xml.data.xl[key][slot].ct[slotBlock].it === "Überschrift" &&
							!/<.+?>/.test(val)) {
						val = val.replace(/\n/g, " ");
					}
					// Text trimmen
					val = helfer.textTrim(val, true);
					// Auto-Tagger aufrufen
					const blockzitat = xml.data.xl[key][slot].ct[slotBlock].it === "Blockzitat" ? true : false;
					this.value = xml.editAutoTagger({str: val, blockzitat});
					// Formularhöhe anpassen
					helfer.textareaGrow(this, 0);
				}, 25);
			});
		}
		// Element einhängen und fokussieren
		cont.replaceChild(div, cont.firstChild);
		helfer.textareaGrow(ta, 0);
		if (xml.editSelect0) {
			ta.setSelectionRange(0, 0); // an die oberste Position
			ta.focus();
		}
		// Button-Leiste auffrischen
		let p = cont.lastChild;
		helfer.keineKinder(p);
		let buttons = ["Speichern", "Abbrechen"];
		for (let b of buttons) {
			let button = document.createElement("input");
			p.appendChild(button);
			button.type = "button";
			button.value = b;
			xml.editSpeichern({button});
		}
	},
	// XML-Vorschau: Doppelklick zum Bearbeiten einer Vorschau
	//   pre = Element
	//     (der Vorschaucontainer .pre-cont)
	editPreDbl ({pre}) {
		pre.addEventListener("dblclick", function() {
			let cont = this.closest(".pre-cont");
			// feststellen, an welcher Position geklickt wurde
			let sel = window.getSelection(),
				breakGetN = false,
				text = "",
				posStart = -1,
				posEnd = -1;
			if (sel) {
				getN(this);
				posEnd = text.length + sel.focusOffset;
				posStart = posEnd - sel.toString().length;
			}
			// Textarea öffnen (ohne Textposition zu markieren)
			xml.editSelect0 = false;
			let button = cont.querySelector(`input[value="Bearbeiten"]`);
			button.dispatchEvent(new MouseEvent("click"));
			// Textposition markieren
			let ta = cont.querySelector("textarea");
			if (posStart > -1) {
				if ( /\n/.test( ta.value.substring(posStart, posEnd) ) ) {
					ta.setSelectionRange(posStart, posStart);
				} else {
					ta.setSelectionRange(posEnd, posEnd);
				}
			} else {
				ta.setSelectionRange(0, 0);
			}
			ta.focus();
			xml.editSelect0 = true;
			// Knoten rekursiv durchgehen, um den Text zu ermitteln
			//   n = Knoten
			//     (ein Text- oder Elementknoten im <pre>)
			function getN (n) {
				if (breakGetN || n === sel.focusNode) {
					breakGetN = true;
					return;
				}
				if (n.nodeType === 1) {
					for (let c of n.childNodes) {
						getN(c);
					}
				} else if (n.nodeType === 3) {
					text += n.nodeValue;
				}
			}
		});
	},
	// XML-Vorschau: Bearbeiten-Button erzeugen
	//   p = Element
	//     (Absatz für den Bearbeiten-Button)
	editBearbeiten ({p}) {
		helfer.keineKinder(p);
		let bearb = document.createElement("input");
		p.appendChild(bearb);
		bearb.type = "button";
		bearb.value = "Bearbeiten";
		bearb.addEventListener("click", function() {
			xml.edit({
				cont: this.closest(".pre-cont"),
			});
		});
	},
	// XML-Vorschau: Speichern-/Abbrechen-Button erzeugen
	//   button = Element
	//     (Speichern- oder Abbrechen-Button)
	editSpeichern ({button}) {
		button.addEventListener("click", async function() {
			// Datensatz ermitteln
			let cont = this.closest(".pre-cont"),
				kopf = cont.previousSibling;
			if (!kopf || !kopf.classList.contains("kopf")) {
				kopf = cont.closest(".textblock-cont").previousSibling;
			}
			let xmlStr = cont.querySelector("textarea").value.trim(),
				key = cont.dataset.key,
				slot = -1,
				slotBlock = null;
			if (cont.dataset.slot) {
				slot = parseInt(cont.dataset.slot, 10);
			}
			if (cont.dataset.slotBlock) {
				slotBlock = parseInt(cont.dataset.slotBlock, 10);
			}
			// Aktion ausführen
			let refreshSlots = false;
			if (this.value === "Speichern") {
				// XML-String ggf. automatisch taggen
				if (slotBlock !== null) {
					const blockzitat = xml.data.xl[key][slot].ct[slotBlock].it === "Blockzitat" ? true : false;
					xmlStr = xml.editAutoTagger({str: xmlStr, blockzitat});
				}
				// ggf. Daten auffrischen
				if (key === "bl") {
					let id = xmlStr.match(/xml:id="(.+)"/),
						da = xmlStr.match(/<Datum>(.+?)<\/Datum>/);
					if (id) {
						xml.data.xl.bl[slot].id = id[1];
					}
					if (da && da[1] !== xml.data.xl.bl[slot].da) {
						xml.data.xl.bl[slot].da = da[1];
						xml.data.xl.bl[slot].ds = helferXml.datumFormat({xmlStr}).sortier;
						xml.empfangenArrSort({key: "bl"});
						const slotNeu = xml.data.xl.bl.findIndex(i => i.id === id[1]);
						slot = slotNeu;
						refreshSlots = true;
					}
				} else if (key === "wi") {
					// Linktyp neu auslesen
					let lt = xml.data.xl.wi[slot].lt;
					if (/^<Textreferenz/.test(xmlStr)) {
						lt = "Textverweis";
					} else if (/^<Verweis>/.test(xmlStr)) {
						lt = "Verweis intern";
					} else if (/^<Verweis_extern>/.test(xmlStr)) {
						lt = "Verweis extern";
					}
					// Textreferenz neu auslesen
					let tx = xml.data.xl.wi[slot].tx,
						reg = /<Textreferenz Ziel=".+?">(?<tr>.+?)<\/Textreferenz>|<Verweistext>(?<vt>.+?)<\/Verweistext>|<Verweisziel>(?<vz>.+?)<\/Verweisziel>/.exec(xmlStr);
					if (reg?.groups.tr) { // jshint ignore:line
						tx = reg.groups.tr;
					} else if (reg?.groups.vt) { // jshint ignore:line
						tx = reg.groups.vt;
					} else if (reg?.groups.vz) { // jshint ignore:line
						tx = reg.groups.vz;
					}
					// Werte neu setzen
					xml.data.xl.wi[slot].lt = lt;
					xml.data.xl.wi[slot].tx = tx;
				}
				// Speichern
				if (key === "bg") {
					xml.data.xl.bg[xml.bgAkt].xl = xmlStr;
					xml.bgRefreshData();
				} else if (slotBlock !== null) {
					// XML anpassen und speichern
					xmlStr = xml.textblockXmlStr({xmlStr, key, slot, slotBlock});
					xml.data.xl[key][slot].ct[slotBlock].xl = xmlStr;
					// ggf. ID erzeugen
					if (key === "tx" &&
							xml.data.xl[key][slot].ct[slotBlock].it === "Überschrift") {
						xml.abschnittSetId({key, slot, slotBlock});
					}
				} else {
					xml.data.xl[key][slot].xl = xmlStr;
				}
				xml.speichern();
			} else {
				// Abbrechen
				const frage = await xml.editFrage({
					pre: cont,
					fun: () => {},
				});
				if (!frage) {
					// Änderungen sollen nicht gespeichert werden => generischer Abschluss
					// (Inhalte werden zurückgesetzt)
					if (frage !== null) {
						xml.editSpeichernAbschluss({
							cont,
							xmlStr: resetXmlStr(),
						});
					}
				} else {
					// Änderungen sollen gespeichert werden => noch einmal von vorne
					// (denn die Statements im Speichern-Zweig wurden noch nicht ausgeführt)
					cont.querySelector(`[value="Speichern"]`).dispatchEvent(new MouseEvent("click"));
				}
				return;
			}
			// Kopf auffrischen
			let textKopf = "";
			if (slotBlock !== null) {
				textKopf = "textblock";
			}
			let kopfNeu = xml.elementKopf({key, slot, slotBlock, textKopf});
			kopf.parentNode.replaceChild(kopfNeu, kopf);
			xml.checkAbschnitt({
				cont: cont.closest(".abschnitt-cont"),
			});
			// ggf. Slots auffrischen
			// (darf erst nach dem Auffrischen des Kopfs gemacht werden)
			if (refreshSlots) {
				xml.refreshSlots({key});
			}
			// ggf. Verweistypgrenze neu markieren
			if (key === "wi") {
				xml.wiVerweistypGrenze();
			}
			// generischer Abschluss
			xml.editSpeichernAbschluss({cont, xmlStr});
			// hier abbrechen, wenn Bedeutungsgerüst
			if (key === "bg") {
				return;
			}
			// ggf. Textfeld zum Hinzufügen eines neuen Textblocks fokussieren
			if (slotBlock !== null) {
				cont.closest(".abschnitt-cont").querySelector(`input[id^="textblock-add-"]`).select();
			}
			// Layout der Köpfe anpassen
			let ele = [2, 3],
				inAbschnitt = null;
			if (slotBlock !== null) {
				ele = [3];
				inAbschnitt = cont.closest(".abschnitt-cont");
			} else if (key === "wi") {
				ele = [3, 4];
			}
			xml.layoutTabellig({
				id: key,
				ele,
				inAbschnitt,
			});
			// XML-String für das Zurücksetzen ermitteln
			function resetXmlStr () {
				if (key === "bg") {
					return xml.data.xl.bg[xml.bgAkt].xl;
				} else if (slotBlock !== null) {
					return xml.data.xl[key][slot].ct[slotBlock].xl;
				} else {
					return xml.data.xl[key][slot].xl;
				}
			}
		});
	},
	// XML-Vorschau: Speichern/Abbrechen, generischer Abschluss
	// (<pre> und Buttons zurücksetzen; muss auch bei Abbruch
	// ohne Speichern geschehen werden)
	//   cont = Element
	//     (der Container mit dem Bearbeitenfeld)
	//   xmlStr = String
	//     (die XML-Daten)
	editSpeichernAbschluss ({cont, xmlStr}) {
		// Pre zurücksetzen
		let pre = document.createElement("pre");
		cont.replaceChild(pre, cont.firstChild);
		xml.preview({
			xmlStr,
			after: cont.previousSibling,
			textblockCont: cont.closest(".textblock-cont"),
		});
		// Button zurücksetzen
		xml.editBearbeiten({p: cont.lastChild});
		xml.editPreDbl({pre});
	},
	// XML-Vorschau: Frage, ob Änderungen gespeichert werden sollen
	//   pre = Element
	//     (.pre-cont)
	//   fun = Function
	//     (Function, die eigentlich ausgeführt werden soll)
	//   triggerSave = true || undefined
	//     (das Speichern des Formulars soll ggf. ausgelöst werden)
	editFrage ({pre, fun, triggerSave = false}) {
		return new Promise(resolve => {
			let ta = pre.querySelector("textarea");
			if (ta && ta.dataset.geaendert) {
				dialog.oeffnen({
					typ: "confirm",
					text: "Möchten Sie Ihre Änderungen nicht erst einmal speichern?",
					callback: () => {
						if (dialog.antwort !== null) {
							if (dialog.antwort && triggerSave) {
								pre.querySelector(`[value="Speichern"]`).dispatchEvent(new MouseEvent("click"));
							}
							fun();
						}
						resolve(dialog.antwort);
					},
				});
				return;
			}
			fun();
			resolve(true);
		});
	},
	// XML-Vorschau: Text in der Vorschau automatisch taggen
	//   str = String
	//     (String, der getaggt werden soll)
	//   blockzitat = Boolean
	//     (der Text steht in einem Blockzitat)
	editAutoTagger ({str, blockzitat}) {
		// Attribute maskieren
		str = str.replace(/([a-zA-Z]+)="(.+?)"/g, (m, p1, p2) => `${p1}=##${p2}##`);
		// Ampersands maskieren
		str = str.replace(/&(?!amp;)/g, "&amp;");
		// <erwaehntes_Zeichen>
		str = str.replace(/__(.+?)__/g, (m, p1) => `<erwaehntes_Zeichen>${p1}</erwaehntes_Zeichen>`);
		// <Hervorhebung Stil="#i">
		str = str.replace(/\*\*(.+?)\*\*/g, (m, p1) => `<Hervorhebung Stil=###i##>${p1}</Hervorhebung>`);
		// <Hervorhebung Stil="#perspective">
		str = str.replace(/»(.+?)«/g, (m, p1) => `<Hervorhebung Stil=###perspective##>${p1}</Hervorhebung>`);
		// <Stichwort>
		str = str.replace(/(?<!\p{Letter})_(.+?)_(?!\p{Letter})/ug, (m, p1) => `<Stichwort>${p1}</Stichwort>`);
		// <Paraphrase>
		str = str.replace(/‚(.+?)‘/g, (m, p1) => `<Paraphrase>${p1}</Paraphrase>`);
		str = str.replace(/'(.+?)'/g, (m, p1) => `<Paraphrase>${p1}</Paraphrase>`);
		// <Zitat>
		str = str.replace(/„(.+?)“/g, (m, p1) => `<Zitat>${azInZitat(p1)}</Zitat>`);
		str = str.replace(/"(.+?)"/g, (m, p1) => `<Zitat>${azInZitat(p1)}</Zitat>`);
		// <Anmerkung>
		str = str.replace(/\s*\(\((.+?)\)\)/g, (m, p1) => `<Anmerkung>${p1}</Anmerkung>`);
		// <Autorenzusatz> (vor den Verweisen taggen!)
		if (blockzitat) {
			str = str.replace(/\[(.+?)\](?!\s*\()/gs, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`); // sicherstellen, dass nicht Beginn von Verweis!
			str = str.replace(/\{(.+?)\}/gs, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
		}
		// <Verweis_extern> (viele Klammern, entspannte Leerzeichenverwendung)
		str = str.replace(/\(\s*\[([^\]]+?)\]\s*\(\s*(https?:\/\/[^\s]+?)\s*\)(?:\s*\(\s*([0-9]{1,2})\.\s*([0-9]{1,2})\.\s*([0-9]{4})\s*\))?\s*\)/g, verweisExtern);
		// <Verweis_extern> (wenige Klammern, rigide Leerzeichenverwendung)
		str = str.replace(/\[([^\]]+?)\]\(\s*(https?:\/\/[^\s]+?)\s*\)(?:\(\s*([0-9]{1,2})\.\s*([0-9]{1,2})\.\s*([0-9]{4})\s*\))?/g, verweisExtern);
		// <Verweis>
		str = str.replace(/\[([^\]]+?)\]\((.+?)\)/g, (m, p1, p2) => {
			p1 = p1.trim();
			p2 = p2.trim();
			if (p1 === p2) {
				p1 = "";
			}
			let verweis = `<Verweis Typ=##vgl##>`;
			verweis += `\n  <Verweistext>${p1}</Verweistext>`;
			verweis += `\n  <Verweisziel>${p2}</Verweisziel>`;
			verweis += "\n</Verweis>";
			return verweis;
		});
		// <Belegreferenz>
		str = str.replace(/(?<!##(?:\p{Lowercase}|-)*)((\p{Lowercase}|-)+-[0-9]{4}-[0-9]+)(?!##)/ug, (m, p1) => `<Belegreferenz Ziel=##${p1}##/>`);
		// <Literaturreferenz>
		str = str.replace(/(?<!(?:\p{Letter}|\d|-|#|\/))([a-zäöü][a-zäöüß0-9\-]+)((?:,\shier|\ss\.\s?v\.)?[0-9\s,\-–]+)?(?!(?:\p{Letter}|\d|-|#))/ug, (m, p1, p2) => {
			if (!/[a-z]/.test(p1) ||
					/^[a-zäöüß]+$/.test(p1) && !p2Typisch(p2) ||
					/-/.test(p1) && !/[0-9]/.test(p1) && !p2Typisch(p2) ||
					/[0-9]/.test(p1) && !/-/.test(p1) && p1.match(/[a-zäöüß]/g).length / p1.match(/[0-9]/g).length < 2) {
				return m;
			}
			if (p2) {
				let anschluss = "";
				if (/,\s$/.test(p2)) {
					anschluss = ", ";
					p2 = p2.replace(/,\s$/, "");
				} else if (/^(,\shier|\ss\.\s?v\.)\s$/.test(p2)) {
					anschluss = p2;
					p2 = "";
				} else if (/^\s$/.test(p2)) {
					return `<Literaturreferenz Ziel=##${p1}##/>${p2}`;
				}
				return `<Literaturreferenz Ziel=##${p1}##>${p2.trim()}</Literaturreferenz>${anschluss}`;
			}
			return `<Literaturreferenz Ziel=##${p1}##/>`;
		});
		// Attribute demaskieren
		str = str.replace(/([a-zA-Z]+)=##(.+?)##/g, (m, p1, p2) => `${p1}="${p2}"`);
		// Typographie
		str = helfer.typographie(str);
		// <URL> bereinigen
		str = str.replace(/<URL>(.+?)<\/URL>/g, (m, p1) => {
			p1 = p1.replace(/–/g, "-"); // kein Halbgeviertstrich
			p1 = p1.replace(/\s/g, ""); // kein Whitespace
			p1 = p1.replace(/<[a-zA-Z]+ Ziel="(.+?)"\/?>/g, (m, p1) => p1); // keine Referenzen
			p1 = p1.replace(/<.+?>/g, ""); // keine Tags
			return `<URL>${p1}</URL>`;
		});
		// in <Aufrufdatum> kein Whitespace
		str = str.replace(/<Aufrufdatum>(.+?)<\/Aufrufdatum>/g, (m, p1) => {
			p1 = p1.replace(/\s/g, "");
			return `<Aufrufdatum>${p1}</Aufrufdatum>`;
		});
		// in <Zitat> und <Blockzitat> wohl keine <Paraphrase>, sondern <Zitat>
		if (blockzitat) {
			str = str.replace(/<Paraphrase>(.+?)<\/Paraphrase>/g, (m, p1) => `<Zitat>${p1}</Zitat>`);
		} else {
			str = str.replace(/<Zitat>(.+?)<\/Zitat>/g, (m, p1) => {
				p1 = p1.replace(/<Paraphrase>(.+?)<\/Paraphrase>/g, (m, p1) => `<Zitat>${p1}</Zitat>`);
				return `<Zitat>${p1}</Zitat>`;
			});
		}
		// <Abkuerzung>
		if (blockzitat) {
			str = str.replace(/<Autorenzusatz>(.+?)<\/Autorenzusatz>/gs, (m, p1) => {
				return `<Autorenzusatz>${helferXml.abbrTagger({text: p1})}</Autorenzusatz>`;
			});
		} else {
			str = helferXml.abbrTagger({text: str});
			str = str.replace(/<Zitat>(.+?)<\/Zitat>/g, (m, p1) => {
				let zitat = p1.replace(/<Abkuerzung Expansion=".+?">(.+?)<\/Abkuerzung>/g, (m, p1) => p1);
				zitat = zitat.replace(/<Autorenzusatz>(.+?)<\/Autorenzusatz>/g, (m, p1) => {
					return `<Autorenzusatz>${helferXml.abbrTagger({text: p1})}</Autorenzusatz>`;
				});
				return `<Zitat>${zitat}</Zitat>`;
			});
		}
		// in <URL> keine <Abkuerzung>
		str = str.replace(/<URL>(.+?)<\/URL>/g, (m, p1) => {
			p1 = p1.replace(/<Abkuerzung Expansion=".+?">(.+?)<\/Abkuerzung>/g, (m, p1) => p1);
			return `<URL>${p1}</URL>`;
		});
		// Ergebnis zurückgeben
		return str;
		// <Autorenzusatz> in <Zitat>
		function azInZitat (str) {
			str = str.replace(/\[(.+?)\]/g, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
			// falls jemand auf die Idee kommen sollte, auch das hier
			str = str.replace(/\{(.+?)\}/g, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
			return str;
		}
		// <Verweis_extern>
		function verweisExtern (m, p1, p2, p3, p4, p5) {
			let verweis = `<Verweis_extern>`;
			verweis += `\n  <Verweistext>${p1.trim()}</Verweistext>`;
			verweis += `\n  <Verweisziel/>`;
			verweis += `\n  <Fundstelle>`;
			verweis += `\n    <URL>${p2}</URL>`;
			if (p3) {
				verweis += `\n    <Aufrufdatum>${p3.length === 1 ? "0" + p3 : p3}.${p4.length === 1 ? "0" + p4 : p4}.${p5}</Aufrufdatum>`;
			}
			const fundort = helferXml.fundort({url: p2});
			verweis += `\n    <Fundort>${fundort}</Fundort>`;
			verweis += `\n  </Fundstelle>`;
			verweis += `\n</Verweis_extern>`;
			return verweis;
		}
		// typische und untypische Formen des Nachklapps einer Literaturangabe erkennen
		//   p2 = String
		//     (ermittelter Nachklapp einer Literaturangabe)
		function p2Typisch (p2) {
			if (/^(,\shier|\ss\.\sv\.)/.test(p2)) {
				return true;
			} else if (!p2 ||
					/^(\s|,|\s[-–])$/.test(p2) ||
					/^,\s/.test(p2) && !/[0-9]/.test(p2) ||
					/[0-9]/.test(p2) && !/,/.test(p2)) {
				return false;
			}
			return true;
		}
	},
	// Kopf-Element bewegen
	//   dir = String
	//     (Bewegungsrichtung, "up" | "down")
	//   kopf = Element
	//     (der Kopf, der bewegt werden soll)
	async move ({dir, kopf}) {
		// Variablen vorbereiten
		let key = kopf.dataset.key,
			refreshKey = key,
			slot = parseInt(kopf.dataset.slot, 10),
			slotOri = slot,
			slotNeu = -1,
			arr = [],
			slotKlon;
		switch (key) {
			case "re":
				refreshKey = "md";
				break;
			case "nw":
				refreshKey = "bg-nw";
				break;
		}
		let koepfe = document.querySelectorAll(`#${refreshKey} > .kopf`);
		// Datensatz ermitteln und klonen
		if (key === "re") {
			arr = xml.data.xl.md.re;
			slotKlon = {...arr[slot]};
		} else if (key === "nw") {
			arr = xml.data.xl.bg[xml.bgAkt].nw;
			slotKlon = arr[slot];
		} else {
			arr = xml.data.xl[key];
			slotKlon = {...arr[slot]};
			if (key === "le") {
				slotKlon.le = [...arr[slot].le];
			}
		}
		// spezieller Verschiebeblocker für Wortinformationen
		let wiBlock = {
			up: false,
			down: false,
		};
		if (key === "wi") {
			const vt = xml.data.xl.wi[slot].vt;
			if (slot > 0 &&
					xml.data.xl.wi[slot - 1].vt !== vt) {
				wiBlock.up = true;
			}
			if (slot < xml.data.xl.wi.length - 1 &&
					xml.data.xl.wi[slot + 1].vt !== vt) {
				wiBlock.down = true;
			}
		}
		// Variablen ermitteln
		if (dir === "up" &&
				slot > 0 &&
				!wiBlock.up) {
			slotNeu = slot - 1;
			slot++;
		} else if (dir === "down" &&
				slot  < arr.length - 1 &&
				!wiBlock.down) {
			slotNeu = slot + 2;
		}
		// Verschieben nicht möglich/nötig
		if (slotNeu === -1) {
			return;
		}
		// ggf. Vorschau schließen
		let pre = kopf.nextSibling;
		if (pre?.classList.contains("pre-cont")) { // jshint ignore:line
			let ta = pre.querySelector("textarea");
			if (ta && ta.dataset.geaendert) {
				// XML wurde bearbeitet => Speichern?
				const antwort = await xml.editFrage({
					pre,
					fun: () => {},
				});
				if (antwort) {
					pre.querySelector(`[value="Speichern"]`).dispatchEvent(new Event("click"));
					slotKlon.xl = xml.data.xl[key][slotOri].xl;
				} else if (antwort === false) {
					delete ta.dataset.geaendert;
					ta.value = slotKlon.xl;
					pre.querySelector(`[value="Abbrechen"]`).dispatchEvent(new Event("click"));
				} else if (antwort === null) {
					ta.setSelectionRange(0, 0);
					ta.focus();
					return;
				}
				// bei der Aktion wird der Kopf geändert => Kopf neu ermitteln
				// (ein bisschen warten, sonst steht der neue Kopf außerhalb nicht zur Verfügung)
				await new Promise(warten => setTimeout(() => warten(true), 25));
				kopf = document.querySelector(`#${key} > .kopf[data-slot="${slotOri}"]`);
			}
			await xml.elementPreviewOff({pre: kopf.nextSibling});
		}
		// Verschieben auf Datenebene
		arr.splice(slotNeu, 0, slotKlon);
		arr.splice(slot, 1);
		xml.speichern();
		// Verschieben auf Elementebene
		let klon = kopf.cloneNode(true);
		kopf.parentNode.insertBefore(klon, koepfe[slotNeu]);
		kopf.parentNode.removeChild(kopf);
		xml.refreshSlots({key: refreshKey});
		xml.elementKopfEvents({kopf: klon});
		// Konsequenzen
		if (key === "wi") {
			// Verweistypgrenze in Wortinformationen markieren
			xml.wiVerweistypGrenze();
		} else if (key === "nw") {
			// Reihenfolge der Nachweise im Bedeutungsgerüst auffrischen
			xml.bgNachweiseRefresh();
		}
	},
	// Slotangaben bestehender Elemente nach Änderungsoperationen auffrischen
	//   key = String
	//     (Schlüssel des Datensatzes, der betroffen ist)
	//   abschnitt = Element || null || undefined
	//     (Abschnitt dessen Köpfe betroffen sind; beim Löschen von Textblöcken)
	refreshSlots ({key, abschnitt = null}) {
		if (abschnitt) {
			let koepfe = abschnitt.querySelectorAll(".kopf");
			for (let i = 0, len = koepfe.length; i < len; i++) {
				koepfe[i].dataset.slotBlock = i;
				koepfe[i].nextSibling.querySelector(".pre-cont").dataset.slotBlock = i;
			}
		} else if (/^(ab|tx)$/.test(key)) {
			let koepfe = document.querySelectorAll(`#${key} > .kopf`);
			for (let i = 0, len = koepfe.length; i < len; i++) {
				koepfe[i].dataset.slot = i;
				let subKoepfe = koepfe[i].nextSibling.querySelectorAll(".kopf");
				for (let kopf of subKoepfe) {
					kopf.dataset.slot = i;
					kopf.nextSibling.querySelector(".pre-cont").dataset.slot = i;
				}
			}
		} else if (key === "bl") {
			document.querySelectorAll("#bl .pre-cont").forEach(div => {
				const id = div.previousSibling.dataset.id;
				div.dataset.slot = xml.data.xl.bl.findIndex(i => i.id === id);
			});
		} else if (/^(md|le|wi|bg-nw)$/.test(key)) {
			// Slots in Köpfen ganz primitiv durchzählen
			document.querySelectorAll(`#${key} > .kopf`).forEach((i, n) => i.dataset.slot = n);
		}
	},
	// überprüft ein XML-Snippet darauf, ob es wohlgeformt ist
	//   warn = Element
	//     (das Warn-Icon, das angepasst werden muss)
	//   xmlStr = String
	//     (XML-Snippet, das überprüft werden soll)
	check ({warn, xmlStr}) {
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xmlStr, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			warn.classList.add("aktiv");
			const err = xmlDoc.querySelector("parsererror div").textContent;
			warn.dataset.err = err;
			warn.title = `Parser-Fehler: ${err}`;
		} else {
			warn.classList.remove("aktiv");
			if (warn.dataset) {
				delete warn.dataset.err;
			}
			warn.title = "keine Fehler";
		}
	},
	// übprüft, ob in einem Abschnitt noch Fehler sind
	//   cont = Element || null
	//     (ggf. der .abschnitt-cont)
	checkAbschnitt ({cont}) {
		if (!cont || !cont.classList.contains("abschnitt-cont")) {
			return;
		}
		let warn = cont.previousSibling.querySelector(".warn");
		if (cont.querySelector(".warn.aktiv")) {
			warn.classList.add("aktiv");
			warn.dataset.err = "Fehler in einem untergeordneten Textblock";
			warn.title = "Parser-Fehler: Fehler in einem untergeordneten Textblock";
		} else {
			warn.classList.remove("aktiv");
			if (warn.dataset) {
				delete warn.dataset.err;
			}
			warn.title = "keine Fehler";
		}
	},
	// Breite von Elementen anpassen, sodass Kopfzeilen wie eine Tabelle wirken
	//   id = String
	//     (ID des Containers, in dem die Elemente sind)
	//   ele = Array
	//     (in jedem Slot steht eine Nummer, die für das Element steht, dessen Breite
	//     angepasst werden soll)
	//   inAbschnitt Element || null || undefined
	//     (Abschnitt in dem die Köpfe sind)
	//   warten = Number || undefined
	//     (Millisekunden, die vor dem Berechnen der Maximalbreite gewartet werden
	//     soll; beim Initialisieren muss dies deutlich länger sein)
	async layoutTabellig ({id, ele, inAbschnitt = null, warten = 15}) {
		let koepfe;
		if (inAbschnitt) {
			koepfe = inAbschnitt.querySelectorAll(`.kopf`);
		} else {
			koepfe = document.querySelectorAll(`#${id} > .kopf`);
		}
		// Breitenangaben entfernen
		for (let k of koepfe) {
			for (let e of ele) {
				k.childNodes[e].style = null;
			}
		}
		// kurz warten, um dem Renderer Zeit zum Neuaufbau zu geben
		await new Promise(resolve => setTimeout(() => resolve(true), warten));
		// größte Breite ermitteln und für alle Köpfe setzen
		for (let e of ele) {
			let max = 0;
			for (let k of koepfe) {
				const breite = k.childNodes[e].offsetWidth;
				if (breite > max) {
					max = breite;
				}
			}
			max = Math.ceil(max);
			for (let k of koepfe) {
				k.childNodes[e].style.width = `${max + 1}px`; // +1, sonst ist die Textellipse immer sichtbar
			}
		}
	},
	// extrahiert die Lemmata aus dem Karteiwort
	lemmata () {
		let arr = [],
			lemmata = xml.data.wort.replace(/\s?\(.+?\)/g, "").split(",");
		for (let i = 0, len = lemmata.length; i < len; i++) {
			const lemma = helfer.textTrim(lemmata[i], true);
			if (lemma) {
				arr.push(lemma);
			}
		}
		arr.sort(helfer.sortAlpha);
		return arr;
	},
	// trägt mögliche Typen in Formularen zusammen und formatiert sie schön
	//   key = String
	//     (Name des Typs);
	typen ({key}) {
		let typen = [...xml.dropdown[key]];
		typen.forEach((i, n) => typen[n] = `„${i}“`);
		const text = typen.join(", ");
		return text.replace(/(.+), (.+)/, (m, p1, p2) => {
			return `${p1} und ${p2}`;
		});
	},
	// Änderungen in der Kartei speichern
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(xml.data.contentsId, "red-xml-speichern", xml.data.xl);
	},
};
