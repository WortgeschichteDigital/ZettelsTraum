"use strict";

const lock = {
  // Lock-Datei erstellen/überprüfen/löschen
  //   datei = String
  //     (Dateipfad)
  //   aktion = String
  //     (lock, unlock, check)
  //   maxLockTime = Number
  //     (Millisekunden nach denen eine Lockdatei übergangen wird, Standard 12 h)
  async actions ({ datei, aktion, maxLockTime = 432e5 }) {
    if (!datei) { // für just erstellte, aber noch nicht gespeicherte Karteien
      return true;
    }
    const pfad = datei.match(/^(.+[/\\])(.+)$/);
    const lockfile = `${pfad[1]}.~lock.${pfad[2]}#`;
    if (aktion === "lock") {
      // alte Datei ggf. löschen
      // (Unter Windows gibt es Probleme, wenn die Datei direkt überschrieben werden soll.
      // Ist das vielleicht ein Node-BUG? Eigentlich sollte das nämlich gehen.)
      const exists = await helfer.exists(lockfile);
      if (exists) {
        const erfolg = await lock.unlink(lockfile);
        if (!erfolg) {
          return false;
        }
      }
      // Lock-Datei erstellen
      const host = modules.os.hostname();
      const user = modules.os.userInfo().username;
      const datum = new Date().toISOString();
      const lockcontent = `${datum};;${host};;${user}`;
      try {
        await modules.fsp.writeFile(lockfile, lockcontent);
        // Datei unter Windows verstecken
        if (process.platform === "win32") {
          modules.cp.spawn("cmd.exe", [ "/c", "attrib", "+h", lockfile ]);
        }
        return true;
      } catch (err) {
        dialog.oeffnen({
          typ: "alert",
          text: `Beim Erstellen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
        });
        return false;
      }
    } else if (aktion === "unlock") {
      const erfolg = await lock.unlink(lockfile);
      return erfolg;
    } else if (aktion === "check") {
      const exists = await helfer.exists(lockfile);
      if (!exists) {
        // keine Lockdatei => nicht gesperrt
        return false;
      }
      const lockcontent = await lock.read(lockfile);
      if (!lockcontent) {
        // gesperrt (zur Sicherheit, weil unklarer Status oder Fehler)
        return true;
      }
      const datum_host_user = lockcontent.split(";;");
      const host = modules.os.hostname();
      const user = modules.os.userInfo().username;
      // nicht gesperrt, wenn:
      //   derselbe Computer + dieselbe BenutzerIn
      //   vor mehr als n Millisekunden gesperrt (Standard für Kartei-Lockdateien: 12 h)
      if (host === datum_host_user[1] && user === datum_host_user[2] ||
          new Date() - new Date(datum_host_user[0]) > maxLockTime) {
        // nicht gesperrt
        return false;
      } else if (datum_host_user[2]) {
        // gesperrt
        return [ "user", datum_host_user[2] ];
      }
      // gesperrt
      return [ "computer", datum_host_user[1] ];
    }
  },

  // Lock-Datei löschen
  //   lockfile = String
  //     (Pfad zur Lock-Datei)
  unlink (lockfile) {
    return new Promise(resolve => {
      modules.fsp.unlink(lockfile)
        .then(() => resolve(true))
        .catch(err => {
          dialog.oeffnen({
            typ: "alert",
            text: `Beim Löschen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
          });
          resolve(false);
          throw err;
        });
    });
  },

  // Lock-Datei einlesen
  //   lockfile = String
  //     (Pfad zur Lock-Datei)
  read (lockfile) {
    return new Promise(resolve => {
      modules.fsp.readFile(lockfile, { encoding: "utf8" })
        .then(content => resolve(content))
        .catch(err => {
          dialog.oeffnen({
            typ: "alert",
            text: `Beim Lesen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
          });
          resolve("");
          throw err;
        });
    });
  },

  // Sperrmeldung ausgeben
  //   info = Boolean | Array
  //     (Array enhält Informationen zu Person/Computer, die die Datei gerade benutzen)
  //   typ = String | undefined
  //     (Typ der Datei, die gespeichert werden soll; falls generisches "Datei" unerwünscht)
  locked ({ info, typ = "Datei" }) {
    let durch = "";
    if (Array.isArray(info)) {
      switch (info[0]) {
        case "computer":
          durch = ` durch Computer <i>${info[1]}</i>`;
          break;
        case "user":
          durch = ` durch BenutzerIn <i>${info[1]}</i>`;
          break;
      }
    }
    dialog.oeffnen({
      typ: "alert",
      text: `Beim Öffnen der ${typ} ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nDatei ist gesperrt${durch}`,
    });
  },
};
