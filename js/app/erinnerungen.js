"use strict";

let erinnerungen = {
	data: {
		bearbeiterin: {
			okay: false,
			text: `Sie haben sich <a href="#" class="link-erinnerung" data-funktion="einstellungen-allgemeines">noch nicht registriert</a> (⇨ <i>APP &gt; Einstellungen &gt; Allgemeines &gt; BearbeiterIn</i>).`,
		},
		metadaten: {
			okay: false,
			text: `In den <a href="#" class="link-erinnerung" data-funktion="metadaten">Metadaten der Kartei</a> ist keine BearbeiterIn registriert (⇨ <i>Kartei &gt; Metadaten</i>).`,
		},
		redaktion: {
			okay: false,
			text: `Im <a href="#" class="link-erinnerung" data-funktion="redaktion">Redaktionsfenster</a> fehlen Angaben zu den BearbeiterInnen (⇨ <i>Kartei &gt; Redaktion</i>).`,
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
		// Icon umschalten
		erinnerungen.icon(!alles_okay);
	},
	// Anzeige des Icons umschalten
	//   an = Boolean
	icon (an) {
		let icon = document.getElementById("erinnerungen");
		if (an) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
		helfer.kopfIcon();
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
			let funktion = this.dataset.funktion;
			switch (funktion) {
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
		});
	},
};
