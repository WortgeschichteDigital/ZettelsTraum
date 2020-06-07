"use strict";

let xml = {
	// enthält die übergebenen Daten
	//   data.key = String (Schlüssel, der den Datentyp angibt)
	//   data.ds = Object (der je spezifisch strukturierte Datensatz)
	data: {},
	// enthält Auswahlmöglichkeiten für Dropdown-Felder
	dropdown: {
		abschnittTyp: ["Exkurs"],
		abschnittTypen: ["Überschrift", "Textblock", "Illustration"],
		textblock: ["Blockzitat"],
	},
	// Anzeige mit den gelieferten Daten aufbereiten
	init () {
		// Wort eintragen
		document.querySelector("h1").textContent = xml.data.wort;
		// Init: Metadaten
		let md = document.getElementById("md");
		xml.elementLeer({ele: md});
		// Init: Lemmata
		let le = document.getElementById("le");
		xml.elementLeer({ele: le});
		// Init: Abstract TODO
		let ab = document.getElementById("ab");
// 		xml.elementLeer({ele: ab});
		// Init: Text TODO
		let tx = document.getElementById("tx");
// 		xml.elementLeer({ele: tx});
		// Init: Belege/Literatur (Standard-Arrays)
		let keys = ["bl", "lt"];
		for (let key of keys) {
			let cont = document.getElementById(key);
			for (let i = 0, len = xml.data.xl[key].length; i < len; i++) {
				let ele = xml.elementArr({key, slot: i});
				cont.appendChild(ele);
			}
			if (!xml.data.xl[key].length) {
				xml.elementLeer({ele: cont});
			} else {
				xml.layoutTabellig({
					id: key,
					ele: [2, 3],
					warten: 250,
				});
			}
		}
		// Init: Wortinformationen
		let wi = document.getElementById("wi");
		xml.elementLeer({ele: wi});
		// Init: Bedeutungsgerüst
		let bg = document.getElementById("bg");
		xml.elementLeer({ele: bg});
	},
	// Empfangen von Datensätzen: Verteilerfunktion
	//   xmlDatensatz = Object
	//     (der Datensatz)
	empfangen ({xmlDatensatz}) {
		if (/^bl|lt$/.test(xmlDatensatz.key)) {
			xml.empfangenArr({
				key: xmlDatensatz.key,
				ds: xmlDatensatz.ds,
			});
		}
		xml.speichern();
	},
	// Empfangen von Datensätzen: Standard-Arrays
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   ds = Object
	//     (der Datensatz mit dem Beleg)
	empfangenArr ({key, ds}) {
		let cont = document.getElementById(key);
		// ggf. Leermeldung löschen
		let leer = cont.querySelector(".leer");
		if (leer) {
			cont.removeChild(leer);
		}
		// Datensatz ersetzen oder hinzufügen
		const idx = xml.data.xl[key].findIndex(i => i.id === ds.id);
		if (idx >= 0) {
			// Datensatz ersetzen
			xml.data.xl[key][idx] = ds;
			// Element ersetzen
			let ele = xml.elementArr({key, slot: idx}),
				divs = cont.querySelectorAll(".kopf");
			cont.replaceChild(ele, divs[idx]);
			// ggf. Vorschau auffrischen
			let pre = ele.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				xml.xmlPreview({
					xmlStr: xml.data.xl[key][idx].xl,
					after: ele,
				});
			}
		} else {
			// Datensatz hinzufügen
			xml.data.xl[key].push(ds);
			// Datensätze sortieren
			let sortStr = [];
			for (let i of xml.data.xl[key]){
				if (key === "bl") {
					sortStr.push(i.ds);
				} else if (key === "lt") {
					sortStr.push(i.si);
				}
			}
			if (key === "bl") {
				sortStr.sort();
				xml.data.xl.bl.sort((a, b) => sortStr.indexOf(a.ds) - sortStr.indexOf(b.ds));
			} else if (key === "lt") {
				sortStr.sort(helfer.sortSiglen);
				xml.data.xl.lt.sort((a, b) => sortStr.indexOf(a.si) - sortStr.indexOf(b.si));
			}
			// neues Element einhängen
			const idx = xml.data.xl[key].findIndex(i => i.id === ds.id);
			let ele = xml.elementArr({key, slot: idx}),
				divs = cont.querySelectorAll(".kopf");
			if (idx === xml.data.xl[key].length - 1) {
				cont.appendChild(ele);
			} else {
				cont.insertBefore(ele, divs[idx]);
			}
		}
		// Ansicht tabellenartig gestalten
		xml.layoutTabellig({
			id: key,
			ele: [2, 3],
		});
	},
	// Element erzeugen: Standard-Arrays
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   slot = Number
	//     (Slot, in dem der Beleg steht)
	elementArr ({key, slot}) {
		let div = document.createElement("div");
		div.classList.add("kopf");
		div.dataset.key = key;
		div.dataset.id = xml.data.xl[key][slot].id;
		xml.elementPreviewArr({div});
		// Warn-Icon
		xml.elementWarn({ele: div});
		xml.xmlCheck({
			warn: div.firstChild,
			xmlStr: xml.data.xl[key][slot].xl,
		});
		// Lösch-Icon
		let a = document.createElement("a");
		div.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-x-dick");
		a.title = "Löeschen";
		xml.elementLoeschenArr({a});
		// ID
		let id = document.createElement("span");
		div.appendChild(id);
		id.classList.add("id");
		id.textContent = xml.data.xl[key][slot].id;
		// Hinweisfeld
		let hinweis = document.createElement("span");
		div.appendChild(hinweis);
		hinweis.classList.add("hinweis");
		if (key === "bl") {
			hinweis.textContent = xml.data.xl.bl[slot].da;
		} else if (key === "lt") {
			hinweis.textContent = xml.data.xl.lt[slot].si;
		}
		// Vorschau
		let vorschau = document.createElement("span");
		div.appendChild(vorschau);
		if (key === "bl") {
			let belegtext = xml.data.xl.bl[slot].xl.match(/<Belegtext>(.+?)<\/Belegtext>/s);
			vorschau.textContent = belegtext[1].replace(/<.+?>/g, "");
		} else {
			let unstrukturiert = xml.data.xl.lt[slot].xl.match(/<unstrukturiert>(.+?)<\/unstrukturiert>/);
			vorschau.textContent = unstrukturiert[1];
		}
		return div;
	},
	// Element-Vorschau umschalten: Standard-Arrays
	//   key = String
	//     (der Schlüssel des Datensatzes)
	//   div = Element
	//     (Kopf, zu dem die Vorschau eingeblendet werden soll)
	elementPreviewArr ({div}) {
		div.addEventListener("click", function() {
			// Preview ausblenden
			let pre = this.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				xml.xmlEditFrage({
					pre,
					fun: () => xml.elementPreviewOff({pre}),
				});
				return;
			}
			// Preview einblenden
			let kopf = this.closest(".kopf");
			const key = kopf.dataset.key,
				id = kopf.dataset.id,
				idx = xml.data.xl[key].findIndex(i => i.id === id);
			xml.xmlPreview({
				xmlStr: xml.data.xl[key][idx].xl,
				after: this,
				editable: key === "bl" ? true : false,
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
			// Datensatz löschen
			let kopf = this.closest(".kopf"),
				key = kopf.dataset.key,
				id = kopf.dataset.id;
			const idx = xml.data.xl[key].findIndex(i => i.id === id);
			xml.data.xl[key].splice(idx, 1);
			// ggf. Preview ausblenden
			let pre = kopf.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				await xml.elementPreviewOff({pre});
			}
			// Element entfernen
			kopf.parentNode.removeChild(kopf);
			// Leermeldung erzeugen oder Ansicht auffrischen
			if (!xml.data.xl[key].length) {
				xml.elementLeer({
					ele: document.getElementById(key),
				});
			} else {
				xml.layoutTabellig({
					id: key,
					ele: [2, 3],
				});
			}
			// Daten speichern
			xml.speichern();
		});
	},
	// Icon, dass darauf aufmerksam macht, dass das XML nicht valide ist
	//   ele = Element
	//     (Element, an das das Icon angehängt werden soll)
	elementWarn ({ele}) {
		let warn = document.createElement("span");
		ele.appendChild(warn);
		warn.classList.add("warn", "icon-kreis-info");
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
	// Abschnitt erstellen
	//   input = Element
	//     (das Textfeld mit dem Abschnitttyp)
	makeAbschnitt ({input}) {
		const typ = helfer.textTrim(input.value, true);
		// korrekter Typ?
		if (typ && !xml.dropdown.abschnittTyp.includes(typ)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Als Abschnitt-Typ steht nur „Exkurs“ zur Verfügung.\nUm einen Standard-Abschnitt zu erzeugen, lassen Sie das Textfeld leer.",
				callback: () => input.select(),
			});
			return;
		}
		// Abschnitt erzeugen TODO
	},
	// XML-Vorschau erzeugen
	//   xmlStr = String
	//     (XML-Snippet, das angezeigt werden soll)
	//   after = Element
	//     (Elemente, hinter dem das Preview erscheinen soll)
	//   editable = true || false || undefined
	//     (XML-Snippet darf editiert werden)
	xmlPreview ({xmlStr, after, editable = false}) {
		// Einzüge hinzufügen (wenn möglich)
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xmlStr, "text/xml");
		if (!xmlDoc.querySelector("parsererror")) {
			xmlDoc = helferXml.indent(xmlDoc);
			xmlStr = new XMLSerializer().serializeToString(xmlDoc);
		}
		// Fehler auslesen (falls vorhanden)
		let warn = after.querySelector(".warn"),
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
		let next = after.nextSibling;
		if (next && next.classList.contains("pre-cont")) {
			next.firstChild.innerHTML = helferXml.prettyPrint({xmlStr, xmlErr});
			return;
		}
		// Pre-Container mit Pre erzeugen und einhängen
		let cont = document.createElement("div");
		cont.classList.add("pre-cont");
		let pre = document.createElement("pre");
		cont.appendChild(pre);
		pre.innerHTML = helferXml.prettyPrint({xmlStr, xmlErr});
		after.parentNode.insertBefore(cont, after.nextSibling);
		// ggf. Editier-Button ergänzen
		if (editable) {
			let p = document.createElement("p");
			cont.appendChild(p);
			xml.xmlEditBearbeiten({p});
		}
		// Pre-Container einblenden
		let height = cont.offsetHeight;
		cont.style.height = "0px";
		setTimeout(() => {
			cont.style.height = `${height}px`;
			setTimeout(() => cont.style.removeProperty("height"), 300);
		}, 0);
	},
	// XML-Vorschau: Snippet editieren
	//   button = Element
	//     (der Bearbeiten-Button)
	xmlEdit ({button}) {
		button.addEventListener("click", function() {
			// Datensatz ermitteln
			let cont = this.closest(".pre-cont"),
				kopf = cont.previousSibling;
			const key = kopf.dataset.key,
				id = kopf.dataset.id,
				slot = xml.data.xl[key].findIndex(i => i.id === id);
			// Bearbeiten-Feld erzeugen
			let div = document.createElement("div");
			div.classList.add("bearbeiten");
			let ta = document.createElement("textarea");
			div.appendChild(ta);
			ta.setAttribute("rows", "1");
			ta.value = xml.data.xl[key][slot].xl;
			ta.addEventListener("input", function() {
				this.dataset.geaendert = "true";
				helfer.textareaGrow(this, 0);
			});
			// Element einhängen
			cont.replaceChild(div, cont.firstChild);
			helfer.textareaGrow(ta, 0);
			ta.setSelectionRange(0, 0);
			ta.focus();
			// Leiste auffrischen
			let p = cont.lastChild;
			helfer.keineKinder(p);
			let buttons = ["Speichern", "Abbrechen"];
			for (let b of buttons) {
				let button = document.createElement("input");
				p.appendChild(button);
				button.type = "button";
				button.value = b;
				xml.xmlEditSpeichern({button});
			}
		});
	},
	// XML-Vorschau: Bearbeiten-Button erzeugen
	//   p = Element
	//     (Absatz für den Bearbeiten-Button)
	xmlEditBearbeiten ({p}) {
		helfer.keineKinder(p);
		let bearb = document.createElement("input");
		p.appendChild(bearb);
		bearb.type = "button";
		bearb.value = "Bearbeiten";
		xml.xmlEdit({button: bearb});
	},
	// XML-Vorschau: Speichern-/Abbrechen-Button erzeugen
	//   button = Element
	//     (Speichern- oder Abbrechen-Button)
	xmlEditSpeichern ({button}) {
		button.addEventListener("click", async function() {
			// Datensatz ermitteln
			let cont = this.closest(".pre-cont"),
				kopf = cont.previousSibling;
			const key = kopf.dataset.key,
				id = kopf.dataset.id,
				slot = xml.data.xl[key].findIndex(i => i.id === id);
			if (this.value === "Speichern") {
				xml.data.xl[key][slot].xl = cont.querySelector("textarea").value;
				xml.xmlCheck({
					warn: kopf.firstChild,
					xmlStr: xml.data.xl[key][slot].xl,
				});
			} else {
				const frage = await xml.xmlEditFrage({
					pre: cont,
					fun: () => {},
				});
				if (!frage) {
					return;
				}
			}
			// Pre zurücksetzen
			let pre = document.createElement("pre");
			cont.replaceChild(pre, cont.firstChild);
			xml.xmlPreview({
				xmlStr: xml.data.xl[key][slot].xl,
				after: kopf,
			});
			// Button zurücksetzen
			xml.xmlEditBearbeiten({p: cont.lastChild});
		});
	},
	// XML-Vorschau: Frage, ob Änderungen gespeichert werden sollen
	//   pre = Element
	//     (.pre-cont)
	//   fun = Function
	//     (Function, die eigentlich ausgeführt werden soll)
	xmlEditFrage ({pre, fun}) {
		return new Promise(resolve => {
			let ta = pre.querySelector("textarea");
			if (ta && ta.dataset.geaendert) {
				dialog.oeffnen({
					typ: "confirm",
					text: "Möchten Sie Ihre Änderungen nicht erst einmal speichern?",
					callback: () => {
						if (dialog.antwort !== null) {
							if (dialog.antwort) {
								pre.querySelector(`[value="Speichern"]`).dispatchEvent(new MouseEvent("click"));
							}
							fun();
							resolve(true);
						} else {
							resolve(false);
						}
					},
				});
				return;
			}
			fun();
			resolve(true);
		});
	},
	// überprüft ein XML-Snippet darauf, ob es wohlgeformt ist
	//   warn = Element
	//     (das Warn-Icon, das angepasst werden muss)
	//   xmlStr = String
	//     (XML-Snippet, das überprüft werden soll)
	xmlCheck ({warn, xmlStr}) {
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
				delete warn.title;
			}
		}
	},
	// Breite von Elementen anpassen, sodass Kopfzeilen wie eine Tabelle wirken
	//   id = String
	//     (ID des Containers, in dem die Elemente sind)
	//   ele = Array
	//     (in jedem Slot steht eine Nummer, die für das Element steht, dessen Breite
	//     angepasst werden soll)
	//   warten = Number || undefined
	//     (Millisekunden, die vor dem Berechnen der Maximalbreite gewartet werden
	//     soll; beim Initialisieren muss dies deutlich länger sein)
	async layoutTabellig ({id, ele, warten = 15}) {
		let cont = document.getElementById(id),
			koepfe = cont.querySelectorAll(".kopf");
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
	// Änderungen in der Kartei speichern
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(xml.data.contentsId, "red-xml-speichern", xml.data.xl);
	},
};
