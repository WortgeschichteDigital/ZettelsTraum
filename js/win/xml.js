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
	// Typen-Mapping für die Wortinformationen
	wiMap: {
		export: {
			Kollokation: "Kollokationen",
			Wortbildung: "Wortbildungen",
			Wortfeld: "Wortfeld",
			Wortfeldartikel: "Wortfeldartikel",
		},
		import: {
			Kollokationen: "Kollokation",
			Wortbildungen: "Wortbildung",
			Wortfeld: "Wortfeld",
			Wortfeldartikel: "Wortfeldartikel",
		},
	},
	// Dropdown: Auswahlmöglichkeiten für Dropdown-Felder
	dropdown: {
		artikelTypen: ["Vollartikel", "Wortfeldartikel"],
		lemmaTypen: ["Hauptlemma", "Nebenlemma"],
		abschnittTypen: ["Mehr erfahren"],
		abschnittBloecke: ["Überschrift", "Textblock", "Blockzitat", "Liste", "Illustration"],
		listenTypen: ["Punkte", "Ziffern"],
		abbPositionen: ["Block", "links", "rechts"],
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
		xml.belegeZaehlen();
		// Init: Bedeutungsgerüst (Nachweise, Textreferenzen, XML)
		xml.bgReset();
		// Init: Wortinformationen
		xml.wiMake();
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
		await xml.resetFormular();
		xml.init();
	},
	// Formulardaten zurücksetzen
	resetFormular () {
		return new Promise(async resolve => {
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
			resolve(true);
		});
	},
	// Metadaten: ID
	mdIdMake () {
		// ID erstellen
		let id = document.getElementById("md-id"),
			lemmata = xml.lemmata();
		for (let i = 0, len = lemmata.length; i < len; i++) {
			lemmata[i] = lemmata[i].replace(/\s/g, "_");
		}
		let wortfeld = "";
		if (/Wortfeld/.test(xml.data.wort) ||
				xml.data.xl.md.ty === "Wortfeldartikel") {
			wortfeld = "Wortfeldartikel_";
		}
		id.value = `WGd-${wortfeld}${lemmata.join("-")}-1`;
		// Datensatz speichern
		xml.data.xl.md.id = id.value;
		xml.speichern();
	},
	// Metadaten/Revision: neue Revision erstellen
	mdRevisionAdd () {
		let au = document.getElementById("md-re-au"),
			da = document.getElementById("md-re-da"),
			no = document.getElementById("md-re-no"),
			auVal = au.value ? au.value.split(/\//) : [],
			daVal = da.value,
			noVal = helfer.typographie(helfer.textTrim(no.value, true));
		for (let i = 0, len = auVal.length; i < len; i++) {
			auVal[i] = helfer.textTrim(auVal[i], true);
		}
		// Überprüfungen
		if (!auVal.length) {
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
		for (let i of auVal) {
			xmlStr += `<Autor>${i}</Autor>`;
		}
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
				let id = helferXml.normId({id: val});
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
			tyVal = ty.value,
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
		if (tyVal === "Nebenlemma" && !reVal) {
			dialog.oeffnen({
				typ: "alert",
				text: "Nebenlemmata müssen immer an eine bestimmte Textposition gebunden werden.\nTextpositionen werden über IDs identifiziert.",
				callback: () => re.select(),
			});
			return;
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
			} else {
				xml.belegeZaehlen();
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
			xml.bgAktGn = xmlDatensatz.ds.gn;
			xml.wiMake();
			xml.bgNwTyReset();
			xml.bgMakeXML();
			xml.bgNwTfMake({key: "nw"});
			xml.bgNwTfMake({key: "tf"});
			xml.bgSelSet();
		} else if (xmlDatensatz.key === "wi") {
			xml.data.xl.wi[xmlDatensatz.gn] = xmlDatensatz.ds;
			if (xml.bgAkt > -1 && xmlDatensatz.gn === xml.bgAktGn ||
					xml.bgAkt === -1) {
				xml.bgAktGn = xml.bgAktGn || xmlDatensatz.gn;
				xml.wiMake();
			}
		} else if (xmlDatensatz.key === "wi-single") {
			/* jshint ignore:start */
			if (!xml.data.xl.wi?.[xml.bgAktGn]?.length) {
				xml.bgAktGn = xml.bgAktGn || xmlDatensatz.gn;
				xml.data.xl.wi[xml.bgAktGn] = [xmlDatensatz.ds];
				xml.wiMake();
			} else {
				let slot = xml.data.xl.wi[xml.bgAktGn].findIndex(i => i.tx === xmlDatensatz.ds.tx),
					koepfe = document.querySelectorAll("#wi > .kopf");
				if (slot > -1 &&
						xml.data.xl.wi[xml.bgAktGn][slot].vt !== xmlDatensatz.ds.vt) { // Verweistyp geändert
					xml.data.xl.wi[xml.bgAktGn].splice(slot, 1);
					xml.data.xl.wi[xml.bgAktGn].push(xmlDatensatz.ds);
					xml.data.xl.wi[xml.bgAktGn].sort(helfer.sortWi);
					xml.wiMake();
				} else if (slot > -1) { // Datensatz ersetzen
					xml.data.xl.wi[xml.bgAktGn][slot] = xmlDatensatz.ds;
					// ggf. Preview schließen
					let pre = koepfe[slot].nextSibling;
					if (pre?.classList.contains("pre-cont")) {
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
					// Layout der Köpfe anpassen
					xml.layoutTabellig({
						id: "wi",
						ele: [3, 4],
					});
				} else { // Datensatz einhängen
					xml.data.xl.wi[xml.bgAktGn].push(xmlDatensatz.ds);
					// Wortinformationen sortieren
					xml.data.xl.wi[xml.bgAktGn].sort(helfer.sortWi);
					// Kopf ersetzen
					const slot = xml.data.xl.wi[xml.bgAktGn].findIndex(i => i.tx === xmlDatensatz.ds.tx);
					let kopf = xml.elementKopf({
						key: "wi",
						slot,
					});
					if (slot === xml.data.xl.wi[xml.bgAktGn].length - 1) {
						document.getElementById("wi").appendChild(kopf);
					} else {
						koepfe[slot].parentNode.insertBefore(kopf, koepfe[slot]);
					}
					// Slots auffrischen und Verweistypgrenze neu markieren
					xml.refreshSlots({key: "wi"});
					xml.wiVerweistypGrenze();
					// Layout der Köpfe anpassen
					xml.layoutTabellig({
						id: "wi",
						ele: [3, 4],
					});
				}
			}
			/* jshint ignore:end */
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
		// Belege zählen
		xml.belegeZaehlen();
	},
	// Wortinformationen: alle Wörter aufbauen
	wiMake () {
		// alle Köpfe entfernen
		let wi = document.getElementById("wi");
		helfer.keineKinder(wi);
		// keine Daten zum aktuellen Gerüst => Leermeldung
		let keys = Object.keys(xml.data.xl.wi);
		if (!keys.length || !xml.data.xl.wi?.[xml.bgAktGn]?.length) { // jshint ignore:line
			xml.elementLeer({ele: wi});
			return;
		}
		// alle Köpfe aufbauen
		for (let i = 0, len = xml.data.xl.wi[xml.bgAktGn].length; i < len; i++) {
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
	// Bedeutungsgerüst: speichert die ID des aktuellen Bedeutungsgerüsts oder
	// die ID der aktuellen Wortinformationen, falls kein Bedeutungsgerüst vorhanden
	// (wird nur für die Wortinformationen genutzt)
	bgAktGn: "",
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
		let tyVal = ty.value;
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
			xml.bgAktGn = xml.data.xl.bg[0].gn;
			xml.bgMakeXML();
		} else {
			xml.bgAkt = -1;
			xml.bgAktGn = Object.keys(xml.data.xl.wi)[0] || "";
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
			xml.bgAktGn = reg.groups.gn;
			// Update des anderen Input-Feldes
			xml.bgSelSet();
			// Update Wortinformationen
			xml.wiMake();
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
			} else if (key === "wi") {
				xmlStr = xml.data.xl.wi[xml.bgAktGn][slot].xl;
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
			idText = xml.data.xl.md.re[slot].au.join("/");
		} else if (key === "le") {
			idText = xml.data.xl[key][slot].le.join("/");
		} else if (key === "wi") {
			idText = xml.data.xl.wi[xml.bgAktGn][slot].vt;
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
				hinweis.textContent = typ ? typ : " ";
			} else if (key === "bl") {
				hinweis.textContent = xml.data.xl.bl[slot].da;
			} else if (key === "lt") {
				hinweis.textContent = xml.data.xl.lt[slot].si;
			} else if (key === "wi") {
				hinweis.textContent = xml.data.xl.wi[xml.bgAktGn][slot].tx;
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
				} else if (xml.data.xl[key][slot].ct[slotBlock].it === "Illustration") {
					let ziel = xmlStr.match(/<Bildreferenz Ziel="(.*?)"\/>/);
					xmlStr = ziel ? ziel[1] : " ";
				}
				text = xmlStr.replace(/<.+?>/g, "");
				if (/^(Blockzitat|Illustration|Liste)$/.test(xml.data.xl[key][slot].ct[slotBlock].it)) {
					let b = document.createElement("b");
					vorschau.appendChild(b);
					// blöder Hack mit den beiden Leerzeichen; Problem ist, dass der Container
					// display: inline bleiben muss, damit die Textellipse schön funktioniert
					// darum hier lieber kein display: block + margin.
					b.textContent = `${xml.data.xl[key][slot].ct[slotBlock].it}  `;
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
					text: unstrukturiert[1].replace(/<.+?>/g, ""),
					demaskieren: true,
				});
			} else if (key === "wi") {
				text = xml.data.xl.wi[xml.bgAktGn][slot].lt;
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
			// ein- oder ausrücken
			else if (a.classList.contains("icon-pfeil-gerade-links") ||
					a.classList.contains("icon-pfeil-gerade-rechts")) {
				a.addEventListener("click", function(evt) {
					evt.preventDefault();
					evt.stopPropagation();
					if (evt.detail > 1) { // Doppelklicks abfangen
						return;
					}
					xml.indent({
						dir: this.classList.contains("icon-pfeil-gerade-links") ? "left" : "right",
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
			} else if (key === "wi") {
				xmlStr = xml.data.xl.wi[xml.bgAktGn][slot].xl;
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
			} else if (key === "wi") {
				xml.data.xl.wi[xml.bgAktGn].splice(slot, 1);
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
						key === "wi" && xml.data.xl.wi?.[xml.bgAktGn]?.length) { // jshint ignore:line
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
				} else if (key === "wi" && !xml.data.xl.wi?.[xml.bgAktGn]?.length) { // jshint ignore:line
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
				xml.wiMake();
			} else if (!xml.data.xl[key].length) {
				xml.elementLeer({
					ele: document.getElementById(key),
				});
				if (key === "bl") {
					xml.belegeZaehlen();
				}
			} else {
				if (key === "lt") {
					xml.bgNwTfMake({key: "nw"});
				} else if (key === "bl") {
					xml.belegeZaehlen();
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
		cont.appendChild(div);
		div.classList.add("abschnitt-cont", `level-${xml.data.xl[key][slot].le}`);
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
		// Abschnitttyp-Feld
		let typ = document.createElement("input");
		p.appendChild(typ);
		typ.classList.add("dropdown-feld");
		typ.id = `abschnitt-${xml.counter.next().value}-ty`;
		typ.placeholder = "Abschnitt-Typ";
		typ.type = "text";
		typ.value = xml.data.xl[key][slot].ty;
		let aTyp = dropdown.makeLink("dropdown-link-element", "Abschnitt-Typ auswählen", true);
		p.appendChild(aTyp);
		// Blocktyp-Feld
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
		// Events anhängen
		xml.abtxEvents({cont: div, make: true});
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
	//   loeschen = true | undefined
	//     (die ID soll gelöscht werden)
	abschnittSetId ({key, slot, slotBlock, loeschen = false}) {
		// ID ermitteln und normieren
		let id = "",
			xl = xml.data.xl[key][slot].ct[slotBlock]?.xl; // jshint ignore:line
		if (xl && !loeschen) { // nach dem Löschen einer Überschrift übergehen
			id = xl.replace(/<Anmerkung>.+?<\/Anmerkung>/s, "");
			id = id.replace(/<.+?>/g, "");
			id = helfer.textTrim(id, true);
			id = helferXml.normId({id});
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
	// Textblock: neuen Datensatz für einen Textblock anlegen
	//   input = Element
	//     (das Textfeld mit dem Textblocktyp)
	textblockAdd ({input}) {
		const typ = input.value;
		// Textfeld zurücksetzen
		input.value = "Textblock";
		// Key und Slot ermitteln
		let cont = input.closest(".abschnitt-cont"),
			kopf = cont.previousSibling;
		const key = kopf.dataset.key,
			slot = parseInt(kopf.dataset.slot, 10);
		// Schon eine Überschrift vorhanden?
		if (typ === "Überschrift") {
			if (xml.data.xl[key][slot].ct.some(i => i.it === "Überschrift")) {
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
		} else if (typ === "Liste") {
			data.ty = xml.dropdown.listenTypen[0];
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
		// Daten speichern
		// (erst hier, weil im Zuge von textblockMake()
		// Illustrationsdaten erzeugt werden könnten)
		xml.speichern();
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
		// Formulare
		let editable = true;
		if (/^(Textblock|Liste)$/.test(xml.data.xl[key][slot].ct[slotBlock].it)) {
			let p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("input-text");
			if (xml.data.xl[key][slot].ct[slotBlock].it === "Textblock") {
				// ID-Feld
				let id = document.createElement("input");
				p.appendChild(id);
				id.id = `textblock-${xml.counter.next().value}-id`;
				id.placeholder = "Textblock-ID";
				id.type = "text";
				id.value = xml.data.xl[key][slot].ct[slotBlock].id;
			} else {
				// Typ-Feld
				p.classList.add("dropdown-cont");
				let typ = document.createElement("input");
				p.appendChild(typ);
				typ.classList.add("dropdown-feld");
				typ.id = `textblock-${xml.counter.next().value}-ty`;
				typ.title = "Listen-Typ auswählen";
				typ.type = "text";
				typ.value = xml.data.xl[key][slot].ct[slotBlock].ty;
				typ.setAttribute("readonly", "true");
				let a = dropdown.makeLink("dropdown-link-element", "Listen-Typ auswählen", true);
				p.appendChild(a);
			}
		} else if (xml.data.xl[key][slot].ct[slotBlock].it === "Illustration") {
			editable = false;
			// Datenfelder für Abbildungen
			let felder = {
				Dateiname: {
					p: true,
					cl: "abb-2-felder",
					val: "",
					date: false,
					dropdown: false,
				},
				Bildposition: {
					p: false,
					cl: "",
					val: "links",
					date: false,
					dropdown: true,
				},
				Breite: {
					p: true,
					cl: "abb-2-felder",
					val: "",
					date: false,
					dropdown: false,
				},
				Höhe: {
					p: false,
					cl: "",
					val: "",
					date: false,
					dropdown: false,
				},
				Bildunterschrift: {
					p: true,
					cl: "",
					val: "",
					date: false,
					dropdown: false,
				},
				Alternativtext: {
					p: true,
					cl: "",
					val: "",
					date: false,
					dropdown: false,
				},
				Lizenzname: {
					p: true,
					cl: "abb-2-felder",
					val: "",
					date: false,
					dropdown: false,
				},
				"Lizenz-URL": {
					p: false,
					cl: "",
					val: "",
					date: false,
					dropdown: false,
				},
				Quelle: {
					p: true,
					cl: "",
					val: "",
					date: false,
					dropdown: false,
				},
				Aufrufdatum: {
					p: true,
					cl: "abb-2-felder",
					val: "",
					date: true,
					dropdown: false,
				},
				"Quellen-URL": {
					p: false,
					cl: "",
					val: "",
					dropdown: false,
				},
			};
			// Formular erzeugen
			let abb = document.createElement("div");
			div.appendChild(abb);
			abb.classList.add("abb");
			for (let [k, v] of Object.entries(felder)) {
				if (v.p) {
					let p = document.createElement("p");
					abb.appendChild(p);
					p.classList.add("input-text");
					if (v.cl) {
						p.classList.add(v.cl);
					}
				}
				let input = document.createElement("input");
				abb.lastChild.appendChild(input);
				input.id = `abb-${xml.counter.next().value}-${k.toLowerCase()}`;
				if (v.date) {
					input.title = k;
					input.type = "date";
					input.value = new Date().toISOString().split("T")[0];
					input.setAttribute("required", "true");
				} else {
					input.placeholder = k;
					input.type = "text";
					input.value = v.val;
				}
				if (v.dropdown) {
					abb.lastChild.classList.add("dropdown-cont");
					input.classList.add("dropdown-feld");
					input.title = `${k} auswählen`;
					input.setAttribute("readonly", "true");
					let a = dropdown.makeLink("dropdown-link-element", `${k} auswählen`, true);
					abb.lastChild.appendChild(a);
				}
			}
			// Formulardaten wiederherstellen
			if (restore) {
				let xmlStr = xml.data.xl[key][slot].ct[slotBlock].xl,
					parser = new DOMParser(),
					xmlDoc = parser.parseFromString(xmlStr, "text/xml");
				let felder = {
					/* jshint ignore:start */
					dateiname: xmlDoc.querySelector("Bildreferenz").getAttribute("Ziel"),
					bildposition: xmlDoc.documentElement.getAttribute("Position"),
					breite: xmlDoc.documentElement.getAttribute("Breite"),
					höhe: xmlDoc.documentElement.getAttribute("Hoehe"),
					bildunterschrift: xmlDoc.querySelector("Bildunterschrift").textContent,
					alternativtext: xmlDoc.querySelector("Bildinhalt").textContent,
					quelle: xmlDoc.querySelector("Fundstelle unstrukturiert").textContent,
					aufrufdatum: xmlDoc.querySelector("Fundstelle Aufrufdatum")?.textContent,
					"quellen-url": xmlDoc.querySelector("Fundstelle URL")?.textContent,
					lizenzname: xmlDoc.querySelector("Lizenz Name").textContent,
					"lizenz-url": xmlDoc.querySelector("Lizenz URL").textContent,
					/* jshint ignore:end */
				};
				for (let [k, v] of Object.entries(felder)) {
					if (v) {
						if (k === "aufrufdatum") {
							let datum = v.split(".");
							v = `${datum[2]}-${datum[1]}-${datum[0]}`;
						}
						abb.querySelector(`[id$="${k}"]`).value = v;
					}
				}
			} else {
				abb.querySelector("input").focus();
			}
			// XML-Preview aus Formulardaten erzeugen
			// (erzeugt zugleich das XML-Snippet, wenn es noch nicht existiert;
			// führt außerdem eine Evaluation durch)
			xml.textblockAbbXml({form: abb});
			// XML auf Fehler überprüfen
			xml.check({
				warn: kopf.querySelector(".warn"),
				xmlStr: xml.data.xl[key][slot].ct[slotBlock].xl,
			});
		}
		// Abschnitt auf Fehler überprüfen
		xml.checkAbschnitt({
			cont: element.closest(".abschnitt-cont"),
		});
		// Textfeld erzeugen
		xml.preview({
			xmlStr: xml.data.xl[key][slot].ct[slotBlock].xl,
			key,
			slot,
			slotBlock,
			after: div.firstChild,
			textblockCont: div,
			animation: false,
			editable,
		});
		if (!restore && editable) {
			xml.edit({
				cont: div.lastChild,
			});
		}
		// Events anhängen
		xml.abtxEvents({cont: div, make: true});
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
		if (xml.data.xl[key][slot].ct[slotBlock].ty) {
			attr.push(`Typ="${xml.data.xl[key][slot].ct[slotBlock].ty}"`);
		}
		// XML-String anpassen
		const rootEle = xml.data.xl[key][slot].ct[slotBlock].it.replace(/^Ü/, "Ue"),
			rootEleStart = `<${rootEle}${attr.length ? " " + attr.join(" ") : ""}>`;
		if (!new RegExp(`^<${rootEle}`).test(xmlStr)) {
			if (xml.data.xl[key][slot].ct[slotBlock].it === "Liste") {
				let listenpunkte = [];
				xmlStr.split(/\n/).forEach(i => {
					i = helfer.textTrim(i, true);
					if (!i) {
						return;
					}
					listenpunkte.push(`  <Listenpunkt>${i}</Listenpunkt>`);
				});
				xmlStr = "\n" + listenpunkte.join("\n") + "\n";
			}
			xmlStr = `${rootEleStart}${xmlStr}</${rootEle}>`;
		} else {
			xmlStr = xmlStr.replace(/^<.+?>/, rootEleStart);
		}
		// Ergebnis auswerfen
		return xmlStr;
	},
	// Textblock: XML einer Illustration erzeugen, Eingabe im Formular evaluieren
	//   form = Element
	//     (Container des Illustrationsformulars)
	textblockAbbXml ({form}) {
		let kopf = form.closest(".textblock-cont").previousSibling,
			key = kopf.dataset.key,
			slot = parseInt(kopf.dataset.slot, 10),
			slotBlock = parseInt(kopf.dataset.slotBlock, 10),
			abbNr = xml.textblockAbbSetId({key, slot, slotBlock}) + 1;
		// XML erzeugen
		let xl = `<Illustration xml:id="abb-${abbNr}" Position="${form.querySelector(`[id$="bildposition"]`).value}"`
		let breite = form.querySelector(`[id$="breite"]`).value,
			hoehe = form.querySelector(`[id$="höhe"]`).value;
		if (breite) {
			xl += ` Breite="${breite}"`
		}
		if (hoehe) {
			xl += ` Hoehe="${hoehe}"`
		}
		xl += `>\n`;
		let dn = form.querySelector(`[id$="dateiname"]`);
		xl += `\t<Bildreferenz Ziel="${mask(dn.value)}"/>\n`;
		let bu = form.querySelector(`[id$="bildunterschrift"]`);
		bu.value = helfer.typographie(helfer.textTrim(bu.value, true));
		xl += `\t<Bildunterschrift>${mask(bu.value)}</Bildunterschrift>\n`;
		let at = form.querySelector(`[id$="alternativtext"]`);
		at.value = helfer.typographie(helfer.textTrim(at.value, true));
		xl += `\t<Bildinhalt>${mask(at.value)}</Bildinhalt>\n`;
		xl += `\t<Fundstelle>\n`;
		let qu = form.querySelector(`[id$="quelle"]`);
		qu.value = helfer.typographie(helfer.textTrim(qu.value, true));
		xl += `\t\t<unstrukturiert>${mask(qu.value)}</unstrukturiert>\n`;
		let ul = form.querySelector(`[id$="quellen-url"]`);
		if (ul.value) {
			xl += `\t\t<URL>${mask(ul.value)}</URL>\n`;
			let ad = form.querySelector(`[id$="aufrufdatum"]`);
			if (!ad.value) {
				ad.value = new Date().toISOString().split("T")[0];
			}
			let datum = ad.value.split("-");
			xl += `\t\t<Aufrufdatum>${datum[2]}.${datum[1]}.${datum[0]}</Aufrufdatum>\n`;
			xl += `\t\t<Fundort>${helferXml.fundort({url: ul.value})}</Fundort>\n`;
		}
		xl += `\t</Fundstelle>\n`;
		xl += `\t<Lizenz>\n`;
		xl += `\t\t<Name>${mask(form.querySelector(`[id$="lizenzname"]`).value)}</Name>\n`;
		let lul = form.querySelector(`[id$="lizenz-url"]`);
		xl += `\t\t<URL>${mask(lul.value)}</URL>\n`;
		xl += `\t</Lizenz>\n`;
		xl += "</Illustration>";
		xl = xl.replace(/\t/g, " ".repeat(2));
		// Evaluation
		form.querySelectorAll(".fehler").forEach(i => i.classList.remove("fehler"));
		if (!dn.value || !/\.(gif|jpeg|jpg|png|svg)$/.test(dn.value) || /\s/.test(dn.value)) {
			dn.classList.add("fehler");
		}
		if (!bu.value) {
			bu.classList.add("fehler");
		}
		if (!at.value) {
			at.classList.add("fehler");
		}
		if (!qu.value) {
			qu.classList.add("fehler");
		}
		if (ul.value && ( !/^https?:\/\//.test(ul.value) || /\s/.test(ul.value) )) {
			ul.classList.add("fehler");
		}
		if (lul.value && ( !/^https?:\/\//.test(lul.value) || /\s/.test(lul.value) )) {
			lul.classList.add("fehler");
		}
		// XML eintragen
		xml.data.xl[key][slot].ct[slotBlock].xl = xl;
		// IDs der Abbildungen auffrischen
		xml.textblockAbbSetId({});
		// Ampersand maskieren
		function mask (text) {
			return text.replace(/&(?!amp;)/g, "&amp;");
		}
	},
	// Textblock: IDs der Abbildungen auffrischen
	textblockAbbSetId ({key = "", slot = -1, slotBlock = -1}) {
		let nr = 0;
		for (let k of ["ab", "tx"]) {
			for (let i = 0, len = xml.data.xl[k].length; i < len; i++) {
				for (let j = 0, len = xml.data.xl[k][i].ct.length; j < len; j++) {
					if (xml.data.xl[k][i].ct[j].it === "Illustration") {
						if (k === key && i === slot && j >= slotBlock) {
							// wenn key !== "" soll nur die Abbildungsnummer ermittelt werden
							return nr;
						}
						nr++;
						if (!key) {
							xml.data.xl[k][i].ct[j].xl = xml.data.xl[k][i].ct[j].xl.replace(/xml:id="abb-[0-9]+"/, `xml:id="abb-${nr}"`);
							// .pre-cont auffrischen
							// (existiert das <pre> nicht, ist der Block gerade in Bearbeitung)
							let pre = document.querySelector(`.pre-cont[data-key="${k}"][data-slot="${i}"][data-slot-block="${j}"] pre`);
							if (pre) {
								xml.abtxRefreshPre({cont: pre.parentNode, xmlStr: xml.data.xl[k][i].ct[j].xl, editable: false});
							}
						}
					}
				}
			}
		}
	},
	// Abschnitt/Textblock: Events an Element im Container anhängen
	//   cont = Element
	//     (.abschnitt-cont | .textblock-cont)
	//   make = true | undefined
	//     (Events werden beim Erzeugen des Elements angehängt)
	abtxEvents ({cont, make = false}) {
		// Input-Felder
		cont.querySelectorAll("input").forEach(i => {
			// Abschnitt: ID-Feld | Abschnitttyp-Feld
			// Textblock: ID-Feld | Typ-Feld
			// Illustration: alle Input-Felder
			if (/^(abschnitt|textblock)-[0-9]+-(id|ty)$|^abb-/.test(i.id)) {
				xml.abtxChange({ele: i});
			}
			// Abschnitt: Blocktyp-Feld
			else if (/^textblock-add-/.test(i.id)) {
				i.addEventListener("keydown", function(evt) {
					tastatur.detectModifiers(evt);
					if (!tastatur.modifiers &&
							evt.key === "Enter" &&
							!document.getElementById("dropdown")) {
						setTimeout(() => { // ohne Timeout bekommt man direkt einen Zeilenumbruch im Textfeld
							xml.textblockAdd({input: this});
						}, 25);
					}
				});
			}
		});
		// Abschnitt: Add-Link
		/* jshint ignore:start */
		cont.querySelector(".icon-plus-dick")?.addEventListener("click", function(evt) {
			evt.preventDefault();
			let input = this.parentNode.querySelector("input");
			xml.textblockAdd({input});
		});
		/* jshint ignore:end */
		// Dropdown-Felder
		cont.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
		if (!make) {
			// Dropdown-Links
			cont.querySelectorAll(".dropdown-link-element").forEach(i => dropdown.link(i));
			// XML-Vorschau
			cont.querySelectorAll("pre").forEach(pre => {
				if (pre.classList.contains("not-editable")) {
					return;
				}
				xml.editPreDbl({pre});
				let next = pre.nextSibling;
				if (next) {
					next.firstChild.addEventListener("click", function() {
						xml.edit({
							cont: this.closest(".pre-cont"),
						});
					});
				}
			});
			// XML-Bearbeitung
			cont.querySelectorAll("textarea").forEach(ta => {
				xml.editTaEvents({ta});
				ta.closest(".pre-cont").querySelectorAll("p input").forEach(button => {
					xml.editSpeichern({button});
				});
			});
		}
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
				slotBlock = null,
				feld = this.id.replace(/.+-/, ""),
				val = helfer.textTrim(this.value, true);
			if (textblock) {
				kopf = textblock.previousSibling;
				slotBlock = parseInt(kopf.dataset.slotBlock, 10);
			}
			if (slotBlock !== null &&
					xml.data.xl[key][slot].ct[slotBlock].it === "Illustration") {
				// Illustration
				xml.textblockAbbXml({form: textblock});
				if (feld === "dateiname") {
					kopfNeu();
				}
				let cont = textblock.querySelector(".pre-cont");
				xml.abtxRefreshPre({cont, xmlStr: xml.data.xl[key][slot].ct[slotBlock].xl, editable: false, textblock});
				// Layout der Köpfe anpassen
				xml.layoutTabellig({
					id: key,
					ele: [3],
					inAbschnitt: abschnitt,
				});
			} else if (textblock) {
				// Textblöcke (Überschrift, Textblock, Blockzitat, Liste)
				if (feld === "id") {
					// ID aufbereiten
					val = helferXml.normId({id: val, input: this});
				}
				xml.data.xl[key][slot].ct[slotBlock][feld] = val;
				// Kopf anpassen
				if (feld === "id") {
					kopfNeu();
				}
				// XML-String auffrischen
				const xmlStr = xml.textblockXmlStr({xmlStr: null, key, slot, slotBlock});
				// Pre zurücksetzen
				// (aber nur, wenn er nicht gerade in Bearbeitung ist)
				let cont = textblock.querySelector(".pre-cont");
				if (cont.querySelector("pre")) {
					xml.abtxRefreshPre({cont, xmlStr, editable: true, textblock});
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
					val = helferXml.normId({id: val, input: this});
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
			// Kopf neu erstellen
			function kopfNeu () {
				let kopfNeu = xml.elementKopf({key, slot, slotBlock, textKopf: "textblock"});
				kopf.parentNode.replaceChild(kopfNeu, kopf);
				xml.checkAbschnitt({
					cont: abschnitt,
				});
			}
		});
	},
	// Abschnitt/Textblock: <pre> auffrischen
	//   cont = Element
	//     (Container mit dem <pre>)
	//   xmlStr = String
	//     (das XML)
	//   editable = Boolean
	//     (Preview ist editierbar)
	//   textblock = Element
	//     (Container eines Textblocks: .textblock-cont)
	abtxRefreshPre ({cont, xmlStr, editable, textblock = null}) {
		let pre = document.createElement("pre");
		cont.replaceChild(pre, cont.firstChild);
		xml.preview({
			xmlStr,
			after: cont.previousSibling,
			textblockCont: textblock,
		});
		if (editable) {
			xml.editPreDbl({pre});
		} else {
			pre.classList.add("not-editable");
		}
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
			const abb = xml.data.xl[key][slot].ct?.[slotBlock].it === "Illustration"; // jshint ignore:line
			if (slotBlock !== null) {
				if (xml.data.xl[key][slot].ct[slotBlock].it === "Überschrift") {
					// ID des Abschnitts löschen
					xml.abschnittSetId({key, slot, slotBlock, loeschen: true});
				}
				xml.data.xl[key][slot].ct.splice(slotBlock, 1);
			} else {
				xml.data.xl[key].splice(slot, 1);
				xml.refreshLevels({key, slot: slot - 1});
			}
			// Slot-Datasets anpassen
			xml.refreshSlots({key, abschnitt});
			// ggf. XML-ID der Abbildungen auffrischen
			if (abb) {
				xml.textblockAbbSetId({});
			}
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
		} else {
			pre.classList.add("not-editable");
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
		if (key === "wi") {
			ta.value = xml.data.xl.wi[xml.bgAktGn][slot].xl;
		} else if (key === "bg") {
			ta.value = xml.data.xl.bg[xml.bgAkt].xl;
		} else if (slotBlock !== null) {
			ta.value = xml.data.xl[key][slot].ct[slotBlock].xl;
		} else {
			ta.value = xml.data.xl[key][slot].xl;
		}
		// Element einhängen und fokussieren
		cont.replaceChild(div, cont.firstChild);
		helfer.textareaGrow(ta, 0);
		if (xml.editSelect0) {
			ta.setSelectionRange(0, 0); // an die oberste Position
			ta.focus();
		}
		// Events anhängen
		xml.editTaEvents({ta});
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
	// XML-Vorschau: Events für Textarea
	editTaEvents ({ta}) {
		ta.addEventListener("input", function() {
			this.dataset.geaendert = "true";
			helfer.textareaGrow(this, 0);
		});
		if (!ta.closest(".pre-cont").dataset.slotBlock) {
			return;
		}
		ta.addEventListener("paste", function() {
			// Zeitverzögerung, sonst ist das Feld noch leer
			// und es kann nichts ausgelesen werden
			setTimeout(() => {
				let val = this.value,
					cont = ta.closest(".pre-cont"),
					key = cont.dataset.key,
					slot = parseInt(cont.dataset.slot, 10),
					slotBlock = parseInt(cont.dataset.slotBlock, 10);
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
					let lt = xml.data.xl.wi[xml.bgAktGn][slot].lt;
					if (/^<Textreferenz/.test(xmlStr)) {
						lt = "Textverweis";
					} else if (/^<Verweis_extern>/.test(xmlStr)) {
						lt = "Verweis extern";
					} else if (/^<Verweis/.test(xmlStr)) {
						lt = "Verweis intern";
					}
					// Textreferenz neu auslesen
					let tx = xml.data.xl.wi[xml.bgAktGn][slot].tx,
						reg = /<Textreferenz Ziel=".+?">(?<tr>.+?)<\/Textreferenz>|<Verweistext>(?<vt>.+?)<\/Verweistext>|<Verweisziel>(?<vz>.+?)<\/Verweisziel>/.exec(xmlStr);
					if (reg?.groups.tr) { // jshint ignore:line
						tx = reg.groups.tr;
					} else if (reg?.groups.vt) { // jshint ignore:line
						tx = reg.groups.vt;
					} else if (reg?.groups.vz) { // jshint ignore:line
						tx = reg.groups.vz;
					}
					// Werte neu setzen
					xml.data.xl.wi[xml.bgAktGn][slot].lt = lt;
					xml.data.xl.wi[xml.bgAktGn][slot].tx = tx;
				}
				// Speichern
				if (key === "wi") {
					xml.data.xl.wi[xml.bgAktGn][slot].xl = xmlStr;
				} else if (key === "bg") {
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
				if (key === "wi") {
					return xml.data.xl.wi[xml.bgAktGn][slot].xl;
				} else if (key === "bg") {
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
		str = str.replace(/(?<![\p{Letter}\-.])_(.+?)_(?![\p{Letter}\-])/ug, (m, p1) => `<Stichwort>${p1}</Stichwort>`);
		// <Paraphrase>
		str = str.replace(/‚(.+?)‘/g, (m, p1) => `<Paraphrase>${p1}</Paraphrase>`); // deutsch
		str = str.replace(/‘(.+?)’/g, (m, p1) => `<Paraphrase>${p1}</Paraphrase>`); // englisch
		str = str.replace(/'(.+?)'/g, (m, p1) => `<Paraphrase>${p1}</Paraphrase>`);
		// <Zitat>
		str = str.replace(/„(.+?)“/g, (m, p1) => `<Zitat>${azInZitat(p1)}</Zitat>`); // deutsch
		str = str.replace(/“(.+?)”/g, (m, p1) => `<Zitat>${azInZitat(p1)}</Zitat>`); // englisch
		str = str.replace(/"(.+?)"/g, (m, p1) => `<Zitat>${azInZitat(p1)}</Zitat>`);
		// <Anmerkung>
		str = str.replace(/\s*\(\((.+?)\)\)/g, (m, p1) => `<Anmerkung>${p1}</Anmerkung>`);
		// <Autorenzusatz> (vor den Verweisen taggen!)
		if (blockzitat) {
			str = str.replace(/\[(.*?)\](?!\s*\()/gs, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`); // sicherstellen, dass nicht Beginn von Verweis!
			str = str.replace(/\{(.*?)\}/gs, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
		}
		// <Verweis_extern>
		str = str.replace(/\[([^\]]+?)\]\(\s*(https?:\/\/[^\s]+?)\s*\)(?:\(\s*([0-9]{1,2})\.\s*([0-9]{1,2})\.\s*([0-9]{4})\s*\))?/g, (m, p1, p2, p3, p4, p5) => {
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
		});
		// <Verweis>
		str = str.replace(/\[([^\]]+?)\]\((.+?)\)(?:\(([a-zA-Z]+)\))?/g, (m, p1, p2, p3) => {
			p1 = p1.trim();
			p2 = p2.trim();
			if (p1 === p2) {
				p1 = "";
			}
			let typ = "";
			if (p3) {
				typ = ` Typ=##${p3}##`;
			}
			let verweis = `<Verweis${typ}>`;
			verweis += `\n  <Verweistext>${p1}</Verweistext>`;
			verweis += `\n  <Verweisziel>${p2.replace(/ /g, "%20")}</Verweisziel>`;
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
				if (/,\s?$/.test(p2)) {
					anschluss = p2.match(/,\s?$/)[0];
					p2 = p2.replace(/,\s?$/, "");
				} else if (/^(,\shier|\ss\.\s?v\.)\s$/.test(p2)) {
					anschluss = p2;
					p2 = "";
				} else if (/^\s$/.test(p2)) {
					return `<Literaturreferenz Ziel=##${p1}##/>${p2}`;
				}
				p2 = p2.trim();
				if (!p2) {
					return `<Literaturreferenz Ziel=##${p1}##/>${anschluss}`;
				}
				return `<Literaturreferenz Ziel=##${p1}##>${p2}</Literaturreferenz>${anschluss}`;
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
			p1 = p1.replace(/<\/?erwaehntes_Zeichen>/g, "__"); // kein <erwaehntes_Zeichen>
			p1 = p1.replace(/<\/?Stichwort>/g, "_"); // kein <Stichwort>
			p1 = p1.replace(/<.+?>/g, ""); // keine Tags
			return `<URL>${p1}</URL>`;
		});
		// @Ziel keine Halbgeviertstriche
		str = str.replace(/Ziel="(.+?)"/g, (m, p1) => {
			p1 = p1.replace(/–/g, "-");
			return `Ziel="${p1}"`;
		});
		// in <Aufrufdatum> kein Whitespace; führenden Nullen ergänzen
		// (Aufhübschung von helfer.typographie() rückgängig machen)
		str = str.replace(/<Aufrufdatum>(.+?)<\/Aufrufdatum>/g, (m, p1) => {
			p1 = p1.replace(/\s/g, "").split(".");
			return `<Aufrufdatum>${p1[0].padStart(2, "0")}.${p1[1].padStart(2, "0")}.${p1[2]}</Aufrufdatum>`;
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
			str = str.replace(/\[(.*?)\]/g, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
			// falls jemand auf die Idee kommen sollte, auch das hier
			str = str.replace(/\{(.*?)\}/g, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
			return str;
		}
		// typische und untypische Formen des Nachklapps einer Literaturangabe erkennen
		//   p2 = String
		//     (ermittelter Nachklapp einer Literaturangabe)
		function p2Typisch (p2) {
			if (/^(,\shier|\ss\.\sv\.)/.test(p2)) {
				return true;
			} else if (!p2 ||
					/^(\s|,|\s[-–]\s?|\s?[0-9]{4},)$/.test(p2) ||
					/^,\s/.test(p2) && !/[0-9]/.test(p2) ||
					/[0-9]/.test(p2) && !/,/.test(p2)) {
				return false;
			}
			return true;
		}
	},
	// zählt die Belege durch und trägt die Anzahl ein
	belegeZaehlen () {
		let anzahl = document.getElementById("belege-anzahl"),
			belege = document.querySelectorAll("#bl .kopf");
		if (belege.length) {
			anzahl.textContent = `(${belege.length})`;
		} else {
			anzahl.textContent = " ";
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
			slotBlock = null,
			slotOri = slot,
			slotNeu = -1,
			arr = [],
			slotKlon,
			illustration = false;
		if (kopf.dataset.slotBlock) {
			slotBlock = parseInt(kopf.dataset.slotBlock, 10);
			illustration = xml.data.xl[key][slot].ct[slotBlock].it === "Illustration";
		}
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
			slotKlon.au = [...arr[slot].au];
		} else if (/^(ab|tx)$/.test(key) &&
				slotBlock !== null) {
			arr = xml.data.xl[key][slot].ct;
			slotKlon = {...arr[slotBlock]};
		} else if (key === "wi") {
			arr = xml.data.xl.wi[xml.bgAktGn];
			slotKlon = {...arr[slot]};
		} else if (key === "nw") {
			arr = xml.data.xl.bg[xml.bgAkt].nw;
			slotKlon = arr[slot];
		} else {
			arr = xml.data.xl[key];
			slotKlon = {...arr[slot]};
			if (key === "le") {
				slotKlon.le = [...arr[slot].le];
			} else if (/^(ab|tx)$/.test(key)) {
				let ct = [];
				for (let i of arr[slot].ct) {
					ct.push({...i});
				}
				slotKlon.ct = ct;
			}
		}
		// spezieller Verschiebeblocker für Wortinformationen
		let wiBlock = {
			up: false,
			down: false,
		};
		if (key === "wi") {
			const vt = xml.data.xl.wi[xml.bgAktGn][slot].vt;
			if (slot > 0 &&
					xml.data.xl.wi[xml.bgAktGn][slot - 1].vt !== vt) {
				wiBlock.up = true;
			}
			if (slot < xml.data.xl.wi[xml.bgAktGn].length - 1 &&
					xml.data.xl.wi[xml.bgAktGn][slot + 1].vt !== vt) {
				wiBlock.down = true;
			}
		}
		// Variablen ermitteln
		if (slotBlock !== null) {
			const isUeberschrift = arr[slotBlock].it === "Überschrift";
			if (dir === "up" &&
					!isUeberschrift &&
					slotBlock > 0 &&
					arr[slotBlock - 1].it !== "Überschrift") {
				slotNeu = slotBlock - 1;
				slotBlock++;
			} else if (dir === "down" &&
					!isUeberschrift &&
					slotBlock < arr.length - 1) {
				slotNeu = slotBlock + 2;
			}
		} else {
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
		if (slotBlock !== null) {
			arr.splice(slotBlock, 1);
		} else {
			arr.splice(slot, 1);
		}
		// Verschieben auf Elementebene
		let klon = kopf.cloneNode(true),
			next = kopf.nextSibling;
		if (slotBlock !== null) {
			koepfe = kopf.closest(".abschnitt-cont").querySelectorAll(".kopf");
		}
		kopf.parentNode.insertBefore(klon, koepfe[slotNeu]);
		kopf.parentNode.removeChild(kopf);
		xml.elementKopfEvents({kopf: klon});
		// Kopf von Abschnitt/Textblock: Verschieben des Content-Blocks
		if (/^(ab|tx)$/.test(key)) {
			let klonNext = next.cloneNode(true);
			klon.parentNode.insertBefore(klonNext, klon.nextSibling);
			klon.parentNode.removeChild(next);
			xml.abtxEvents({cont: klonNext});
			if (slotBlock === null) {
				klonNext.querySelectorAll(".kopf").forEach(kopf => xml.elementKopfEvents( {kopf} ));
			}
		}
		// Slots auffrischen
		xml.refreshSlots({key: refreshKey});
		// ggf. Levels auffrischen
		if (/^(ab|tx)$/.test(key)) {
			xml.refreshLevels({key, slot: -1});
		}
		// Daten speichern
		xml.speichern();
		// Verschiebepfeil im neuen Kopf fokussieren
		const pfeilNr = dir === "up" ? 0 : 1;
		klon.querySelectorAll(".pfeile a")[pfeilNr].focus();
		// Konsequenzen
		if (key === "wi") {
			// Verweistypgrenze in Wortinformationen markieren
			xml.wiVerweistypGrenze();
		} else if (key === "nw") {
			// Reihenfolge der Nachweise im Bedeutungsgerüst auffrischen
			xml.bgNachweiseRefresh();
		} else if (illustration) {
			xml.textblockAbbSetId({});
		}
	},
	// Abschnitt ein- oder ausrücken
	//   dir = String
	//     (Bewegungsrichtung, "left" | "right")
	//   kopf = Element
	//     (der Kopf, in dem der Pfeil angeklickt wurde)
	indent ({dir, kopf}) {
		// Variablen vorbereiten
		let key = kopf.dataset.key,
			slot = parseInt(kopf.dataset.slot, 10),
			arr = xml.data.xl[key],
			level = arr[slot].le,
			levelNeu = 0;
		// Variablen ermitteln
		if (dir === "left" &&
				level > 1) {
			levelNeu = level - 1;
		} else if (dir === "right" &&
				slot > 0 &&
				level <= arr[slot - 1].le) {
			levelNeu = level + 1;
		}
		// Verschieben nicht möglich/nötig/erlaubt
		if (!levelNeu || levelNeu > 4) {
			return;
		}
		// Verschieben
		arr[slot].le = levelNeu;
		kopf.classList.replace(`level-${level}`, `level-${levelNeu}`);
		kopf.nextSibling.classList.replace(`level-${level}`, `level-${levelNeu}`);
		// automatische Korrekturen der folgenden Container,
		// damit keine illegalen Löcher entstehen
		xml.refreshLevels({key, slot});
		// Daten speichern
		xml.speichern();
	},
	// illegale Einrückungen korrigieren
	//   key = String
	//     (ID des Containers, dessen Köpfe überprüft werden sollen)
	//   slot = Number
	//     (Slot, vor dem gestartet werden soll; also -1, wenn Start bei 0)
	refreshLevels ({key, slot}) {
		let koepfe = document.querySelectorAll(`#${key} > .kopf`),
			arr = xml.data.xl[key];
		for (let i = slot + 1, len = arr.length; i < len; i++) {
			const level = arr[i].le;
			if (i === 0) {
				if (level > 1) {
					arr[0].le = 1;
					replaceLevel(koepfe[0], level);
				}
				continue;
			}
			const levelVor = arr[i - 1].le;
			if (level - levelVor > 1) {
				arr[i].le = level - 1;
				replaceLevel(koepfe[i], level);
			}
		}
		function replaceLevel (kopf, level) {
			kopf.classList.replace(`level-${level}`, `level-${level - 1}`);
			kopf.nextSibling.classList.replace(`level-${level}`, `level-${level - 1}`);
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
				for (let j = 0, len = subKoepfe.length; j < len; j++) {
					subKoepfe[j].dataset.slot = i;
					subKoepfe[j].dataset.slotBlock = j;
					let pre = subKoepfe[j].nextSibling.querySelector(".pre-cont");
					pre.dataset.slot = i;
					pre.dataset.slotBlock = j;
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
	// Änderungen in der Kartei speichern
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(xml.data.contentsId, "red-xml-speichern", xml.data.xl);
	},
	// Speichern der Kartei triggern
	speichernKartei () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(xml.data.contentsId, "kartei-speichern");
		helfer.animation("gespeichert");
	},
	// Exportieren: XML-Datei zusammenbauen
	exportieren () {
		if (!xml.exportierenEval()) {
			return;
		}
		let parser = new DOMParser(),
			d = xml.data.xl;
		// XML zusammenbauen
		let xmlStr = `<?xml-model href="../share/rnc/Wortgeschichten.rnc" type="application/relax-ng-compact-syntax"?>\n`;
		xmlStr += `<?xml-stylesheet type="text/css" href="../share/css/zdl.css"?>\n`;
		xmlStr += `<WGD xmlns="http://www.zdl.org/ns/1.0">\n`;
		xmlStr += `\t<Artikel xml:id="${d.md.id}" Typ="${d.md.ty}">\n`;
		// Revisionen
		xmlStr += "\t".repeat(2) + "<Revisionen>\n";
		for (let i of d.md.re) {
			xmlStr += indentXml(i.xl, 3);
			xmlStr += "\n";
		}
		xmlStr += "\t".repeat(2) + "</Revisionen>\n";
		// Lemmata
		for (let i of d.le) {
			xmlStr += indentXml(i.xl, 2);
			xmlStr += "\n";
		}
		// Themenfeld
		xmlStr += "\t".repeat(2) + "<Diasystematik>\n";
		xmlStr += "\t".repeat(3) + `<Themenfeld>${d.md.tf.replace(/&(?!amp;)/g, "&amp;")}</Themenfeld>\n`;
		xmlStr += "\t".repeat(2) + "</Diasystematik>\n";
		// Kurz gefasst und Wortgeschichte
		let texte = {
			ab: "Wortgeschichte_kompakt",
			tx: "Wortgeschichte",
		};
		let basisZuletzt = 0;
		for (let [k, v] of Object.entries(texte)) {
			xmlStr += "\t".repeat(2) + `<${v}>\n`;
			if (!d[k].length) {
				xmlStr += "\t".repeat(3) + `<Abschnitt/>\n`;
			}
			for (let i of d[k]) {
				let attr = [];
				if (i.id) {
					attr.push(`xml:id="${i.id}"`);
				}
				if (i.ty) { // z.Zt. immer "Mehr erfahren" | ""
					attr.push(`Relevanz="niedrig"`);
				}
				// Einrückung
				let basis = 3 + i.le - 1;
				if (basisZuletzt && basis > basisZuletzt) {
					for (let b = basis - basisZuletzt; b > 0; b--) {
						xmlStr = xmlStr.replace(/\s*<\/Abschnitt>\n$/, "\n");
					}
				} else if (basisZuletzt && basis < basisZuletzt) {
					for (let b = basisZuletzt - basis; b > 0; b--) {
						xmlStr += "\t".repeat(basis + b - 1) + "</Abschnitt>\n";
					}
				}
				basisZuletzt = basis;
				// neuen Abschnitt erzeugen
				xmlStr += "\t".repeat(basis) + `<Abschnitt${attr.length ? " " + attr.join(" ") : ""}>\n`;
				for (let tb of i.ct) {
					// <Ueberschrift> | <Textblock> | <Blockzitat> | <Liste> | <Illustration>
					xmlStr += indentStr(tb.xl, basis + 1);
					xmlStr += "\n";
				}
				xmlStr += "\t".repeat(basis) + "</Abschnitt>\n";
			}
			while (basisZuletzt > 3) {
				basisZuletzt--;
				xmlStr += "\t".repeat(basisZuletzt) + "</Abschnitt>\n";
			}
			xmlStr += "\t".repeat(2) + `</${v}>\n`;
		}
		// Belege
		xmlStr += "\t".repeat(2) + "<Belegreihe>\n";
		for (let i of d.bl) {
			xmlStr += indentStr(i.xl, 3);
			xmlStr += "\n";
		}
		xmlStr += "\t".repeat(2) + "</Belegreihe>\n";
		// Literatur
		xmlStr += "\t".repeat(2) + "<Literatur>\n";
		for (let i of d.lt) {
			xmlStr += "\t".repeat(3) + `<Literaturtitel xml:id="${i.id}" Ziel="../share/Literaturliste.xml#${i.id}"/>\n`;
		}
		xmlStr += "\t".repeat(2) + "</Literatur>\n";
		// Bedeutungsgerüst
		if (xml.bgAkt > -1) {
			xmlStr += indentStr(d.bg[xml.bgAkt].xl, 2); // z.Zt. nur ein Gerüst exportieren
			xmlStr += "\n";
		}
		// Wortinformationen
		// (z.Zt. nur einen Wortinfoblock exportieren)
		let wi = d.wi[xml.bgAktGn] ?? []; // jshint ignore:line
		let vt = "";
		for (let i of wi) {
			if (xml.wiMap.export[i.vt] !== vt) {
				vt = xml.wiMap.export[i.vt];
				if (/<Verweise Typ/.test(xmlStr)) {
					xmlStr += "\t".repeat(2) + "</Verweise>\n";
				}
				xmlStr += "\t".repeat(2) + `<Verweise Typ="${vt}">\n`;
			}
			xmlStr += indentStr(i.xl, 3);
			xmlStr += "\n";
		}
		if (wi.length) {
			xmlStr += "\t".repeat(2) + "</Verweise>\n";
		}
		// Abschluss
		xmlStr += "\t</Artikel>\n</WGD>\n";
		// Leerzeilen einfügen
		let leerzeilen = [
			/(?<=Revisionen>\n)\t+<Lemma/,
			/\t+<Diasystematik/,
			/\t+<Wortgeschichte(_kompakt)?/g,
			/\t+<Ueberschrift/g,
			/\t+<Textblock/g,
			/\t+<Blockzitat/g,
			/\t+<Liste/g,
			/(?<=Listenpunkt>)\n\s+<Listenpunkt/g,
			/\t+<Illustration/g,
			/(?<=(Ueberschrift|Textblock|Blockzitat|Liste|Illustration)>\n)\t+<Abschnitt/g,
			/(?<=(Ueberschrift|Textblock|Blockzitat|Liste|Illustration)>\n)\t+<\/Abschnitt/g,
			/\t+<Belegreihe/,
			/(?<=Beleg>\n)\t+<Beleg/g,
			/\t+<Literatur>/,
			/\s+<Lesart(?!enreferenz)/g,
			/\t+<Verweise/g,
		];
		for (let i of leerzeilen) {
			xmlStr = xmlStr.replace(i, m => "\n" + m);
		}
		// Tabs durch Leerzeichen ersetzen
		xmlStr = xmlStr.replace(/\t/g, " ".repeat(2));
		// Daten exportieren
		xml.exportierenSpeichern({xmlStr});
		// Funktionen zum Einrücken der Zeilen eines bestehenden XML-String
		function indentXml (str, level) {
			let xmlDoc = parser.parseFromString(str, "text/xml");
			xmlDoc = helferXml.indent(xmlDoc);
			const xmlStr = new XMLSerializer().serializeToString(xmlDoc);
			return indentStr(xmlStr, level);
		}
		function indentStr (str, level) {
			const t = "\t".repeat(level);
			str = t + str;
			return str.replace(/\n/g, `\n${t}`);
		}
	},
	// Exportieren: übperprüfen, ob alle notwendigen Elemente vorhanden sind
	exportierenEval () {
		let fehlstellen = [],
			d = xml.data.xl;
		if (!d.md.id) {
			fehlstellen.push("• eine Artikel-ID vergeben");
		}
		if (!d.md.ty) {
			fehlstellen.push("• einen Artikeltyp auswählen");
		}
		if (!d.md.tf) {
			fehlstellen.push("• ein Themenfeld auswählen");
		}
		if (!d.md.re.length) {
			fehlstellen.push("• min. eine Revision anlegen");
		}
		if (!d.le.length) {
			fehlstellen.push("• min. ein Lemma angeben");
		}
		if (!d.bl.length) {
			fehlstellen.push("• min. einen Belege importieren");
		}
		if (fehlstellen.length) {
			let numerus = "eine Pflichtangabe fehlt";
			if (fehlstellen.length > 1) {
				numerus = "einige Pflichtangaben fehlen";
			}
			dialog.oeffnen({
				typ: "alert",
				text: `Die XML-Daten können nicht exportiert werden, da noch ${numerus}. Sie müssen zuvor:\n${fehlstellen.join("<br>")}`,
			});
			return false;
		}
		return true;
	},
	// Exportieren: XML-Dateidaten speichern
	//   xmlStr = String
	//     (die XML-Dateiedaten)
	async exportierenSpeichern ({xmlStr}) {
		const path = require("path"),
			wort = xml.data.wort.replace(/ /g, "_");
		let opt = {
			title: "XML speichern",
			defaultPath: path.join(appInfo.documents, `${wort}.xml`),
			filters: [
				{
					name: "XML-Dateien",
					extensions: ["xml"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		if (xml.data.letzter_pfad) {
			opt.defaultPath = path.join(xml.data.letzter_pfad, `${wort}.xml`);
		}
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: false,
			winId: winInfo.winId,
			opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Kartei speichern
		const fsP = require("fs").promises;
		fsP.writeFile(result.filePath, xmlStr)
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Speichern der XML-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`,
				});
			});
		// Pfad speichern
		let reg = new RegExp(`^.+\\${path.sep}`);
		const pfad = result.filePath.match(reg)[0];
		xml.data.letzter_pfad = pfad;
		ipcRenderer.sendTo(xml.data.contentsId, "optionen-letzter-pfad", pfad);
	},
	// Importieren: XML-Datei öffnen und überprüfen
	async importieren () {
		let opt = {
			title: "XML-Datei öffnen",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: "XML-Dateien",
					extensions: ["xml"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
			properties: [
				"openFile",
			],
		};
		if (xml.data.letzter_pfad) {
			opt.defaultPath = xml.data.letzter_pfad;
		}
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: true,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Datei einlesen
		const fsP = require("fs").promises;
		fsP.readFile(result.filePaths[0], {encoding: "utf8"})
			.then(content => {
				let parser = new DOMParser(),
					xmlDoc = parser.parseFromString(content, "text/xml");
				// XML-Datei ist nicht wohlgeformt
				if (xmlDoc.querySelector("parsererror")) {
					dialog.oeffnen({
						typ: "alert",
						text: "Die XML-Datei kann nicht eingelesen werden.\n<h3>Fehlermeldung</h3>\nXML nicht wohlgeformt",
					});
					return;
				}
				// XML-Datei folgt unbekanntem Schema
				if (xmlDoc.documentElement.nodeName !== "WGD" ||
						xmlDoc.documentElement.getAttribute("xmlns") !== "http://www.zdl.org/ns/1.0") {
					dialog.oeffnen({
						typ: "alert",
						text: "Die XML-Datei kann nicht eingelesen werden.\n<h3>Fehlermeldung</h3>\nXML folgt einem unbekannten Schema",
					});
					return;
				}
				// XML scheint okay zu sein
				dialog.oeffnen({
					typ: "confirm",
					text: "Sollen die Daten aus der XML-Datei wirklich importiert werden?\n(Alle bisherigen Daten im Redaktionsfenster gehen dabei verloren.)",
					callback: () => {
						if (dialog.antwort) {
							xml.importierenEinlesen({xmlDoc});
						}
					},
				});
			})
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
				});
				throw err;
			});
	},
	// Importieren: XML-Datei einlesen
	//   xmlDoc = Document
	//     (die XML-Datei, die eingelesen werden soll)
	async importierenEinlesen ({xmlDoc}) {
		// Helfer-Funktionen
		let nsResolver = prefix => {
			switch (prefix) {
				case "x":
					return "http://www.zdl.org/ns/1.0";
				case "xml":
					return "http://www.w3.org/XML/1998/namespace";
			}
		};
		let evaluator = xpath => {
			return xmlDoc.evaluate(xpath, xmlDoc, nsResolver, XPathResult.ANY_TYPE, null);
		};
		let normierer = snippet => {
			let xmlStr = new XMLSerializer().serializeToString(snippet);
			xmlStr = xmlStr.replace(/ xmlns=".+?"/g, "");
			xmlStr = xmlStr.replace(/(\n\s*\n)+/g, "\n"); // Leerzeilen entfernen
			let n = xmlStr.split("\n"),
				m = n[n.length - 1].match(/^\s+/),
				len = m ? m[0].length : 0; // z.B. <Textreferenz> hat keine Zeilenumbrüche
			xmlStr = xmlStr.replace(new RegExp(`\\n\\s{${len}}`, "g"), "\n");
			return xmlStr;
		};
		// Daten und Formular zurücksetzen
		xml.data.xl = helferXml.redXmlData();
		await xml.resetFormular();
		// Metadaten
		let xl = xml.data.xl;
		xl.md.id = evaluator("//x:Artikel/@xml:id").iterateNext().textContent;
		xl.md.tf = evaluator("//x:Artikel/x:Diasystematik/x:Themenfeld").iterateNext().textContent;
		xl.md.ty = evaluator("//x:Artikel/@Typ").iterateNext().textContent;
		let re = evaluator("//x:Revision"),
			i = re.iterateNext();
		while (i) {
			let o = {
				au: [],
				no: i.querySelector("Aenderung").textContent,
				xl: normierer(i),
			};
			for (let j of i.querySelectorAll("Autor")) {
				o.au.push(j.textContent);
			}
			let datum = i.querySelector("Datum").textContent.split(".");
			o.da = `${datum[2]}-${datum[1]}-${datum[0]}`;
			xl.md.re.push(o);
			i = re.iterateNext();
		}
		// Lemmata
		let le = evaluator("//x:Lemma");
		i = le.iterateNext();
		while (i) {
			let o = {
				le: [],
				re: "",
				ty: i.getAttribute("Typ"),
				xl: normierer(i),
			};
			for (let j of i.querySelectorAll("Schreibung")) {
				o.le.push(j.textContent);
			}
			let re = i.querySelector("Textreferenz");
			if (re) {
				o.re = re.getAttribute("Ziel");
			}
			xl.le.push(o);
			i = le.iterateNext();
		}
		// Text (Kurz gefasst, Wortgeschichte)
		let w = [
			{
				key: "ab",
				tag: "Wortgeschichte_kompakt",
			},
			{
				key: "tx",
				tag: "Wortgeschichte",
			},
		];
		for (let i of w) {
			let a = evaluator(`//x:${i.tag}//x:Abschnitt`),
				j = a.iterateNext();
			while (j) {
				// Abschnitt
				let id = j.getAttribute("xml:id"),
					relevanz = j.getAttribute("Relevanz");
				let o = {
					ct: [],
					id: id || "",
					le: 1,
					ty: relevanz ? "Mehr erfahren" : "",
				};
				let parent = j.parentNode;
				while (parent.nodeName === "Abschnitt") {
					o.le++;
					parent = parent.parentNode;
				}
				// Element-Knoten im Abschnitt
				let n = evaluator(`//x:${i.tag}//x:Abschnitt/*`),
					k = n.iterateNext();
				while (k) {
					if (k.parentNode !== j || k.nodeName === "Abschnitt") {
						k = n.iterateNext();
						continue;
					}
					let id = k.getAttribute("xml:id"),
						ty = k.getAttribute("Typ");
					let p = {
						id: id || "",
						it: k.nodeName.replace(/^Ue/, "Ü"),
						ty: ty || "",
						xl: normierer(k),
					};
					o.ct.push(p);
					k = n.iterateNext();
				}
				// nächster Abschnitt
				xl[i.key].push(o);
				j = a.iterateNext();
			}
		}
		// Belege
		let bl = evaluator("//x:Belegreihe/x:Beleg");
		i = bl.iterateNext();
		while (i) {
			let o = {
				da: i.querySelector("Datum").textContent,
				id: i.getAttribute("xml:id"),
				xl: normierer(i),
			};
			o.ds = helfer.datumGet({
				datum: o.da,
			}).sortier;
			xl.bl.push(o);
			i = bl.iterateNext();
		}
		// Literatur
		let lt = evaluator("//x:Literaturtitel");
		i = lt.iterateNext();
		while (i) {
			const id = i.getAttribute("xml:id");
			let o = {
				id,
				si: "[Sigle unbekannt]",
				xl: `<Fundstelle xml:id="${id}">\n  <unstrukturiert>[Titel unbekannt]</unstrukturiert>\n</Fundstelle>`,
			};
			xl.lt.push(o);
			i = lt.iterateNext();
		}
		// Wortinformationen
		xl.wi["1"] = [];
		let wi = evaluator("//x:Verweise/*");
		i = wi.iterateNext();
		while (i) {
			let o = {
				gn: "1",
				vt: xml.wiMap.import[i.parentNode.getAttribute("Typ")],
				xl: normierer(i),
			};
			if (i.nodeName === "Textreferenz") {
				o.lt = "Textverweis";
				o.tx = i.textContent;
			} else if (i.nodeName === "Verweis") {
				o.lt = "Verweis intern";
				o.tx = i.querySelector("Verweistext").textContent || i.querySelector("Verweisziel").textContent;
			} else if (i.nodeName === "Verweis_extern") {
				o.lt = "Verweis extern";
				o.tx = i.querySelector("Verweistext").textContent;
			}
			xl.wi["1"].push(o);
			i = wi.iterateNext();
		}
		// Bedeutungsgerüst
		let bg = evaluator("//x:Lesarten");
		i = bg.iterateNext();
		while (i) {
			xml.bgAkt = 0;
			xml.bgAktGn = "1";
			let o = {
				gn: "1",
				nw: [],
				tf: [],
				xl: normierer(i),
			};
			xl.bg.push(o);
			xml.bgRefreshData(); // hier wird xml.speichern() angestoßen
			i = bg.iterateNext();
		}
		// Abschluss des Einlesevorgangs => Formular neu aufbauen
		xml.init();
	},
};
