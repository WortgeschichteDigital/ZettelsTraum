"use strict";

let erinnerungen = {
	data: {
		bearbeiterin: {
			okay: false,
			text: `Sie haben sich noch nicht registriert (<a href="#" class="link-erinnerung" data-funktion="einstellungen-allgemeines">⇨ <i>APP &gt; Einstellungen &gt; Allgemeines &gt; BearbeiterIn</i></a>).`,
		},
		metadaten: {
			okay: false,
			text: `In den redaktionellen Metadaten ist keine BearbeiterIn registriert (<a href="#" class="link-erinnerung" data-funktion="metadaten">⇨ <i>Redaktion &gt; Metadaten</i></a>).`,
		},
		redaktion: {
			okay: false,
			text: `In den Redaktionsereignissen fehlen Angaben zu den BearbeiterInnen (<a href="#" class="link-erinnerung" data-funktion="redaktion">⇨ <i>Redaktion &gt; Ereignisse</i></a>).`,
		},
		artikelDatei: {
			okay: false,
			text: `Sie haben den Artikel erstellt, die Datei mit dem Artikel aber noch nicht mit dieser Kartei verknüpft (<a href="#" class="link-erinnerung" data-funktion="anhaenge">⇨ <i>Kartei &gt; Anhänge</i></a>).`,
		},
	},
	// speichert, ob alle Tests bestanden wurden
	allesOkay: false,
	// überprüfen, ob auf etwas hingewiesen werden muss
	check () {
		// nicht testen, wenn keine Kartei offen ist
		if (!kartei.wort) {
			return;
		}
		// Tests durchführen
		erinnerungen.allesOkay = true;
		// BearbeiterIn registriert?
		if (optionen.data.einstellungen.bearbeiterin) {
			erinnerungen.data.bearbeiterin.okay = true;
		} else {
			erinnerungen.allesOkay = false;
			erinnerungen.data.bearbeiterin.okay = false;
		}
		// BearbeiterIn in Metadaten?
		if (data.rd.be.length) {
			erinnerungen.data.metadaten.okay = true;
		} else {
			erinnerungen.allesOkay = false;
			erinnerungen.data.metadaten.okay = false;
		}
		// BearbeiterIn in allen Redaktionsereignissen?
		let redaktion = true;
		for (let i = 0, len = data.rd.er.length; i < len; i++) {
			if (!data.rd.er[i].pr) {
				redaktion = false;
				break;
			}
		}
		if (redaktion) {
			erinnerungen.data.redaktion.okay = true;
		} else {
			erinnerungen.allesOkay = false;
			erinnerungen.data.redaktion.okay = false;
		}
		// Artikel erstellt, aber nicht verknüpft?
		for (let i of data.rd.er) {
			if (i.er === "Artikel erstellt") {
				if (data.rd.bh) {
					// Wort wird in einer anderen Datei mit behandelt;
					// dort ist die Artikeldatei
					erinnerungen.data.artikelDatei.okay = true;
					break;
				}
				let okay = false;
				for (let f of data.an) {
					if (/\.(doc|docx|odt)$/.test(f)) {
						okay = true;
						break;
					}
				}
				erinnerungen.data.artikelDatei.okay = okay;
				if (!okay) {
					erinnerungen.allesOkay = false;
				}
				break;
			} else {
				erinnerungen.data.artikelDatei.okay = true;
			}
		}
		// Icon umschalten
		kopf.icons();
	},
	// Erinnerungen auf Klick anzeigen
	show () {
		let text = [];
		for (let i in erinnerungen.data) {
			if (!erinnerungen.data.hasOwnProperty(i)) {
				continue;
			}
			if (erinnerungen.data[i].okay) {
				continue;
			}
			text.push(`• ${erinnerungen.data[i].text.replace(/APP/g, appInfo.name)}`);
		}
		let punkt = "Der folgende Punkt sollte";
		if (text.length > 1) {
			punkt = "Die folgenden Punkte sollten";
		}
		dialog.oeffnen({
			typ: "alert",
			text: `${punkt} vielleicht korrigiert werden:\n${text.join("\n")}`,
		});
		document.querySelectorAll("#dialog-text a").forEach(a => erinnerungen.listener(a));
	},
	// Klick-Listener für die Verlinkungen im Erinnerungenfenser
	//   a = Element
	//     (der Link im Erinnerungenfenster, der zu der Funktion führt)
	listener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			switch (this.dataset.funktion) {
				case "anhaenge":
					anhaenge.fenster();
					break;
				case "einstellungen-allgemeines":
					optionen.oeffnen();
					optionen.sektionWechseln(document.querySelector("#einstellungen ul a"));
					break;
				case "metadaten":
					redMeta.oeffnen();
					break;
				case "redaktion":
					redaktion.oeffnen();
					break;
			}
			setTimeout(() => overlay.schliessen(document.getElementById("dialog")), 200);
		});
	},
};
