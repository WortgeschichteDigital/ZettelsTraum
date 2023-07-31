"use strict";

const bedeutungen = {
  // enthält die übergebenen Daten
  data: {},

  // ID des aktuellen Gerüsts
  geruest: "",

  // Anzeige mit den gelieferten Daten aufbereiten
  aufbauen () {
    // Wort eintragen
    document.querySelector("h1").textContent = bedeutungen.data.wort;
    // ggf. Gerüstnummer zwischenspeichern
    if (!bedeutungen.geruest) {
      bedeutungen.geruest = bedeutungen.data.bd.gn;
    }
    // Content leeren
    const cont = document.getElementById("bd-win-cont");
    cont.replaceChildren();
    // Details zum Bedeutungsgerüst in die Überschrift eintragen
    let detail = "";
    if (Object.keys(bedeutungen.data.bd.gr).length > 1) {
      detail = `\u00A0${bedeutungen.geruest}`;
    }
    if (bedeutungen.data.bd.gr[bedeutungen.geruest].na) {
      detail += `\u00A0(${bedeutungen.data.bd.gr[bedeutungen.geruest].na})`;
    }
    document.getElementById("bd-win-geruest-detail").textContent = detail;
    // Gerüst-Nummer in Dropdown-Feld
    document.getElementById("bd-win-gerueste").value = `Gerüst ${bedeutungen.geruest}`;
    // Sind überhaupt Bedeutungen vorhanden?
    const bd = bedeutungen.data.bd.gr[bedeutungen.geruest].bd;
    if (!bd.length) {
      const p = document.createElement("p");
      p.classList.add("bd-win-keine");
      p.textContent = "keine Bedeutungen";
      cont.appendChild(p);
      return;
    }
    // Bedeutungen aufbauen
    const icons = [ "icon-add", "icon-remove" ];
    const table = document.createElement("table");
    cont.appendChild(table);
    for (let i = 0, len = bd.length; i < len; i++) {
      const tr = document.createElement("tr");
      table.appendChild(tr);
      // Zellen erzeugen
      for (let j = 0; j < 3; j++) {
        const td = document.createElement("td");
        tr.appendChild(td);
      }
      // Icons erzeugen
      for (let j = 0; j < 2; j++) {
        const a = document.createElement("a");
        tr.childNodes[j].appendChild(a);
        a.classList.add("icon-link", icons[j]);
        a.dataset.id = bd[i].id;
        a.href = "#";
        if (j === 0) {
          a.title = "Bedeutung eintragen";
          a.dataset.eintragen = "true";
          bedeutungen.umtragen(a);
        } else {
          a.title = "Bedeutung entfernen";
          a.dataset.eintragen = "false";
          bedeutungen.umtragen(a);
        }
      }
      // Schachteln erzeugen
      const frag = document.createDocumentFragment();
      let schachtel = frag;
      for (let j = 0, len = bd[i].bd.length; j < len; j++) {
        const div = document.createElement("div");
        schachtel.appendChild(div);
        div.classList.add("bd-win-baum");
        schachtel = div;
      }
      // Absatz mit Zählung und Bedeutung
      const p = document.createElement("p");
      schachtel.appendChild(p);
      p.dataset.id = bd[i].id;
      p.dataset.eintragen = "true";
      p.title = "Bedeutung eintragen";
      bedeutungen.umtragen(p);
      // Zählung
      const b = document.createElement("b");
      p.appendChild(b);
      b.classList.add("zaehlung");
      b.textContent = bd[i].za;
      // Bedeutung
      const span = document.createElement("span");
      p.appendChild(span);
      span.innerHTML = bd[i].bd[bd[i].bd.length - 1];
      // Fragment einhängen
      tr.lastChild.appendChild(frag);
    }
    tooltip.init(cont);
  },

  // Bedeutungsbaum drucken
  drucken () {
    modules.ipc.sendTo(bedeutungen.data.contentsId, "bedeutungen-fenster-drucken", bedeutungen.geruest);
  },

  // Bedeutung in Formular/Belegliste des Hauptfensters umtragen (also ein- oder austragen)
  //   ele = Element
  //     (angeklickte Bedeutung oder angeklicktes Add-Icon)
  umtragen (ele) {
    ele.addEventListener("click", function (evt) {
      evt.preventDefault();
      const id = parseInt(this.dataset.id, 10);
      const eintragen = this.dataset.eintragen === "true";
      modules.ipc.sendTo(bedeutungen.data.contentsId, "bedeutungen-fenster-umtragen", {
        gr: bedeutungen.geruest,
        id,
      }, eintragen);
    });
  },
};
