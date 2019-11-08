"use strict";

let sonderzeichen = {
	// speichert die ID des Elements zwischen, in das das Sonderzeichen eingefügt werden soll
	caller: "",
	// Fenster öffnen
	//   caller = String
	//     (ID des Textfeldes, in das die Sonderzeichen eingetragen werden sollen)
	oeffnen (caller) {
		sonderzeichen.caller = caller;
		let fenster = document.getElementById("sonderzeichen");
		overlay.oeffnen(fenster);
		document.querySelector("#sonderzeichen-cont a").focus();
	},
	// Sonderzeichen eintragen
	//   ele = Element
	//     (Element, in dem das Sonderzeichen steht)
	eintragen (ele) {
		ele.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Fenster schließen
			overlay.schliessen(document.getElementById("sonderzeichen"));
			// Feld fokussieren
			let feld = document.getElementById(sonderzeichen.caller),
				val = feld.value;
			feld.focus();
			// Zeichen eintragen + merkieren
			const zeichen = this.textContent.replace(/</, "&lt;").replace(/>/, "&gt;"),
				start = feld.selectionStart,
				ende = feld.selectionEnd,
				textStart = val.substring(0, start),
				textEnde = val.substring(ende);
			feld.value = textStart + zeichen + textEnde;
			feld.setSelectionRange(start, start + zeichen.length, "forward");
			// Änderungen übernehmen (wenn aus dem Belegfeld der Karteikarte aufgerufen)
			if (sonderzeichen.caller === "beleg-bs") {
				beleg.data.bs = helfer.textTrim(feld.value, true);
				beleg.belegGeaendert(true);
			}
		});
	},
};
