"use strict";

let redMeta = {
	// Metdatenfenster einblenden
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Redaktion &gt; Metadaten</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-meta");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		fenster.querySelector("input").focus();
		// Behandelt-in-Feld füllen
		document.getElementById("red-meta-behandelt-in").value = data.rd.bh;
		// Sachgebiete aufbauen TODO
	},
	// Timeout, damit gewisse Funktionen nicht zu häufig getriggert werden
	behandeltInTimeout: null,
	// Änderungen im Behandelt-in-Feld übernehmen
	//   input = Element
	//     (das Behandelt-in-Feld)
	behandeltIn (input) {
		input.addEventListener("input", function() {
			data.rd.bh = this.value;
			// die folgende Funktionen nicht zu häufig aufrufen
			clearTimeout(redMeta.behandeltInTimeout);
			redMeta.behandeltInTimeout = setTimeout(() => {
				// Änderungsmarkierung setzen
				kartei.karteiGeaendert(true);
				// Erinnerungen-Icon auffrischen
				erinnerungen.check();
			}, 250);
		});
	},
};
