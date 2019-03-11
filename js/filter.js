"use strict";

let filter = {
	// Liste der Filter aufbauen
	//   belege = Array
	//     (die IDs der Belege, bereits chronologisch sortiert)
	aufbauen (belege) {
		let filter_backup = filter.backup();
		// überprüfen, welche Filter vorhanden sind;
		// speichert zugleiche, wie viele Karten zu dem Filter passen
		let filter_typen = {
			buecherdienst: 0,
		};
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			// Bücherdienst
			if (data.ka[id].bu) {
				filter_typen.buecherdienst++;
			}
		}
		// Zeitraum
		if (!optionen.data.belegliste.sort_aufwaerts) {
			belege.reverse();
		}
		if (!belege.length) {
			filter.zeitraumStart = "";
		} else {
			filter.zeitraumStart = liste.zeitschnittErmitteln(data.ka[ belege[0] ].da).jahr;
			filter.zeitraumEnde = liste.zeitschnittErmitteln(data.ka[ belege[belege.length - 1] ].da).jahr;
			// Zwischenspeicher für die Jahre der Belge füllen
			filter.jahrBelegeFuellen();
		}
		filter.aufbauenZeitraum();
		// dynamische Filter drucken
		const cont = document.getElementById("liste-filter-dynamisch");
		helfer.keineKinder(cont);
		// Backup der Filtereinstellungen wiederherstellen
		filter.backupWiederher(filter_backup);
		// TODO FILTERBLOCK ERZEUGEN
// 		cont.appendChild( filter.aufbauenCont("Volltext") );
		// Bücherdienst TODO ALTER CODE
// 		if (filter_typen.buecherdienst) {
// 			let p = document.createElement("p"),
// 				input = document.createElement("input"),
// 				label = document.createElement("label");
// 			input.type = "checkbox";
// 			input.id = "filter_buecherdienst";
// 			filter.anwenden(input);
// 			p.appendChild(input);
// 			label.setAttribute("for", "filter-buecherdienst");
// 			label.textContent = `Bücherdienst (${filter_typen.buecherdienst})`;
// 			p.appendChild(label);
// 			cont.appendChild(p);
// 		}
	},
	// Zwischenspeicher für die Zeiträume der aktuellen Belegliste
	zeitraumStart: "",
	zeitraumEnde: "",
	// Zeitraumfilter aufbauen
	//   start = String
	//     (Jahr des 1. Belegs)
	//   ende = String
	//     (Jahr des letzten Belegs)
	aufbauenZeitraum () {
		// Liste leeren
		const cont = document.getElementById("filter-zeitraum-dynamisch");
		helfer.keineKinder(cont);
		// Belege vorhanden?
		if (!filter.zeitraumStart) {
			let p = document.createElement("p");
			p.classList.add("filter-keine-belege");
			p.textContent = "keine Belege";
			cont.appendChild(p);
			return;
		}
		// Grenzen berechnen
		let start = filter.zeitraumStart,
			ende = filter.zeitraumEnde,
			filter1 = 0,
			filterN = 0,
			step = filter.aufbauenZeitraumStep();
		if (step === 100) { // 100er
			filter1 = parseInt(start.substring(0, 2), 10) * 100;
			filterN = parseInt(ende.substring(0, 2), 10) * 100;
		} else if (step === 50) { // 50er
			let haelfte1 = Math.round(parseInt(start.substring(2), 10) / 100) ? "50" : "00";
			filter1 = parseInt(`${start.substring(0, 2)}${haelfte1}`, 10);
			let haelfteN = Math.round(parseInt(ende.substring(2), 10) / 100) ? "50" : "00";
			filterN = parseInt(`${ende.substring(0, 2)}${haelfteN}`, 10);
		} else { // 10er
			filter1 = parseInt(start.substring(0, 3), 10) * 10;
			filterN = parseInt(ende.substring(0, 3), 10) * 10;
		}
		// Zeitraum-Cache leeren
		filter.zeitraumTrefferCache = {};
		// Liste füllen
		for (let i = filter1; i <= filterN; i += step) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Checkbox
			let input = document.createElement("input");
			input.id = `filter-zeit-${i}`;
			input.type = "checkbox";
			filter.anwenden(input);
			p.appendChild(input);
			// Label
			let label = document.createElement("label");
			label.setAttribute("for", `filter-zeit-${i}`);
			label.textContent = i;
			p.appendChild(label);
			// Anzahl der Treffer anzeigen
			let treffer = filter.aufbauenZeitraumTreffer(i, step);
			if (!treffer) {
				continue;
			}
			let span = document.createElement("span");
			span.classList.add("filter-treffer");
			span.textContent = `(${treffer})`;
			span.title = "Anzahl der Belege in diesem Zeitraum";
			p.appendChild(span);
		}
		// Liste nach oben scrollen
		cont.scrollTop = 0;
	},
	// Step ermitteln, in dem die Zeitraumfilter dargestellt werden
	aufbauenZeitraumStep () {
		let inputs = document.getElementsByName("filter-zeitraum");
		for (let i = 0, len = inputs.length; i < len; i++) {
			if (inputs[i].checked) {
				return parseInt(inputs[i].id.match(/[0-9]+$/)[0], 10);
			}
		}
	},
	// Zwischenspeicher für das Jahr des Belegs, mit dem gerechnet werden kann
	// (vgl. filter.aufbauen())
	jahrBelege: {},
	// füllt den Zwischenspeicher filter.jahrBelege
	jahrBelegeFuellen () {
		filter.jahrBelege = {};
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			filter.jahrBelege[id] = parseInt(liste.zeitschnittErmitteln(data.ka[id].da).jahr, 10);
		}
	},
	// hier werden die Treffer der angezeigten Zeiträume zwischengespeichert
	// (der Cache dient dazu, die Zeitraum-Grafik zu generieren)
	zeitraumTrefferCache: {},
	// Anzahl der Treffer in einem gegebenen Zeitraum ermitteln
	//   y = Number
	//     (das Jahr, mit dem der Zeitraum startet)
	//   step = Number
	//     (der Zeitraum für den dieser Jahresfilter steht)
	aufbauenZeitraumTreffer (y, step) {
		let ende = y + step - 1,
			treffer = 0;
		for (let id in filter.jahrBelege) {
			if ( !filter.jahrBelege.hasOwnProperty(id) ) {
				continue;
			}
			if (filter.jahrBelege[id] >= y && filter.jahrBelege[id] <= ende) {
				treffer++;
			}
		}
		filter.zeitraumTrefferCache[y] = treffer;
		return treffer;
	},
	// die Schnitte im Filter-Zeitraum werden gewechselt
	//   input = Element
	//     (Radio-Button, der für die gewünschten Zeitschnitte steht)
	wechselnZeitraum (input) {
		input.addEventListener("change", function() {
			optionen.data.filter_zeitraum = this.id.match(/[0-9]+$/)[0];
			optionen.speichern(false);
			filter.aufbauenZeitraum();
			liste.status(false);
		});
	},
	// Kopf und Container einer Filtergruppe erzeugen
	//   name = String
	//     (Name des Filterkopfes)
	aufbauenCont (name) {
		let frag = document.createDocumentFragment();
		// Filter-Kopf
		let a = document.createElement("a");
		a.classList.add("filter-kopf");
		a.href = "#";
		a.id = `filter-kopf-${name.toLowerCase()}`;
		a.textContent = name;
		frag.appendChild(a);
		// Filter-Container
		let div = document.createElement("div");
		div.classList.add("filter-cont");
		div.id = `filter-cont-${name.toLowerCase()}`;
		frag.appendChild(div);
		// Fragment zurückgeben
		return frag;
	},
	// Erstellt ein Backup der aktuellen Filter-Einstellungen, um sie nach
	// dem Neuaufbau der Liste wieder anzuwenden.
	backup () {
		let bak = {};
		document.querySelectorAll("#liste-filter input").forEach(function(i) {
			if (i.type === "text" && i.value) {
				bak[i.id] = i.value;
			} else if (i.type === "checkbox" || i.type === "radio") {
				bak[i.id] = i.checked;
			}
		});
		return bak;
	},
	// Stellt ein zuvor gemachtes Backup der Einstellungen in der Filterliste wieder her.
	//   bak = Object
	//     (Das Objekt mit den gespeicherten Einstellungen; vgl. filter.backup().)
	backupWiederher (bak) {
		document.querySelectorAll("#liste-filter input").forEach(function(i) {
			// kein Wert gespeichert
			if (!bak[i.id]) {
				return;
			}
			// Wert wiederherstellen
			if (i.type === "text") {
				i.value = bak[i.id];
			} else if (i.type === "checkbox" || i.type === "radio") {
				i.checked = bak[i.id];
			}
		});
	},
	// speichert den aktiven Timeout für das Anwenden der Filter
	// (wichtig für den Volltextfilter, der nicht sofort, sondern
	// nur mit Verzögerung angewandt werden soll)
	anwendenTimeout: null,
	// Löst beim Ändern eines Filters den Neuaufbau der Liste aus
	//   input = Element
	//     (Check- oder Textbox in der Filterliste, die geändert wurde)
	anwenden (input) {
		let listener = "change",
			timeout = 0;
		if (input.type === "text") {
			listener = "input";
			timeout = 250;
		}
		input.addEventListener(listener, function() {
			clearTimeout(filter.anwendenTimeout);
			filter.anwendenTimeout = setTimeout( () => liste.status(false), timeout);
		});
	},
	// Karteikarten filtern
	//   karten = Array
	//     (enthält die IDs der Karten, die gefiltert werden sollen)
	kartenFiltern (karten) {
		// aktive Filter ermitteln
		let filter_aktiv = {
			volltext: false,
			zeitraum: false,
			buecherdienst: false,
		};
		let inputs = document.querySelectorAll("#liste-filter input"),
			filtern = false;
		for (let i = 0, len = inputs.length; i < len; i++) {
			if (inputs[i].type === "text" && inputs[i].value ||
					inputs[i].type === "checkbox" && inputs[i].checked) {
				let id = inputs[i].id.replace(/^filter-/, "");
				filtern = true;
				filter_aktiv[id] = true;
			}
		}
		let filter_zeitraum = filter.kartenFilternZeitraum();
		if (filter_zeitraum.length) {
			filter_aktiv.zeitraum = true;
		}
		// keine Filter aktiv
		if (!filtern) {
			return karten;
		}
		// Karten filtern
		let karten_gefiltert = [],
			vt = helfer.textTrim(document.getElementById("filter-volltext").value),
			vt_reg = new RegExp(helfer.escapeRegExp( helfer.textTrim(vt) ), "i");
		for (let i = 0, len = karten.length; i < len; i++) {
			let id = karten[i];
			// Volltext
			if ( filter_aktiv.volltext && !volltext(id) ) {
				continue;
			}
			// Zeitraum
			let jahr = parseInt(liste.zeitschnittErmitteln(data.ka[id].da).jahr, 10);
			if (filter_aktiv.zeitraum && filter_zeitraum.indexOf(jahr) === -1) {
				continue;
			}
			// Bücherdienst
			if (filter_aktiv.buecherdienst && !data.ka[id].bu) {
				continue;
			}
			// Karte ist okay!
			karten_gefiltert.push(id);
		}
		return karten_gefiltert;
		// Funktionen
		function volltext (id) {
			let okay = false;
			const ds = ["au", "bd", "bs", "da", "no", "qu", "ts"];
			for (let i = 0, len = ds.length; i < len; i++) {
				if ( data.ka[id][ ds[i] ].match(vt_reg) ) {
					okay = true;
					break;
				}
			}
			return okay;
		}
	},
	// ermitteln, welche Jahre durch den Filter gelassen werden
	kartenFilternZeitraum () {
		let inputs = document.querySelectorAll("#filter-zeitraum-dynamisch input"),
			erg = [],
			step = filter.aufbauenZeitraumStep();
		inputs.forEach(function(i) {
			if (!i.checked) {
				return;
			}
			let jahr = parseInt(i.id.match(/[0-9]+$/)[0], 10);
			for (let j = jahr, ende = jahr + step; j < ende; j++) {
				erg.push(j);
			}
		});
		return erg;
	},
	// Aktion für die Steuerungslinks im Kopf der Filterleiste verteilen
	//   a = Element
	//     (Link, der die Aktion triggert)
	ctrlButtons (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let aktion = this.id.replace(/^filter-ctrl-/, "");
			if (aktion === "reset") {
				filter.ctrlReset();
			} else if (aktion === "zeitraumgrafik") {
				filter.ctrlGrafik();
			}
		});
	},
	// alle Filter zurücksetzen
	ctrlReset () {
		// Filter zurücksetzen
		document.querySelectorAll("#filter-volltext, #filter-zeitraum-dynamisch input, #liste-filter-dynamisch input").forEach(function(i) {
			if (i.type === "text") {
				i.value = "";
			} else if (i.type === "checkbox") {
				i.checked = false;
			}
		});
		// Liste neu aufbauen
		liste.status(false);
	},
	// Zeitraumgrafik generieren und anzeigen
	ctrlGrafik () {
		// Fenster öffnen od. in den Vordergrund holen
		let fenster = document.getElementById("zeitraumgrafik");
		if ( overlay.oeffnen(fenster) ) {
			return;
		}
		// Canvas vorbereiten
		const can = document.querySelector("#zeitraumgrafik-cont canvas"),
			ctx = can.getContext("2d");
		ctx.clearRect(0, 0, can.width, can.height);
		// Daten vorbereiten
		const jahre = Object.keys(filter.zeitraumTrefferCache),
			step_x = Math.floor((can.width - 40 - 10) / jahre.length); // Platz: 40px links, 10px rechts
		let treffer_max = 0;
		jahre.forEach(function(i) {
			if (filter.zeitraumTrefferCache[i] > treffer_max) {
				treffer_max = filter.zeitraumTrefferCache[i];
			}
		});
		const step_y = (can.height - 30 - 10) / treffer_max; // Platz: 30px unten, 10px oben
		// x-Linie zeichnen
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#c3d9f1";
		ctx.beginPath();
		ctx.moveTo(40, 370.5);
		ctx.lineTo(690, 370.5);
		ctx.stroke();
		// y-Linie zeichnen
		ctx.beginPath();
		ctx.moveTo(40.5, 10);
		ctx.lineTo(40.5, 370);
		ctx.stroke();
		ctx.closePath();
		// Diagramm zeichnen
		ctx.lineWidth = 3;
		ctx.strokeStyle = "#72a0cf";
		ctx.font = "14px DejaVu Sans";
		ctx.textAlign = "left";
		let x = 40 - step_x,
			last_font_x = 0;
		for (let i = 0, len = jahre.length; i < len; i++) {
			x += step_x;
			let y = can.height - 30 - Math.round(step_y * filter.zeitraumTrefferCache[ jahre[i] ]) + 0.5; // 30px Platz unten (s.o.)
			if (i === 0) {
				ctx.beginPath();
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
			if (x - last_font_x < 50 && i !== 0) { // Jahreszahlen brauchen ein wenig Platz => nicht zu viele anzeigen
				continue;
			}
			ctx.fillText(jahre[i], x - 17, 390); // Jahreszahlen in 14px DejaVu Sans sind 34px breit
			last_font_x = x;
		}
		ctx.stroke();
		// Treffer an der y-Linie auftragen
		ctx.textAlign = "right";
		let last_font_y = 370;
		for (let i = 1; i <= treffer_max; i++) {
			let y = 370 + 5 - i * step_y; // der Text ist 11px hoch, darum hier + 5
			if (last_font_y - y < 20) { // die Anzahl der Treffer braucht ein wenig Platz => nicht zu eng staffeln
				continue;
			}
			last_font_y = y;
			ctx.fillText(i, 32, y);
		}
	},
};
