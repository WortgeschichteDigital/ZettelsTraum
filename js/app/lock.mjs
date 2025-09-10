
import dd from "../dd.mjs";
import dialog from "../dialog.mjs";

export { lock as default };

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
      const exists = await bridge.ipc.invoke("file-exists", lockfile);
      if (exists) {
        const erfolg = await lock.unlink(lockfile);
        if (!erfolg) {
          return false;
        }
      }
      // Lock-Datei erstellen
      const lockcontent = `${new Date().toISOString()};;${dd.app.os.hostname};;${dd.app.os.username}`;
      try {
        await bridge.ipc.invoke("file-write", lockfile, lockcontent);
        // Datei unter Windows verstecken
        if (dd.app.platform === "win32") {
          bridge.ipc.invoke("win32-hide-file", lockfile);
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
      const exists = await bridge.ipc.invoke("file-exists", lockfile);
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
      // nicht gesperrt, wenn:
      //   derselbe Computer + dieselbe BenutzerIn
      //   vor mehr als n Millisekunden gesperrt (Standard für Kartei-Lockdateien: 12 h)
      if (dd.app.os.hostname === datum_host_user[1] && dd.app.os.username === datum_host_user[2] ||
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
  async unlink (lockfile) {
    const result = await bridge.ipc.invoke("file-unlink", lockfile);
    if (result.message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Löschen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
      return false;
    }
    return true;
  },

  // Lock-Datei einlesen
  //   lockfile = String
  //     (Pfad zur Lock-Datei)
  async read (lockfile) {
    const result = await bridge.ipc.invoke("file-read", {
      path: lockfile,
    });
    if (result.message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Lesen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
      return "";
    }
    return result;
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
