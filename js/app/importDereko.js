"use strict";

const importDereko = {
  // Abstraktion der ID eines DeReKo-Belegs
  idForm: "[a-zA-Z0-9]+?\\/[a-zA-Z0-9]+?\\.[0-9]+?\\s",


  // Metadaten parsen
  //   meta = string
  //     (Metadaten wurden bereits in importShared.detectType() in von den Belegen getrennt)
  meta (str) {
    const daten = [ "Datum", "Archiv", "Korpus", "Suchanfrage" ];
    for (const d of daten) {
      const reg = new RegExp(`(${d})\\s*:(.+)`);
      const m = str.match(reg);
      if (m?.length === 3) {
        importShared.fileData.meta += `\n${m[1]}:${m[2]}`;
      }
    }
  },

  // Belege parsen
  //   str = string
  //     (Belege wurden bereits in importShared.detectType() in von den Metadaten getrennt)
  belege (str) {
    const ta = document.createElement("textarea");
    const regQuVor = new RegExp(`^(${importDereko.idForm})(.+)`);
    const regQuNach = new RegExp(`\\s\\((${importDereko.idForm})(.+)\\)$`);
    const regQuNachId = new RegExp(`\\s\\(${importDereko.idForm}`);
    let id = "";
    let quelle = "";
    let beleg = [];

    // Zeilen analysieren
    for (let zeile of str.split("\n")) {
      // Leerzeile
      if (!zeile) {
        pushBeleg();
        continue;
      }

      // Enteties auflösen
      ta.innerHTML = zeile;
      zeile = ta.value;

      // vorangestellte Quelle
      if (regQuVor.test(zeile)) {
        const match = zeile.match(regQuVor);
        id = match[1];
        quelle = match[2];
        continue;
      }

      // nachgestellte Quelle
      if (regQuNach.test(zeile)) {
        const match = zeile.match(regQuNach);
        id = match[1];
        quelle = match[2];
        zeile = zeile.split(regQuNachId)[0];
      }

      // Fettungen entfernen
      zeile = zeile.replace(/<B>|<\/B?>/g, "").trim();
      beleg.push(zeile);
    }
    pushBeleg();

    // Abgleich mit der alten Datei
    importShared.fileDataSchonImportiert();

    // Beleg pushen
    function pushBeleg () {
      if (!quelle || !beleg.length) {
        return;
      }

      // Datensatz erzeugen
      importShared.fileData.data.push(importShared.importObject());
      const ds = importShared.fileData.data.at(-1).ds;

      // Autor
      ds.au = "N.\u00A0N.";

      // Beleg (Schnitt, Importtyp, Original)
      ds.bs = beleg.join("\n\n").normalize("NFC");
      ds.bi = "plain-dereko";
      ds.bx = `${id}${quelle}\n\n${beleg.join("\n")}`;

      // Korpus
      ds.kr = "IDS";

      // Notizen
      ds.no = importShared.fileData.meta;

      // Quelle
      ds.qu = quelle.replace(/\s\[Ausführliche Zitierung nicht verfügbar\]/, "").normalize("NFC");

      // Autor aus Quelle auslesen
      const autor = quelle.split(":");
      const kommata = autor[0].match(/,/g);
      const illegal = /[0-9.;!?]/.test(autor[0]);
      if (!illegal && (/[^\s]+/.test(autor[0]) || kommata <= 1)) {
        ds.au = autor[0];
      }

      // Datum aus Quelle auslesen
      ds.da = helferXml.datum(quelle, false, true);

      // Textsorte aus Quelle auslesen
      if (/\[Tageszeitung\]/.test(quelle)) {
        ds.ts = "Zeitung: Tageszeitung";
        ds.qu = quelle.replace(/,*\s*\[Tageszeitung\]/g, "").normalize("NFC");
      }

      // ggf. Punkt ergänzen
      if (!/\.$/.test(ds.qu)) {
        ds.qu += ".";
      }

      // ggf. an Stylesheet anpassen
      ds.qu = importShared.changeTitleStyle(ds.qu);

      // Beleg-Daten zurücksetzen
      id = "";
      quelle = "";
      beleg = [];
    }
  },
};
