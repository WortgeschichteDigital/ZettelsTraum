"use strict";

const bedeutungenGerueste = {
  // Generator zur Erzeugung der nächsten ID
  makeId: null,
  nextId: 0,
  *idGenerator (id) {
    while (true) {
      yield id++;
    }
  },

  // Konfigurationsfenster öffnen
  //   evt = Event-Objekt
  //     (Klick-Event zum Öffnen des Fensters)
  oeffnen (evt) {
    evt.preventDefault();
    const fenster = document.getElementById("gerueste");
    overlay.oeffnen(fenster);
    // ggf. nächste ID ermitteln
    if (!bedeutungenGerueste.nextId) {
      bedeutungenGerueste.makeId = bedeutungenGerueste.idGenerator(1);
      do {
        bedeutungenGerueste.nextId = bedeutungenGerueste.makeId.next().value;
      } while (bedeutungen.data.gr[bedeutungenGerueste.nextId]);
    }
    // Tabelle aufbauen
    bedeutungenGerueste.aufbauen();
    // Maximalhöhe der Variantenliste festlegen
    helfer.elementMaxHeight({
      ele: document.getElementById("gerueste-cont-over"),
    });
  },

  // Tabelle mit den Bedeutungsgerüsten aufbauen
  aufbauen () {
    const cont = document.getElementById("gerueste-cont-over");
    cont.replaceChildren();
    // Tabelle aufbauen
    const table = document.createElement("table");
    cont.appendChild(table);
    Object.keys(bedeutungen.data.gr).forEach(function (i, n) {
      const tr = document.createElement("tr");
      table.appendChild(tr);
      tr.dataset.id = i;
      // ID
      let td = document.createElement("td");
      tr.appendChild(td);
      td.textContent = `Gerüst\u00A0${i}`;
      // Name
      td = document.createElement("td");
      tr.appendChild(td);
      let name = bedeutungen.data.gr[i].na;
      if (!name) {
        td.classList.add("leer");
        name = "kein Name";
      }
      td.textContent = name;
      bedeutungenGerueste.setName(td);
      // Aktion
      td = document.createElement("td");
      tr.appendChild(td);
      if (n === 0) { // Gerüst 1 darf nicht gelöscht werden
        td.textContent = "\u00A0";
        return;
      }
      const a = document.createElement("a");
      td.appendChild(a);
      a.classList.add("icon-link", "icon-loeschen");
      a.href = "#";
      a.textContent = "\u00A0";
      bedeutungenGerueste.del(a);
    });
    // neues Gerüst hinzufügen
    const tr = document.createElement("tr");
    table.appendChild(tr);
    let td = document.createElement("td");
    tr.appendChild(td);
    td.textContent = `Gerüst\u00A0${bedeutungenGerueste.nextId}`;
    td = document.createElement("td");
    tr.appendChild(td);
    const input = document.createElement("input");
    td.appendChild(input);
    input.type = "text";
    input.value = "";
    input.placeholder = "Name";
    input.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Enter") {
        bedeutungenGerueste.add();
      }
    });
    td = document.createElement("td");
    tr.appendChild(td);
    const a = document.createElement("a");
    td.appendChild(a);
    a.classList.add("icon-link", "icon-add");
    a.href = "#";
    a.textContent = "\u00A0";
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      bedeutungenGerueste.add();
    });
  },

  // Gerüst hinzufügen
  add () {
    const name = document.querySelector("#gerueste-cont tr:last-child input").value;
    const id = bedeutungenGerueste.nextId.toString(); // wichtig, dass es ein String ist!
    bedeutungen.data.gr[id] = {};
    bedeutungen.data.gr[id].na = helfer.textTrim(name, true);
    bedeutungen.data.gr[id].sl = 2;
    bedeutungen.data.gr[id].bd = [];
    bedeutungenGerueste.nextId = bedeutungenGerueste.makeId.next().value;
    bedeutungenGerueste.aufbauen();
    bedeutungen.bedeutungenGeaendert(true);
    bedeutungen.geruestWechseln(id);
  },

  // Gerüst löschen
  //   a = Element
  //     (Lösch-Link des Gerüsts)
  del (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const id = this.parentNode.parentNode.dataset.id;
      const name = bedeutungen.data.gr[id].na ? bedeutungen.data.gr[id].na : "";
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll <i>Gerüst\u00A0${id}${name ? ` (${name})` : ""}</i> wirklich gelöscht werden?`,
        callback: () => {
          if (!dialog.antwort) {
            return;
          }
          // betroffene Bedeutungen aus den Karteikarten zum Löschen vormerken
          for (const val of Object.values(data.ka)) {
            for (let j = 0, len = val.bd.length; j < len; j++) {
              if (val.bd[j].gr === id) {
                bedeutungen.aendernFuellen({
                  del: true,
                  gr: id,
                  id: val.bd[j].id,
                });
              }
            }
          }
          // zum Gerüst gehörende Wortinformationen zum Löschen vormerken
          bedeutungen.aendernFuellen({
            wi: true,
            gr: id,
          });
          // Gerüst löschen
          delete bedeutungen.data.gr[id];
          // Gerüst im Hauptfenster ggf. wechseln, auf jeden Fall die Überschrift neu aufbauen
          if (bedeutungen.data.gn === id) {
            bedeutungen.geruestWechseln("1");
          } else {
            bedeutungen.aufbauenH2();
          }
          // Fenster neu aufbauen
          bedeutungenGerueste.aufbauen();
          // Änderungsmarkierung setzen
          bedeutungen.bedeutungenGeaendert(true);
        },
      });
    });
  },

  // Name eines Gerüstes eingeben/ändern
  //   td = Element
  //     (die Tabellenzelle, in der der Name geändert werden soll)
  setName (td) {
    td.addEventListener("click", function () {
      if (this.firstChild.nodeType === 1) {
        return;
      }
      const id = this.parentNode.dataset.id;
      const input = document.createElement("input");
      input.type = "text";
      input.value = bedeutungen.data.gr[id].na;
      input.placeholder = "Name";
      this.replaceChild(input, this.firstChild);
      this.firstChild.focus();
      bedeutungenGerueste.writeNameListener(input);
    });
  },

  // Name aus dem Input-Feld übernehmen (Listener)
  //   input = Element
  //     (das aktive Input-Element)
  writeNameListener (input) {
    input.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Enter") {
        bedeutungenGerueste.writeName(this, true);
        return;
      }
      if (!tastatur.modifiers && evt.key === "Escape") {
        evt.stopPropagation();
        bedeutungenGerueste.writeName(this, false);
      }
    });
    input.addEventListener("blur", function () {
      setTimeout(() => {
        bedeutungenGerueste.writeName(this, false);
      }, 5); // das gibt sonst Probleme, wenn das Enter-Event bereits abgefeuert wurde
    });
  },

  // Name aus dem Input-Feld übernehmen (Listener)
  //   input = Element
  //     (das aktive Input-Element)
  //   write = Boolean
  //     (Wert soll übernommen werden
  writeName (input, write) {
    if (!input.parentNode) { // Input wurde schon entfernt (bei Enter wird auch der Blur-Event gefeuert)
      return;
    }
    const id = input.parentNode.parentNode.dataset.id;
    if (write) {
      bedeutungen.data.gr[id].na = helfer.textTrim(input.value, true);
      bedeutungen.aufbauenH2();
      bedeutungen.bedeutungenGeaendert(true);
    }
    let name = bedeutungen.data.gr[id].na;
    if (!name) {
      input.parentNode.classList.add("leer");
      name = "kein Name";
    } else {
      input.parentNode.classList.remove("leer");
    }
    const text = document.createTextNode(name);
    input.parentNode.replaceChild(text, input);
  },
};
