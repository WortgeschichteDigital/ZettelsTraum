"use strict";

let fehlerlog = {
  // Fehler ins Fenster eintragen
  //   fehler = Array
  //     (Liste der Fehler, die in dieser Session aufgetreten sind)
  fuellen (fehler) {
    let cont = document.querySelector("main"),
      reload = document.getElementById("reload"),
      copy = document.getElementById("kopieren");
    cont.replaceChildren();
    // keine Fehler
    if (!fehler.length) {
      let div = document.createElement("div");
      cont.appendChild(div);
      let p = document.createElement("p");
      div.appendChild(p);
      p.classList.add("keine");
      if (fehlerlog.uovo.count >= 5) {
        p.classList.add("uovo");
      }
      p.innerHTML = fehlerlog.uovoTesto();
      reload.classList.add("last");
      copy.classList.add("aus");
      return;
    }
    // Fehler
    reload.classList.remove("last");
    copy.classList.remove("aus");
    for (let n = fehler.length - 1; n >= 0; n--) {
      let i = fehler[n];
      let h2, p,
        div = document.createElement("div");
      cont.appendChild(div);
      // Zeit
      h2 = document.createElement("h2");
      div.appendChild(h2);
      h2.textContent = fehlerlog.datumFormat(i.time);
      // Kartei
      if (i.fileJs !== "main.js") {
        p = document.createElement("p");
        div.appendChild(p);
        if (!i.word) {
          p.textContent = "[leeres Hauptfenster]";
        } else {
          p.textContent = `${i.word} (${i.fileZtj})`;
        }
      }
      // Fehlermeldung
      p = document.createElement("p");
      div.appendChild(p);
      p.classList.add("obacht");
      p.innerHTML = i.message.replace(/\n/g, "<br>");
      // JS-Datei
      p = document.createElement("p");
      div.appendChild(p);
      p.classList.add("js");
      let textJs = i.fileJs.replace(/.+\/js\//, "");
      if (i.line) {
        textJs += `:${i.line}`;
        if (i.column) {
          textJs += `:${i.column}`;
        }
      }
      p.textContent = textJs;
    }
    // Versionen
    let div = document.createElement("div");
    cont.appendChild(div);
    let p = document.createElement("p");
    div.appendChild(p);
    p.classList.add("version");
    let daten = [{
      type: "App",
      data: appInfo.version,
    },
    {
      type: "Electron",
      data: process.versions.electron,
    },
    {
      type: "System",
      data: `${modules.os.type()} (${modules.os.arch()})`,
    }];
    for (let i = 0, len = daten.length; i < len; i++) {
      if (i > 0) {
        p.appendChild(document.createElement("br"));
      }
      let span = document.createElement("span");
      span.textContent = `${daten[i].type}: `;
      p.appendChild(span);
      p.appendChild(document.createTextNode(daten[i].data));
    }
  },

  // das übergebene Datum formatiert zurückgeben
  //   datum = String
  //     (im ISO 8601-Format)
  datumFormat (datum) {
    let wochentage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    let d = new Date(datum);
    return `${wochentage[d.getDay()]}, ${d.getDate()}. ${monate[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes()}:${d.getSeconds() < 10 ? `0${d.getSeconds()}` : d.getSeconds()} Uhr`;
  },

  // uovo di Pasqua
  uovo: {
    count: -1,
    texte: [
      "Nein, <i>keine Fehler.</i>",
      "Immer noch <i>keine Fehler.</i>",
      "Nein, nein. <i>Keine Fehler.</i>",
      "Wie gesagt: <i>Keine Fehler.</i>",
      "Immer noch <i>keine Fehler!</i>",
      "Lassen Sie mich raten! Sie suchen – <em>Fehler</em>.",
      "Soweit ich weiß: Hier gibt es gerade <em>keine Fehler.</em>",
      "Wie ich bereits anmerkte: <em>Keine Fehler!</em>",
      "Wirklich! <strong>Keine Fehler!</strong>",
      "<strong class='gesperrt'>Keine Fehler!</strong>",
      "<strong>Immer noch <span class='gesperrt'>keine Fehler!</span></strong>",
      "<q>Auch er bereute seine Fehler sehr<br>Ja, und bejammerte sein Unglück noch viel mehr.</q>",
      "Nichts zu bereuen, nichts zu bejammern, weil: <strong class='gesperrt'>Keine Fehler!</strong>",
      "Kennen Sie eigentlich das Sprechstück <i>Publikumsbeschimpfung</i>?",
      "Also: … <i>Ach</i>, dann doch lieber ein Gedicht. Denn:",
      `<q>Ach, noch in der letzten Stunde<br>
        werde ich verbindlich sein.<br>
        Klopft der Tod an meine Türe,<br>
        rufe ich geschwind: Herein!</q>`,
      `<q>Woran soll es gehn? Ans Sterben?<br>
        Hab ich zwar noch nie gemacht,<br>
        doch wir werd’n das Kind schon schaukeln –<br>
        na, das wäre ja gelacht!</q>`,
      `<q>Interessant so eine Sanduhr!<br>
        Ja, die halt ich gern mal fest.<br>
        Ach – und das ist Ihre Sense?<br>
        Und die gibt mir dann den Rest?</q>`,
      `<q>Wohin soll ich mich jetzt wenden?<br>
        Links? Von Ihnen aus gesehn?<br>
        Ach, von mir aus! Bis zur Grube?<br>
        Und wie soll es weitergehn?</q>`,
      `<q>Ja, die Uhr ist abgelaufen.<br>
        Wollen Sie die jetzt zurück?<br>
        Gibt’s die irgendwo zu kaufen?<br>
        Ein so ausgefall’nes Stück</q>`,
      `<q>Findet man nicht alle Tage,<br>
        womit ich nur sagen will<br>
        – ach! Ich soll hier nichts mehr sagen?<br>
        Geht in Ordnung! Bin schon</q>`,
    ],
  },
  uovoTesto () {
    let uovo = fehlerlog.uovo;
    if (uovo.count - 5 >= uovo.texte.length) {
      return " ";
    } else if (uovo.count >= 5) {
      return uovo.texte[uovo.count - 5];
    }
    return "<i>keine Fehler</i>";
  },
  async reload () {
    let fehler = await modules.ipc.invoke("fehler-senden");
    // Animation
    document.getElementById("reload").classList.add("rotieren-bitte");
    // uovo di Pasqua
    fehlerlog.uovo.count = fehler.length ? -1 : fehlerlog.uovo.count + 1;
    // Anzeige auffrischen
    fehlerlog.fuellen(fehler);
  },

  // Fehler aus dem Fenster kopieren
  //   a = Element
  //     (der Kopier-Link)
  kopieren (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      // Text holen und aufbereiten
      let text = document.querySelector("main").innerHTML;
      text = text.replace(/<\/(h2|p)>/g, "\n");
      text = text.replace(/<div>/g, "\n----------------------------------------\n\n");
      text = text.replace(/<br>/g, "\n");
      text = text.replace(/&nbsp;/g, " ");
      text = text.replace(/<.+?>/g, "");
      text = text.replace(/^[\n-]+/, "");
      // Text kopieren
      modules.clipboard.writeText(text);
      // Animation, die anzeigt, dass die Zwischenablage gefüllt wurde
      helfer.animation("zwischenablage");
    });
  },
};
