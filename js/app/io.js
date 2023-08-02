"use strict";

const io = {
  // Daten komprimieren
  //   daten = String
  //     (ein JSON-String, der komprimiert werden soll)
  gzipData (daten) {
    return new Promise(resolve => {
      modules.zlib.gzip(daten, (err, buffer) => {
        // Fehler beim Packen
        if (err) {
          resolve(err);
          return;
        }
        // Datei-Buffer zurückgeben
        resolve(buffer);
      });
    });
  },

  // Daten dekomprimieren
  //   daten = Buffer
  //     (ein Datei-Buffer, der dekomprimiert werden soll)
  unzipData (daten) {
    return new Promise(resolve => {
      modules.zlib.unzip(daten, (err, buffer) => {
        // Fehler beim Entpacken
        // (passiert u.a., wenn die Daten nicht komprimiert sind)
        if (err) {
          resolve(err);
          return;
        }
        // String zurückgeben
        // (standardmäßig mit encoding UTF-8)
        resolve(buffer.toString());
      });
    });
  },

  // ZTJ/ZTB-Datei lesen
  //   datei = String
  //     (Pfad zur Datei, die eingelesen werden soll)
  lesen (datei) {
    return new Promise(resolve => {
      modules.fsp.readFile(datei)
        .then(async buffer => {
          // Daten dekomprimieren
          const content = await io.unzipData(buffer);
          // Daten sind nicht String => Fehlermeldung => Daten im Buffer wohl gar nicht komprimiert
          // (Dateien wurden erst mit Version 0.24.0 komprimiert)
          if (typeof content !== "string") {
            try {
              // sind die Datei-Daten schon JSON => Daten zurückgeben
              const daten = buffer.toString();
              JSON.parse(daten);
              resolve(daten);
            } catch (err) {
              // offenbar nicht => Fehler zurückgeben
              resolve(err);
            }
            return;
          }
          // Daten sind String => keine Fehlermeldung => Daten können zurückgegeben werden
          resolve(content);
        })
        .catch(err => resolve(err));
    });
  },

  // ZTJ/ZTB-Datei schreiben
  //   datei = String
  //     (Pfad zur Datei, in der die komprimierten Daten gespeichert werden sollen)
  //   daten = String
  //     (ein JSON-String, der komprimiert werden soll)
  async schreiben (datei, daten) {
    // Daten packen
    const buffer = await io.gzipData(daten);
    // Fehlerbehandlung => beim Komprimieren ist etwas schiefgelaufen
    if (buffer.message) {
      return buffer;
    }
    // Daten in Datei schreiben
    const result = await new Promise(resolve => {
      modules.fsp.writeFile(datei, buffer)
        .then(() => resolve(true))
        .catch(err => resolve(err));
    });
    return result;
  },
};
