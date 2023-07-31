"use strict";

let bearbeiterin = {
  // Registrierungsfenster einblenden
  oeffnen () {
    // Fenster öffnen
    overlay.oeffnen(document.querySelector("#bearbeiterin"));
    // Fokus setzen
    const name = document.querySelector("#bearbeiterin-name");
    name.value = "";
    name.focus();
  },

  // Eingabe überprüfen und registrieren
  check () {
    // Name wurde erfolgreich eingetragen
    if (optionen.data.einstellungen.bearbeiterin) {
      return true;
    }
    // Überprüfung
    const name = document.querySelector("#bearbeiterin-name"),
      value = helfer.textTrim(name.value, true);
    if (!value) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie müssen Ihren Namen eingeben und dann auf <i>Registrieren</i> klicken.",
        callback: () => document.querySelector("#bearbeiterin-name").select(),
      });
      document.querySelector("#dialog").style.zIndex = 1e6 + 1;
      return false;
    }
    // Name eintragen
    document.querySelector("#einstellung-bearbeiterin").value = value;
    optionen.data.einstellungen.bearbeiterin = value;
    optionen.speichern();
    overlay.schliessen(document.querySelector("#bearbeiterin"));
    return true;
  },
};
