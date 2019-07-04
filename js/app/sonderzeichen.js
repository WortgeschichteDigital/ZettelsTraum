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
	},
	// Sonderzeichen eintragen
	//   ele = Element
	//     (Element, in dem das Sonderzeichen steht)
	eintragen (ele) {
		ele.addEventListener("click", function() {
			// Fenster schließen
			overlay.schliessen(document.getElementById("sonderzeichen"));
			// Feld fokussieren
			let feld = document.getElementById(sonderzeichen.caller),
				val = feld.value;
			feld.focus();
			// Zeichen eintragen + merkieren
			const zeichen = this.textContent,
				start = feld.selectionStart,
				ende = feld.selectionEnd,
				textStart = val.substring(0, start),
				textEnde = val.substring(ende);
			feld.value = textStart + zeichen + textEnde;
			feld.setSelectionRange(start, start + zeichen.length, "forward");
		});
	},
};
