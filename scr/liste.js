"use strict";

let liste = {
	// Zeigt die Karteikartenliste an, überprüft aber vorher
	// ob noch ein Beleg in Bearbeitung gespeichert werden muss
	anzeigen () {
		if (!kartei.wort) { // noch keine Kartei geöffnet/erstellt
			dialog.oeffnen("alert", null);
			dialog.text("Sie müssen erst einmal eine Kartei öffnen oder erstellen!");
		} else if (beleg.geaendert) { // aktueller Beleg noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.confirm) {
					beleg.belegGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert!\nMöchten Sie trotzdem zur Beleg-Liste wechseln?\nAchtung, alle Änderungen am aktuellen Beleg gehen verloren!");
		} else {
			liste.wechseln();
		}
	},
	// zur Belegliste wechseln (von wo auch immer)
	wechseln () {
		document.getElementById("liste").classList.add("preload");
		helfer.sektionWechseln("liste");
	},
	// speichert, in welcher chronologischen Richtung die Belege sortiert werden soll
	sortierung_aufwaerts: true,
	// speichert, ob in der Belegliste der komplette Belegschnitt angezeigt werden soll
	belegschnitte_anzeigen: true,
	// baut die Belegliste auf
	aufbauen (filter_init) {
		// Filter initialisieren
		if (filter_init) {
			liste_filter.init();
		}
		// Content-Objekt vorbereiten
		let cont = document.getElementById("liste_belege_cont");
		helfer.keineKinder(cont);
		// Belege filtern
		let belege = Object.keys(data.k);
		belege = liste_filter.filter(belege);
		// Belege sortieren
		belege.sort(liste.belegeSortieren);
		let zeitschnitt = -1;
		for (let i = 0, len = belege.length; i < len; i++) {
			let beleg_akt = data.k[belege[i]];
			// Zeitschnitt ermitteln und ggf. anzeigen (in der Mitte des Jahrhunderts gibt es eine Markierung)
			let zs_datum = beleg_akt.da.match(/([0-9]{4})/)[0],
				zs = Math.round(parseInt(zs_datum.substring(2), 10) / 100);
			if (zeitschnitt === -1) { // vor dem 1. Beleg keine Zeitschnitt-Angabe
				zeitschnitt = zs;
			} else if (zs !== zeitschnitt) { // neuer Zeitschnitt
				zeitschnitt = zs;
				let div = document.createElement("div");
				div.classList.add("liste_beleg_zeitschnitt");
				if (!liste.sortierung_aufwaerts) {
					let jahrhundert = parseInt(zs_datum.substring(0, 2), 10);
					if (zs) {
						jahrhundert++;
					}
					div.textContent = `${jahrhundert}${zs === 0 ? "50" : "00"}`;
				} else {
					div.textContent = `${zs_datum.substring(0, 2)}${zs === 0 ? "00" : "50"}`;
				}
				cont.appendChild(div);
			}
			// Beleg bearbeiten
			let div = document.createElement("div"),
				a = document.createElement("a");
			a.href = "#";
			a.classList.add("liste_beleg_bearbeiten", "icon_link", "icon_bearbeiten");
			a.textContent = " ";
			a.dataset.id = belege[i];
			beleg.oeffnenKlick(a);
			div.appendChild(a);
			// Jahr
			let span = document.createElement("span");
			span.classList.add("liste_beleg_jahr");
			span.textContent = beleg_akt.da.match(/([0-9]{4})/)[0];
			div.appendChild(span);
			// Belegschnitt-Vorschau
			let schnitt = beleg_akt.bs,
				text = schnitt,
				idx = schnitt.split(new RegExp(helfer.escapeRegExp(kartei.wort), "i"))[0].length;
			if (idx > 15) {
				text = `…${schnitt.substring(idx - 10)}`;
			}
			span = document.createElement("span");
			span.classList.add("liste_beleg_vorschau");
			span.textContent = text;
			liste.belegschnittUmschalten(span);
			div.appendChild(span);
			// div einhängen
			cont.appendChild(div);
			// Belegschnitt
			div = document.createElement("div");
			div.classList.add("liste_beleg_schnitt");
			if (!liste.belegschnitte_anzeigen) {
				div.classList.add("aus");
			}
			let schnitt_prep = schnitt.replace(/\n(\s+)*\n/g, "\n"), // Leerzeilen löschen
				schnitt_p = schnitt_prep.split("\n");
			for (let j = 0, len = schnitt_p.length; j < len; j++) {
				let p = document.createElement("p");
				p.textContent = schnitt_p[j];
				div.appendChild(p);
			}
			// div einhängen
			cont.appendChild(div);
		}
	},
	// Belege chronologisch sortieren
	belegeSortieren (a, b) {
		let datum_a = parseInt(data.k[a].da.match(/([0-9]{4})/)[0], 10),
			datum_b = parseInt(data.k[b].da.match(/([0-9]{4})/)[0], 10);
		// Belege aus demselben Jahr => jüngere Belege immer nach älteren sortieren
		if (datum_a === datum_b) {
			return parseInt(a, 10) - parseInt(b, 10);
		}
		// Sortierung nach Jahr
		if (liste.sortierung_aufwaerts) {
			return datum_a - datum_b;
		}
		return datum_b - datum_a;
	},
	// einen einzelnen Belegschnitt umschalten
	belegschnittUmschalten (span) {
		span.addEventListener("click", function() {
			let schnitt = this.parentNode.nextSibling;
			schnitt.classList.toggle("aus");
		});
	},
	// Funktionen im Header aufrufen
	header (link) {
		link.addEventListener("click", function(evt) {
			evt.preventDefault();
			let funktion = this.id.replace(/^liste_link_/, "");
			if (funktion === "filter") {
				liste.headerFilter();
			} else if (funktion.match(/^sort_/)) {
				liste.headerSortieren(funktion);
			} else if (funktion === "belegschnitt") {
				liste.headerBelegschnitt();
			}
		});
	},
	// Filter ein- bzw. ausblenden
	headerFilter () {
		let sec_liste = document.getElementById("liste"),
			link_filter = document.getElementById("liste_link_filter"),
			snippets = document.querySelectorAll(".liste_beleg_vorschau"),
			filter_an = false;
		sec_liste.classList.remove("preload"); // damit beim ersten Anzeigen der Liste keine Animation läuft
		sec_liste.classList.toggle("filter_aus");
		if (sec_liste.classList.contains("filter_aus")) {
			link_filter.title = "Filter einblenden";
			link_filter.classList.remove("icon_filter_aus");
			link_filter.classList.add("icon_filter_an");
		} else {
			filter_an = true;
			link_filter.title = "Filter ausblenden";
			link_filter.classList.add("icon_filter_aus");
			link_filter.classList.remove("icon_filter_an");
		}
		// Darstellung der Snippets ändern: Ist der Filter aus, können sie ein bisschen breiter dargestellt werden.
		for (let i = 0, len = snippets.length; i < len; i++) {
			if (filter_an) {
				snippets[i].classList.remove("breit");
			} else {
				snippets[i].classList.add("breit");
			}
		}
	},
	// chronologisches Sortieren der Belege
	headerSortieren (funktion) {
		// Muss die Sortierung überhaupt geändert werden?
		if (funktion.match(/_ab$/) && !liste.sortierung_aufwaerts ||
				funktion.match(/_auf$/) && liste.sortierung_aufwaerts) {
			return;
		}
		// Sortierung wird geändert
		liste.sortierung_aufwaerts = !liste.sortierung_aufwaerts;
		liste.aufbauen(false);
	},
	// Anzeige des kompletten Belegschnitts umstellen
	headerBelegschnitt () {
		liste.belegschnitte_anzeigen = !liste.belegschnitte_anzeigen;
		let link = document.getElementById("liste_link_belegschnitt");
		if (liste.belegschnitte_anzeigen) {
			link.classList.remove("icon_auge");
			link.classList.add("icon_auge_aus");
			link.title = "Komplettanzeige der Belegschnitte ausblenden";
		} else {
			link.classList.add("icon_auge");
			link.classList.remove("icon_auge_aus");
			link.title = "Komplettanzeige der Belegschnitte einblenden";
		}
		liste.aufbauen(false); // TODO das kann ich hier durch eine Schleife regeln
	},
};
