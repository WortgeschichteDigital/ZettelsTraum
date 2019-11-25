"use strict";

let xml = {
	// markierten Belegschnitt in die Zwischenablage kopieren
	schnitt () {
// 		hier liegt der Text: popup.textauswahl.html
		helfer.animation("zwischenablage");
	},
	// Referenztag des Belegs in die Zwischenablage kopieren
	referenz () {
		const id = xml.belegId();
		helfer.toClipboard({
			text: `<Belegreferenz Ziel="${id}"/>`,
		});
		helfer.animation("zwischenablage");
	},
	// Beleg-ID ermitteln
	belegId () {
		let data = popup.referenz;
		// Autor
		let autor = helfer.textTrim(data.au, true);
		if (!autor) {
			autor = "n-n";
		} else {
			autor = autor.split(",")[0];
			autor = autor.replace(/[,;.:'"+*!?(){}[\]]/g, "");
			autor = helfer.textTrim(autor, true);
			autor = autor.toLowerCase();
			autor = autor.replace(/\s/g, "-");
		}
		// Jahr
		let jahr = "",
			datum = data.da.match(/[0-9]{4}/);
		if (datum) {
			jahr = datum[0];
		} else {
			let jh = data.da.match(/([0-9]{2})\.\sJh\./);
			if (jh){ // das Datumsfeld könnte in Karteikarten noch nicht ausgefüllt sein
				jahr = `${parseInt(jh[1], 10) - 1}00`;
			}
		}
		// ID zurückgeben
		return `${autor}-${jahr}`;
	},
};
