"use strict";

let kopf = {
  // Anzeige der Icon-Leiste im Kopf des Hauptfensters regeln
  icons () {
    // Erinnerungen
    kopf.iconErinnerungen();
    // Karteiordner
    kopf.iconOrdner();
    // Redaktion
    kopf.iconRedaktion();
    // Notizen
    kopf.iconNotizen();
    // Lexika
    kopf.iconLexika();
    // letzten sichtbaren Icon-Link markieren
    let kopfLeiste = document.getElementById("kopf-icons"),
      last = kopfLeiste.querySelector(".last");
    if (last) {
      last.classList.remove("last");
    }
    let aAn = kopfLeiste.querySelectorAll("a:not(.aus)");
    if (aAn.length) {
      aAn[aAn.length - 1].classList.add("last");
    }
    // ggf. die Anhänge-Icons anzeigen
    let anhaenge = document.getElementById("kartei-anhaenge");
    if (optionen.data.einstellungen["kopf-icon-anhaenge"] &&
        anhaenge.hasChildNodes()) {
      anhaenge.classList.remove("aus");
      if (aAn.length) {
        anhaenge.classList.add("not-first");
      } else {
        anhaenge.classList.remove("not-first");
      }
    } else {
      anhaenge.classList.add("aus");
    }
    // Icon-Leiste ggf. komplett ausschalten
    if (!aAn.length && !anhaenge.hasChildNodes()) {
      kopfLeiste.classList.add("aus");
    } else {
      kopfLeiste.classList.remove("aus");
    }
  },
  // Erinnerungen-Icon
  iconErinnerungen () {
    let icon = document.getElementById("erinnerungen-icon");
    if (optionen.data.einstellungen["kopf-icon-erinnerungen"] &&
        !erinnerungen.allesOkay) {
      icon.classList.remove("aus");
    } else {
      icon.classList.add("aus");
    }
  },
  // Karteiordner-Icon
  iconOrdner () {
    let iconOrdner = document.getElementById("ordner-icon");
    if (optionen.data.einstellungen["kopf-icon-ordner"] &&
        kartei.pfad) {
      iconOrdner.classList.remove("aus");
    } else {
      iconOrdner.classList.add("aus");
    }
  },
  // Redaktion-Icon
  iconRedaktion () {
    let iconRedaktion = document.getElementById("redaktion-icon"),
      er = redaktion.naechstesEreignis(false);
    if (optionen.data.einstellungen["kopf-icon-redaktion"] &&
        kartei.wort) {
      if (er.abgeschlossen) {
        iconRedaktion.title = er.title[0];
      } else {
        iconRedaktion.title = `Nächstes Redaktionsereignis: ${er.title[1]}`;
      }
      kopf.iconRedaktionSvg(er.abgeschlossen);
      iconRedaktion.classList.remove("aus");
    } else {
      iconRedaktion.classList.add("aus");
    }
    tooltip.init(iconRedaktion.parentNode);
  },
  // Redaktion-Icon ändern
  //   abgeschlossen = Boolean
  //     (die Redaktion ist abgeschlossen)
  iconRedaktionSvg (abgeschlossen) {
    let svg = document.querySelector("#redaktion-icon svg");
    while (svg.hasChildNodes()) {
      svg.removeChild(svg.lastChild);
    }
    if (abgeschlossen) {
      let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svg.appendChild(path);
      path.setAttribute("d", "m10 6c-1.6569 0-3 1.3432-3 3s1.3431 3 3 3 3-1.3432 3-3-1.3431-3-3-3zm4.9961 1.9453 0.003906 0.0039063c-0.38828 0-0.75327 0.089302-1.084 0.23828 0.0546 0.26205 0.083984 0.53309 0.083984 0.81055 0 1.1021-0.4542 2.1042-1.1836 2.8301 0.46 0.7 1.2597 1.1699 2.1797 1.1699 1.4327 0 2.5938-1.1303 2.5938-2.5254 0-1.3951-1.161-2.5273-2.5938-2.5273zm-4.9961 6.0508c-6.0002 0.0034-6 4.0039-6 4.0039v1h2.9512c-0.75297-1.0849-0.64301-2.5113 0.33789-3.4922 1.1099-1.1098 2.7944-1.1101 3.9043 0l1.6562 1.6562 1.6719-1.9121c-0.87972-0.69874-2.2822-1.2557-4.5215-1.252v-0.003906zm5 0.001953v0.001953c-0.1961 0-0.37171 0.012584-0.55273 0.021484 0.26649 0.15268 0.50218 0.31794 0.7207 0.49024l0.42969-0.49024c-0.19444-0.010333-0.38562-0.023437-0.59766-0.023437zm5 3.291-0.62109 0.70898h0.62109v-0.70898z");
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svg.appendChild(path);
      path.setAttribute("d", "m21.753 10.017c-0.1193-0.022414-0.24318-0.02371-0.37053 0.0024-0.2714 0.05865-0.5215 0.21145-0.69746 0.42623l-7.7884 8.912-2.7899-2.7899c-0.46663-0.46669-1.3157-0.46665-1.7824 0-0.46665 0.46666-0.46669 1.3157 0 1.7824l3.7198 3.7198 0.9687 0.92995 0.85246-1.0074 8.6796-9.9195c0.61562-0.6702 0.04315-1.8992-0.79191-2.0561z");
      path.setAttribute("fill", "#c0f3dd");
    } else {
      let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svg.appendChild(path);
      path.setAttribute("transform", "translate(4 4)");
      path.setAttribute("d", "m6 2c-1.6569 0-3 1.3432-3 3s1.3431 3 3 3 3-1.3432 3-3-1.3431-3-3-3zm4.9961 1.9453 0.003906 0.0039063c-0.38828 0-0.75329 0.089301-1.084 0.23828 0.0546 0.26205 0.083984 0.53309 0.083984 0.81055 0 1.1021-0.45421 2.1042-1.1836 2.8301 0.46 0.7 1.2597 1.1699 2.1797 1.1699 1.4327 0 2.5938-1.1303 2.5938-2.5254 0-1.3951-1.161-2.5273-2.5938-2.5273zm-4.9961 6.0508c-6.0002 0.0034-6 4.0039-6 4.0039v1h12v-1s0-4.01-6-4v-0.0039062zm5 0.0019531v0.0019531c-0.1961 0-0.37171 0.012584-0.55273 0.021484 0.69756 0.39966 1.2291 0.87707 1.6035 1.377 0.94 1.26 0.94922 2.5996 0.94922 2.5996h3v-1s0-3-5-3z");
    }
  },
  // Notizen-Icon
  iconNotizen () {
    let icon = document.getElementById("notizen-icon");
    if (optionen.data.einstellungen["kopf-icon-notizen"] &&
        data.no) {
      icon.classList.remove("aus");
    } else {
      icon.classList.add("aus");
    }
  },
  // Lexika-Icon
  iconLexika () {
    let icon = document.getElementById("lexika-icon");
    if (optionen.data.einstellungen["kopf-icon-lexika"] &&
        data.le &&
        data.le.length) {
      icon.classList.remove("aus");
    } else {
      icon.classList.add("aus");
    }
  },
};
