"use strict";

let liste = {
	// speichert in welcher chronologischen Richtung die Belege sortiert werden
	sortierung_aufwaerts: true,
	// Baut die Karteikarten-Liste auf
	aufbauen () {
		// TODO
	},
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
	// zur Liste wechseln (von wo auch immer)
	wechseln () {
		document.getElementById("liste").classList.add("preload");
		helfer.sektionWechseln("liste");
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
			}
		});
	},
	// Filter ein- bzw. ausblenden
	headerFilter () {
		let sec_liste = document.getElementById("liste"),
			link_filter = document.getElementById("liste_link_filter");
		sec_liste.classList.remove("preload");
		sec_liste.classList.toggle("filter_aus");
		if (sec_liste.classList.contains("filter_aus")) {
			link_filter.title = "Filter einblenden";
			link_filter.firstChild.src = "img/filter_an.svg";
		} else {
			link_filter.title = "Filter ausblenden";
			link_filter.firstChild.src = "img/filter_aus.svg";
		}
	},
	// chronologisches Sortieren der Belege
	headerSortieren (funktion) {
		// Muss die Sortierung geändert werden?
		if (funktion.match(/_ab$/) && !liste.sortierung_aufwaerts ||
				funktion.match(/_auf$/) && liste.sortierung_aufwaerts) {
			return;
		}
		// Sortierung wird geändert
		liste.sortierung_aufwaerts = !liste.sortierung_aufwaerts;
		liste.aufbauen();
	},
};
