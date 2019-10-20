"use strict";

let erstSpeichern = {
	// speichert, ob gerade eine Überprüfung läuft
	// (sonst bekomme ich wiederholte Aufrufe, die die Callback-Funktion überschreiben)
	aktiv: false,
	// Funktion, die nach dem Check aufgerufen werden soll
	callback: null,
	// Funktionen, die von der Anfrage betroffen sein sollen
	scope: {},
	// startet den Überprüfungsvorgang
	//   fun = function
	//     (die Funktion, die nach der Überprüfung ausgeführt werden soll)
	//   scope = object
	//     (übergibt, welche Funktionen nicht überprüft werden sollen;
	//     standardmäßig werden alle überprüft)
	init (fun, scope = {}) {
		// läuft schon eine Überprüfung?
		if (erstSpeichern.aktiv) {
			return;
		}
		erstSpeichern.aktiv = true;
		// Callback und Scope vorbereiten
		erstSpeichern.callback = fun;
		erstSpeichern.scope = {
			notizen: true,
			tagger: true,
			bedeutungen: true,
			beleg: true,
			kartei: false,
		};
		for (let i in scope) {
			if (!scope.hasOwnProperty(i)) {
				continue;
			}
			erstSpeichern.scope[i] = scope[i];
		}
		// Check-Kaskade starten
		erstSpeichern.check();
	},
	// überprüft, ob Änderungen noch nicht gespeichert wurden
	check () {
		if (erstSpeichern.scope.notizen && notizen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort && notizen.speichern()) {
					erstSpeichern.check();
				} else if (dialog.antwort === false) {
					notizen.notizenGeaendert(false);
					erstSpeichern.check();
				} else {
					erstSpeichern.aktiv = false;
					setTimeout(() => {
						if (overlay.oben() === "notizen") {
							document.getElementById("notizen-feld").focus();
						}
					}, 200); // die Zeit braucht der Dialog, um ausgeblendet zu werden
				}
			});
			dialog.text("Die Notizen wurden geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (erstSpeichern.scope.tagger && tagger.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort && tagger.speichern()) {
					if (optionen.data.einstellungen["tagger-schliessen"]) {
						setTimeout(() => erstSpeichern.check(), 200); // sonst gibt es Probleme, wenn das Bedeutungsgerüst auch noch gespeichert werden muss und eine Nachfrage erforderlich ist
					} else {
						erstSpeichern.check();
					}
				} else if (dialog.antwort === false) {
					tagger.taggerGeaendert(false);
					erstSpeichern.check();
				} else {
					erstSpeichern.aktiv = false;
					setTimeout(() => {
						if (overlay.oben() === "tagger") {
							let feld = document.querySelector("#tagger-typen .dropdown-feld");
							if (feld) {
								feld.focus();
							}
						}
					}, 200); // die Zeit braucht der Dialog, um ausgeblendet zu werden
				}
			});
			dialog.text("Die Tags wurden geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (erstSpeichern.scope.bedeutungen && bedeutungen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort && bedeutungen.speichern()) {
					erstSpeichern.check();
				} else if (dialog.antwort === false) {
					bedeutungen.bedeutungenGeaendert(false);
					erstSpeichern.check();
				} else {
					erstSpeichern.aktiv = false;
				}
			});
			dialog.text("Das Bedeutungsgerüst wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (erstSpeichern.scope.beleg && beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort && beleg.aktionSpeichern()) {
					erstSpeichern.check();
				} else if (dialog.antwort === false) {
					beleg.belegGeaendert(false);
					erstSpeichern.check();
				} else {
					erstSpeichern.aktiv = false;
				}
			});
			dialog.text("Die Karteikarte wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (erstSpeichern.scope.kartei && kartei.geaendert) {
			dialog.oeffnen("confirm", async function() {
				if (dialog.antwort) {
					const resultat = await kartei.speichern(false);
					if (!resultat) {
						console.log("Speichern hat nicht geklappt!"); // TODO entfernen
						erstSpeichern.aktiv = false;
						return; // Speichern ist gescheitert, oder erfordert Reaktion des Users => Callback nicht ausführen
					}
					erstSpeichern.check();
				} else if (dialog.antwort === false) {
					kartei.karteiGeaendert(false);
					erstSpeichern.check();
				} else {
					erstSpeichern.aktiv = false;
				}
			});
			dialog.text("Die Kartei wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		}
		erstSpeichern.aktiv = false; // muss vor dem Callback stehen, weil der wieder zu Aufrufen dieser Funktion führen kann; und die muss dann unbedingt durchlaufen, damit der neue Callback auch aufgerufen wird
		erstSpeichern.callback();
	},
};
