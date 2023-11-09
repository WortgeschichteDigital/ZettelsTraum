"use strict";

const importURL = {
  // Import aus einer URL starten
  async startImport () {
    // Formular einlesen
    const formData = importURL.getFormData();
    if (!formData) {
      return false;
    }

    // URL-Daten ermitteln
    const urlData = importURL.getURLData(formData);
    if (!urlData.url) {
      importURL.error([ "Beim Einlesen des Formulars", "Download-URL konnte nicht ermittelt werden" ]);
      return false;
    }

    // Daten herunterladen
    const data = await importURL.getData(urlData, formData);
    if (!data) {
      return false;
    }

    // Daten parsen
    const typeData = importShared.detectType(data);

    // Daten zurückgeben
    return {
      formData,
      urlData,
      typeData,
    };
  },

  // Formular einlesen
  getFormData () {
    // URL einlesen
    const feld = document.getElementById("beleg-import-feld");
    const url = feld.value.trim();
    const resource = importShared.isKnownURL(url);
    if (!resource) {
      const fehler = resource === null ? "URL nicht valide" : "URL aus unbekannter Online-Ressource";
      importURL.error([ "Beim Einlesen des Formulars", fehler ]);
      return false;
    }

    // Seitenfelder einlesen
    const von = document.getElementById("beleg-import-von");
    const bis = document.getElementById("beleg-import-bis");
    for (const i of [ von, bis ]) {
      helfer.inputNumber(i);
    }
    const pageFrom = parseInt(von.value, 10);
    let pageTo = parseInt(bis.value, 10);

    // automatische Fehlerkorrektur bei den Seitenangaben
    if (pageFrom && pageTo <= pageFrom) {
      pageTo = pageFrom + 1;
      bis.value = pageTo;
    }

    // Daten zurückgeben
    return {
      resource,
      url,
      von: pageFrom,
      bis: pageTo,
    }
  },

  // URL-Daten ermitteln
  //   formData = object
  //     (formData.resource, formData.url, formData.von, formData.bis)
  getURLData (formData) {
    // direkter Link zur XML-Datei
    const result = {
      url: "",
      id: "",
    };
    const parsedURL = new URL(formData.url);
    if (formData.resource.xmlPathReg.test(parsedURL.pathname)) {
      result.url = parsedURL.href;
    }

    // Download-URL ermitteln
    if (formData.resource.type === "tei-dta") {
      const titleId = importTEI.dtaGetTitleId(parsedURL);
      result.id = titleId;
      if (!result.url) {
        result.url = formData.resource.xmlPath + titleId;
      }
    } else if (formData.resource.type === "tei-dingler") {
      const titleId = importTEI.dinglerGetTitleId(parsedURL);
      result.id = titleId;
      if (!result.url) {
        result.url = formData.resource.xmlPath + titleId + ".xml";
      }
    }

    // ID ggf. generisch füllen
    if (!result.id) {
      result.id = result.url;
    }

    return result;
  },

  // Daten herunterladen
  //   urlData = object
  //     (urlData.titleId, urlData.url)
  //   formData = object
  //     (formData.resource, formData.url, formData.von, formData.bis)
  async getData (urlData, formData) {
    // Anfrage an History-Cache
    const cache = await modules.ipc.invoke("downloads-cache-get", urlData.id);
    if (cache) {
      return cache.text;
    }

    // Daten herunterladen
    const response = await helfer.fetchURL(urlData.url);

    // Fehlerbehandlung
    const message = "Beim Download der Textdaten " + formData.resource.desc;
    if (response.fehler) {
      // Download-Fehler
      importURL.error([ message, `Download: ${response.fehler}` ]);
      return false;
    } else if (!response.text) {
      // keine Textdaten
      importURL.error([ message, "Download: keine Daten empfangen" ]);
      return false;
    } else if (formData.resource.type === "tei-dta" &&
        /<title>DTA Qualitätssicherung<\/title>/.test(response.text)) {
      // DTAQ (Titel noch nicht freigeschaltet)
      importURL.error([ message, "DTAQ: Titel noch nicht freigeschaltet" ]);
      return false;
    }

    // Daten in den Cache schreiben
    modules.ipc.invoke("downloads-cache-save", {
      id: urlData.id,
      text: response.text,
    });

    // Daten zurückgeben
    return response.text;
  },

  // Fehlermeldung anzeigen
  //   message = array
  error (message) {
    dialog.oeffnen({
      typ: "alert",
      text: `${message[0]} ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${message[1]}`,
      callback: () => document.getElementById("beleg-import-feld").select(),
    });
  },
};
