"use strict";

const meta = {
  // Zwischenspeicher für die aktuelle Version des Dateiformats
  // (data.ve speichert die interne Version der Daten; die ist nach
  // der Konversion des Formats natürlich immer die höchste; hier wird
  // gespeichert, welche Version die Kartei tatsächlich hat)
  ve: 0,

  // Metadaten-Fenster einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Metadaten</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("meta");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // Maximalhöhe des Fensters festlegen
    helfer.elementMaxHeight({
      ele: document.getElementById("meta-cont-over"),
    });
    // Fenster füllen
    document.getElementById("meta-dc").textContent = helfer.datumFormat(data.dc);
    const dm = document.getElementById("meta-dm");
    if (data.dm) {
      dm.textContent = helfer.datumFormat(data.dm);
      dm.classList.remove("kein-wert");
    } else {
      dm.textContent = "noch nicht gespeichert";
      dm.classList.add("kein-wert");
    }
    const speicherort = document.getElementById("meta-speicherort");
    let pfad = "noch nicht gespeichert";
    if (kartei.pfad) {
      pfad = `\u200E${kartei.pfad}\u200E`;
      // Vor und hinter der Pfad-Angabe steht das nicht druckbare Steuer-Zeichen
      // U+200E (left-to-right mark, HTML-Notation: &lrm;). Dadurch behebe ich
      // sowohl im Absatz als auch im Title-Tag Darstellungsprobleme, die dazu
      // führen, dass Slashes am Anfang oder Ende der Pfadangabe plötzlich
      // an der (scheinbar) falschen Seite stehen. Das hängt mit der BiDi Class
      // der Slashes zusammen. Anders ist der Wunsch, eine linke Textellipse zu
      // haben, derzeit offenbar nicht zu realisieren.
      speicherort.title = pfad;
      speicherort.classList.remove("kein-wert");
    } else {
      speicherort.classList.add("kein-wert");
    }
    speicherort.innerHTML = pfad;
    tooltip.init(speicherort.parentNode);
    document.getElementById("meta-ve").textContent = `Version ${meta.ve}`;
    document.getElementById("meta-re").textContent = data.re;
  },
};
