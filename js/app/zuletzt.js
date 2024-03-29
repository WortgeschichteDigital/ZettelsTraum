"use strict";

const zuletzt = {
  // baut die Liste auf
  aufbauen () {
    const cont = document.getElementById("start-zuletzt");
    // Dateiliste vorhanden?
    if (!optionen.data.zuletzt.length) {
      cont.classList.add("aus");
      return;
    }
    cont.classList.remove("aus");
    // Dateiliste leeren
    const liste = document.getElementById("start-liste");
    liste.replaceChildren();
    // Dateiliste aufbauen
    for (let i = 0, len = optionen.data.zuletzt.length; i < len; i++) {
      const datei = optionen.data.zuletzt[i];
      const name = datei.match(/([^/\\]+)\.[a-z]+$/)[1];
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.classList.add("start-datei"); // dient zur Identifizierung für Rechtsklicks
      a.dataset.datei = datei;
      // Name und Link
      let span = document.createElement("span");
      span.href = "#";
      span.textContent = name;
      a.appendChild(span);
      // Dateiname
      span = document.createElement("span");
      span.textContent = datei;
      a.appendChild(span);
      // Markierung, dass die Datei verschwunden ist
      if (zuletzt.verschwunden.includes(datei)) {
        a.appendChild(zuletzt.verschwundenImg());
      }
      // Listenpunkt einhängen
      zuletzt.karteiOeffnen(a);
      li.appendChild(a);
      liste.appendChild(li);
    }
  },

  // entfernt eine Kartei
  //   datei = String
  //     (Datei, die aus optionen.data.zuletzt entfernt werden soll)
  karteiEntfernen (datei) {
    const idx = optionen.data.zuletzt.indexOf(datei);
    optionen.data.zuletzt.splice(idx, 1);
    optionen.speichern();
    zuletzt.aufbauen();
  },

  // öffnet eine Kartei
  //   a = Element
  //     (Link zur Datei, die geöffent werden soll)
  karteiOeffnen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (evt.detail > 1) { // Doppelklicks abfangen
        return;
      }
      kartei.oeffnenEinlesen(this.dataset.datei);
    });
  },

  // Liste der zuletzt verwendeten Karteien ergänzen
  aendern () {
    // Datei ggf. entfernen (falls an einer anderen Stelle schon vorhanden)
    const karteien = optionen.data.zuletzt;
    if (karteien.includes(kartei.pfad)) {
      karteien.splice(karteien.indexOf(kartei.pfad), 1);
    }
    // Datei vorne anhängen
    karteien.unshift(kartei.pfad);
    // Listenlänge begrenzen
    const maxLen = parseInt(optionen.data.einstellungen.zuletzt, 10);
    while (karteien.length > maxLen) {
      karteien.pop();
    }
    // Optionen speichern
    optionen.speichern();
  },

  // Liste der zuletzt verwendeten Karteien updaten (angestoßen durch Main-Prozess)
  //   karteien = Array
  //     (Liste der zuletzt verwendeten Karteien)
  update (karteien) {
    optionen.data.zuletzt = karteien;
    if (!document.getElementById("start").classList.contains("aus")) {
      zuletzt.aufbauen();
    }
  },

  // speichert Karteien, die verschwunden sind
  verschwunden: [],

  // markiert Karteien auf der Startseite als verschwunden
  //   verschwunden = Array
  //     (Liste der Karteien, die nicht mehr gefunden wurden)
  verschwundenUpdate (verschwunden) {
    zuletzt.verschwunden = verschwunden;
    document.querySelectorAll("#start-liste a").forEach(i => {
      const datei = i.dataset.datei;
      if (verschwunden.includes(datei)) {
        i.appendChild(zuletzt.verschwundenImg());
      } else if (i.querySelector("img")) {
        i.removeChild(i.querySelector("img"));
      }
    });
  },

  // erzeugt ein Image, das eine Kartei als verschwunden markiert
  verschwundenImg () {
    const img = document.createElement("img");
    img.src = "img/x-dick-rot.svg";
    img.width = "24";
    img.height = "24";
    return img;
  },

  // eine verschwundene Kartei wurde wiedergefunden
  //   datei = String
  //     (Kartei, die gerade geöffnet oder gespeichert wurde)
  verschwundenCheck (datei) {
    if (!zuletzt.verschwunden.includes(datei)) {
      return;
    }
    zuletzt.verschwunden.splice(datei.indexOf(datei), 1);
    modules.ipc.invoke("optionen-zuletzt-wiedergefunden", zuletzt.verschwunden);
  },
};
