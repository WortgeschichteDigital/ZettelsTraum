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
		// TODO Sachgebiete aufbauen?
	},
};
