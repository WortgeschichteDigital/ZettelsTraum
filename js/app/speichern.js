"use strict";

let speichern = {
  // speichert, ob gerade eine Überprüfung läuft
  // (sonst bekomme ich wiederholte Aufrufe, die die Callback-Funktion überschreiben)
  checkAktiv: false,

  // Funktion, die nach dem Check aufgerufen werden soll
  checkCallback: null,

  // Funktionen, die von der Anfrage betroffen sein sollen
  checkScope: {},

  // startet den Überprüfungsvorgang
  //   fun = function
  //     (die Funktion, die nach der Überprüfung ausgeführt werden soll)
  //   scope = object
  //     (übergibt, welche Funktionen nicht überprüft werden sollen;
  //     standardmäßig werden alle überprüft)
  checkInit (fun, scope = {}) {
    // läuft schon eine Überprüfung?
    if (speichern.checkAktiv) {
      return;
    }
    speichern.checkAktiv = true;
    // Callback und Scope vorbereiten
    speichern.checkCallback = fun;
    speichern.checkScope = {
      notizen: true,
      literatur: true,
      tagger: true,
      bedeutungen: true,
      beleg: true,
      kartei: false,
    };
    for (let i in scope) {
      if (!scope.hasOwnProperty(i)) {
        continue;
      }
      speichern.checkScope[i] = scope[i];
    }
    // Check-Kaskade starten
    speichern.check();
  },

  // überprüft, ob Änderungen noch nicht gespeichert wurden
  check () {
    if (speichern.checkScope.notizen && notizen.geaendert) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Die Notizen wurden geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?",
        callback: () => {
          if (dialog.antwort && notizen.speichern()) {
            if (optionen.data.einstellungen["notizen-schliessen"]) {
              setTimeout(() => speichern.check(), 200); // bei Overlay-Fenstern wichtig, sonst gibt es Probleme mit den folgenden Operationen
            } else {
              speichern.check();
            }
          } else if (dialog.antwort === false) {
            notizen.notizenGeaendert(false);
            speichern.check();
          } else {
            speichern.checkAktiv = false;
            setTimeout(() => {
              if (overlay.oben() === "notizen") {
                document.getElementById("notizen-feld").focus();
              }
            }, 200); // die Zeit braucht der Dialog, um ausgeblendet zu werden
          }
        },
      });
      return;
    } else if (speichern.checkScope.literatur &&
        (redLit.eingabe.changed || redLit.db.changed)) {
      // Da die Literaturdatenbank nicht in der Kartei gespeichert wird, muss
      // die gewünschte Aktion in diesem Fall komplett abgebrochen werden.
      speichern.checkAktiv = false;
      setTimeout(() => {
        // Fenster nach oben holen
        overlay.oeffnen(document.getElementById("red-lit"));
        // Sicherheitsfrage triggern
        redLit.dbCheck(() => {});
      }, 200); // die Zeit braucht der Dialog, um ausgeblendet zu werden
      return;
    } else if (speichern.checkScope.tagger && tagger.geaendert) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Die Tags wurden geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?",
        callback: () => {
          if (dialog.antwort && tagger.speichern()) {
            if (optionen.data.einstellungen["tagger-schliessen"]) {
              setTimeout(() => speichern.check(), 200); // bei Overlay-Fenstern wichtig, sonst gibt es Probleme mit den folgenden Operationen
            } else {
              speichern.check();
            }
          } else if (dialog.antwort === false) {
            tagger.taggerGeaendert(false);
            speichern.check();
          } else {
            speichern.checkAktiv = false;
            setTimeout(() => {
              if (overlay.oben() === "tagger") {
                let feld = document.querySelector("#tagger-typen .dropdown-feld");
                if (feld) {
                  feld.focus();
                }
              }
            }, 200); // die Zeit braucht der Dialog, um ausgeblendet zu werden
          }
        },
      });
      return;
    } else if (speichern.checkScope.bedeutungen && bedeutungen.geaendert) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Das Bedeutungsgerüst wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?",
        callback: () => {
          if (dialog.antwort && bedeutungen.speichern()) {
            speichern.check();
          } else if (dialog.antwort === false) {
            bedeutungen.bedeutungenGeaendert(false);
            speichern.check();
          } else {
            speichern.checkAktiv = false;
          }
        },
      });
      return;
    } else if (speichern.checkScope.beleg && beleg.geaendert) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Die Karteikarte wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?",
        callback: () => {
          if (dialog.antwort && beleg.aktionSpeichern()) {
            speichern.check();
          } else if (dialog.antwort === false) {
            beleg.belegGeaendert(false);
            speichern.check();
          } else {
            speichern.checkAktiv = false;
          }
        },
      });
      return;
    } else if (speichern.checkScope.kartei && kartei.geaendert) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Die Kartei wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?",
        callback: async () => {
          if (dialog.antwort) {
            const resultat = await kartei.speichern(false);
            if (!resultat) {
              speichern.checkAktiv = false;
              return; // Speichern ist gescheitert, oder erfordert Reaktion des Users => Callback nicht ausführen
            }
            speichern.check();
          } else if (dialog.antwort === false) {
            kartei.karteiGeaendert(false);
            speichern.check();
          } else {
            speichern.checkAktiv = false;
          }
        },
      });
      return;
    }
    speichern.checkAktiv = false; // muss vor dem Callback stehen, weil der wieder zu Aufrufen dieser Funktion führen kann; und die muss dann unbedingt durchlaufen, damit der neue Callback auch aufgerufen wird
    speichern.checkCallback();
  },

  // Verteilerfunktion für "Kartei > Speichern" bzw. den Tastaturbefehl Strg + S
  // (es gibt drei verschiedene Verhaltensweisen des Befehls)
  kaskade () {
    // ggf. das Speichern in der Literaturdatenbank anstoßen
    if (overlay.oben() === "red-lit") {
      redLit.speichern();
      return;
    }
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Speichern</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Option 3: nur Kartei speichern
    // (speichert Kartei, selbst wenn Änderungen in anderen Funktionen noch nicht übernommen)
    if (optionen.data.einstellungen.speichern === "3") {
      if (kartei.geaendert) {
        kartei.speichern(false);
      }
      return;
    }
    // Option 2: nur aktive Funktion speichern
    // (nur Änderungen in der aktuell sichtbaren Funktion speichern)
    if (optionen.data.einstellungen.speichern === "2") {
      const oben = overlay.oben();
      if (oben === "notizen" && notizen.geaendert) {
        notizen.speichern();
      } else if (oben === "tagger" && tagger.geaendert) {
        tagger.speichern();
      } else if (!oben && beleg.geaendert) {
        beleg.aktionSpeichern();
      } else if (!oben && bedeutungen.geaendert) {
        bedeutungen.speichern();
      } else if (!oben && kartei.geaendert &&
          helfer.hauptfunktion === "liste") {
        kartei.speichern(false);
      }
      return;
    }
    // Option 1: Speicherkaskade anstoßen
    // (versuchen, alle ausstehenden Änderungen nacheinander zu übernehmen)
    if (notizen.geaendert && !notizen.speichern()) {
      return; // beim Speichern der Notizen ist etwas schiefgelaufen
    }
    if (beleg.geaendert && !beleg.aktionSpeichern()) {
      return; // beim Speichern der Karteikarte ist etwas schiefgelaufen
    }
    if (tagger.geaendert && !tagger.speichern()) {
      return; // beim Speichern der Tags ist etwas schiefgelaufen
    }
    if (bedeutungen.geaendert && !bedeutungen.speichern()) {
      return; // beim Speichern der Bedeutungen ist etwas schiefgelaufen (kann derzeit [2019-10-20] gar nicht sein; rein präventive Maßnahme)
    }
    if (kartei.geaendert) {
      kartei.speichern(false);
    }
  },
};
