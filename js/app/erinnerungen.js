"use strict";

let erinnerungen = {
	data: {
		bearbeiterin: {
			okay: false,
			text: `Sie haben sich noch nicht registriert (<a href="#" class="link-erinnerung" data-funktion="einstellungen-allgemeines">⇨ <i>APP &gt; Einstellungen &gt; Allgemeines &gt; BearbeiterIn</i></a>).`,
		},
		metadaten: {
			okay: false,
			text: `In den Metadaten der Kartei ist keine BearbeiterIn registriert (<a href="#" class="link-erinnerung" data-funktion="metadaten">⇨ <i>Kartei &gt; Metadaten</i></a>).`,
		},
		redaktion: {
			okay: false,
			text: `Im Redaktionsfenster fehlen Angaben zu den BearbeiterInnen (<a href="#" class="link-erinnerung" data-funktion="redaktion">⇨ <i>Kartei &gt; Redaktion</i></a>).`,
		},
		artikelDatei: {
			okay: false,
			text: `Sie haben den Artikel erstellt, die Datei mit dem Artikel aber noch nicht mit dieser Kartei verknüpft (<a href="#" class="link-erinnerung" data-funktion="anhaenge">⇨ <i>Kartei &gt; Anhänge</i></a>).`,
		},
		xmlDatei: {
			okay: false,
			text: `Sie haben eine XML-Datei erstellt, aber noch nicht mit dieser Kartei verknüpft (<a href="#" class="link-erinnerung" data-funktion="anhaenge">⇨ <i>Kartei &gt; Anhänge</i></a>).`,
		},
	},
	// überprüfen, ob auf etwas hingewiesen werden muss
	check () {
		// nicht testen, wenn keine Kartei offen ist
		if (!kartei.wort) {
			return;
		}
		// Tests durchführen
		let alles_okay = true;
		// BearbeiterIn registriert?
		if (optionen.data.einstellungen.bearbeiterin) {
			erinnerungen.data.bearbeiterin.okay = true;
		} else {
			alles_okay = false;
			erinnerungen.data.bearbeiterin.okay = false;
		}
		// BearbeiterIn in Metadaten?
		if (data.be.length) {
			erinnerungen.data.metadaten.okay = true;
		} else {
			alles_okay = false;
			erinnerungen.data.metadaten.okay = false;
		}
		// BearbeiterIn in allen Redaktionsereignissen?
		let redaktion = true;
		for (let i = 0, len = data.rd.length; i < len; i++) {
			if (!data.rd[i].pr) {
				redaktion = false;
				break;
			}
		}
		if (redaktion) {
			erinnerungen.data.redaktion.okay = true;
		} else {
			alles_okay = false;
			erinnerungen.data.redaktion.okay = false;
		}
		// Artikel erstellt, aber nicht verknüpft?
		for (let i of data.rd) {
			if (i.er === "Artikel erstellt") {
				let okay = false;
				for (let f of data.an) {
					if (/\.(doc|docx|odt)$/.test(f)) {
						okay = true;
						break;
					}
				}
				erinnerungen.data.artikelDatei.okay = okay;
				if (!okay) {
					alles_okay = false;
				}
				break;
			} else {
				erinnerungen.data.artikelDatei.okay = true;
			}
		}
		// XML-Datei erstellt, aber nicht verknüpft?
		for (let i of data.rd) {
			if (i.er === "XML-Auszeichnung") {
				let okay = false;
				for (let f of data.an) {
					if (/\.xml$/.test(f)) {
						okay = true;
						break;
					}
				}
				erinnerungen.data.xmlDatei.okay = okay;
				if (!okay) {
					alles_okay = false;
				}
				break;
			} else {
				erinnerungen.data.xmlDatei.okay = true;
			}
		}
		// Icon umschalten
		erinnerungen.icon(!alles_okay);
	},
	// Anzeige des Icons umschalten
	//   an = Boolean
	icon (an) {
		let icon = document.getElementById("erinnerungen-icon");
		if (an) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
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
					meta.oeffnen();
					break;
				case "redaktion":
					redaktion.oeffnen();
					break;
			}
			setTimeout(() => overlay.schliessen(document.getElementById("dialog")), 200);
		});
	},
};
