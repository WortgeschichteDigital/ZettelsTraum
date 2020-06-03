"use strict";

let xml = {
	// enthält die übergebenen Daten
	data: {},
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
		// Init: Abstract
		let ab = document.getElementById("ab");
		xml.elementLeer({ele: ab});
		// Init: Text
		let tx = document.getElementById("tx");
		xml.elementLeer({ele: tx});
		// Init: Belege
		let bl = document.getElementById("bl");
		xml.elementLeer({ele: bl});
		// Init: Literatur
		let lt = document.getElementById("lt");
		for (let i = 0, len = xml.data.xl.lt.length; i < len; i++) {
			let ele = xml.elementLt({slot: i});
			lt.appendChild(ele);
		}
		if (!xml.data.xl.lt.length) {
			xml.elementLeer({ele: lt});
		} else {
			xml.layoutTabellig({
				id: "lt",
				ele: [2, 3],
				warten: 250,
			});
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
		if (xmlDatensatz.key === "lt") {
			xml.empfangenLt({ds: xmlDatensatz.ds});
		}
		xml.speichern();
	},
	// Empfangen von Datensätzen: Literaturtitel
	//   ds = Object
	//     (der Datensatz mit dem Literaturtitel)
	empfangenLt ({ds}) {
		let lt = document.getElementById("lt");
		// ggf. Leermeldung löschen
		let leer = lt.querySelector(".leer");
		if (leer) {
			lt.removeChild(leer);
		}
		// Datensatz ersetzen oder hinzufügen
		const idx = xml.data.xl.lt.findIndex(i => i.id === ds.id);
		if (idx >= 0) {
			// Datensatz ersetzen
			xml.data.xl.lt[idx] = ds;
			// Element ersetzen
			let ele = xml.elementLt({slot: idx}),
				divs = lt.querySelectorAll(".kopf");
			lt.replaceChild(ele, divs[idx]);
			// ggf. Vorschau auffrischen
			let pre = ele.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				xml.xmlPreview({
					xmlStr: xml.data.xl.lt[idx].xl,
					after: ele,
				});
			}
		} else {
			// Datensatz hinzufügen
			xml.data.xl.lt.push(ds);
			// Datensätze sortieren
			let siglen = [];
			for (let i of xml.data.xl.lt){
				siglen.push(i.si);
			}
			siglen.sort(helfer.sortSiglen);
			xml.data.xl.lt.sort((a, b) => siglen.indexOf(a.si) - siglen.indexOf(b.si));
			// neues Element einhängen
			const idx = xml.data.xl.lt.findIndex(i => i.id === ds.id);
			let ele = xml.elementLt({slot: idx}),
				divs = lt.querySelectorAll(".kopf");
			if (idx === xml.data.xl.lt.length - 1) {
				lt.appendChild(ele);
			} else {
				lt.insertBefore(ele, divs[idx]);
			}
		}
		// Ansicht tabellenartig gestalten
		xml.layoutTabellig({
			id: "lt",
			ele: [2, 3],
		});
	},
	// Element erzeugen: Literaturtitel
	//   slot = Number
	//     (Slot, in dem der Literaturtitel steht)
	elementLt ({slot}) {
		let div = document.createElement("div");
		div.classList.add("kopf");
		div.dataset.id = xml.data.xl.lt[slot].id;
		xml.elementPreviewLt({div});
		// Warn-Icon
		xml.elementWarn({ele: div});
		xml.xmlCheck({
			warn: div.firstChild,
			xml: xml.data.xl.lt[slot].xl,
		});
		// Lösch-Icon
		let a = document.createElement("a");
		div.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-x-dick");
		xml.elementLoeschenLt({a});
		// ID
		let id = document.createElement("span");
		div.appendChild(id);
		id.classList.add("id");
		id.textContent = xml.data.xl.lt[slot].id;
		// Sigle
		let sigle = document.createElement("span");
		div.appendChild(sigle);
		sigle.classList.add("sigle");
		sigle.textContent = xml.data.xl.lt[slot].si;
		// Titel
		let titel = document.createElement("span");
		div.appendChild(titel);
		let unstrukturiert = xml.data.xl.lt[slot].xl.match(/<unstrukturiert>(.+?)<\/unstrukturiert>/);
		titel.textContent = unstrukturiert[1];
		return div;
	},
	// Element-Vorschau umschalten: Literaturtitel
	//   div = Element
	//     (Kopf, zu dem die Vorschau eingeblendet werden soll)
	elementPreviewLt ({div}) {
		div.addEventListener("click", function() {
			// Preview ausblenden
			let pre = this.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				xml.elementPreviewOff({pre});
				return;
			}
			// Preview einblenden
			const id = this.closest(".kopf").dataset.id,
				idx = xml.data.xl.lt.findIndex(i => i.id === id);
			xml.xmlPreview({
				xmlStr: xml.data.xl.lt[idx].xl,
				after: this,
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
	// Element entfernen: Literaturtitel
	//   a = Element
	//     (der Lösch-Link)
	elementLoeschenLt ({a}) {
		a.addEventListener("click", async function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			// Datensatz löschen
			let kopf = this.closest(".kopf"),
				id = kopf.dataset.id;
			const idx = xml.data.xl.lt.findIndex(i => i.id === id);
			xml.data.xl.lt.splice(idx, 1);
			// ggf. Preview ausblenden
			let pre = kopf.nextSibling;
			if (pre && pre.classList.contains("pre-cont")) {
				await xml.elementPreviewOff({pre});
			}
			// Element entfernen
			kopf.parentNode.removeChild(kopf);
			// Leermeldung erzeugen oder Ansicht auffrischen
			if (!xml.data.xl.lt.length) {
				xml.elementLeer({
					ele: document.getElementById("lt"),
				});
			} else {
				xml.layoutTabellig({
					id: "lt",
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
	// XML-Vorschau erzeugen
	//   xmlStr = String
	//     (XML-Snippet, das angezeigt werden soll)
	//   after = Element
	//     (Elemente, hinter dem das Preview erscheinen soll)
	//   editable = true || undefined
	//     (XML-Snippet darf editiert werden)
	xmlPreview ({xmlStr, after, editable = false}) {
		// Einzüge hinzufügen (wenn möglich)
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xmlStr, "text/xml");
		if (!xmlDoc.querySelector("parsererror")) {
			xmlDoc = helferXml.indent(xmlDoc);
			xmlStr = new XMLSerializer().serializeToString(xmlDoc);
		}
		// Element wird schon angezeigt => neu ausfüllen
		let next = after.nextSibling;
		if (next && next.classList.contains("pre-cont")) {
			next.firstChild.innerHTML = helferXml.prettyPrint({xmlStr});
			return;
		}
		// Element erzeugen und einhängen
		let cont = document.createElement("div");
		cont.classList.add("pre-cont");
		let pre = document.createElement("pre");
		cont.appendChild(pre);
		pre.innerHTML = helferXml.prettyPrint({xmlStr});
		after.parentNode.insertBefore(cont, after.nextSibling);
		// Element einblenden
		let height = cont.offsetHeight;
		cont.style.height = "0px";
		setTimeout(() => {
			cont.style.height = `${height}px`;
			setTimeout(() => cont.style.removeProperty("height"), 300);
		}, 0);
		// Rechtsklickmenü bereitstellen
		pre.addEventListener("contextmenu", evt => {
			evt.preventDefault();
			popup.oeffnen(evt);
		});
	},
	// überprüft ein XML-Snippet darauf, ob es wohlgeformt ist
	//   warn = Element
	//     (das Warn-Icon, das angepasst werden muss)
	//   xml = String
	//     (XML-Snippet, das überprüft werden soll)
	xmlCheck ({warn, xml}) {
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xml, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			warn.classList.add("aktiv");
		} else {
			warn.classList.remove("aktiv");
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
				k.childNodes[e].style.width = `${max}px`;
			}
		}
	},
	// Änderungen in der Kartei speichern
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(xml.data.contentsId, "red-xml-speichern", xml.data.xl);
	},
};
