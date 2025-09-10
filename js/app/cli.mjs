
import karteisucheExport from "./karteisucheExport.mjs";
import redLit from "./redLit.mjs";

export { cli as default };

const cli = {
  // übergebene CLI-Kommandos verarbeiten
  //   commands = object
  async verarbeiten (commands) {
    // LITERATURLISTE EXPORTIEREN
    if (commands["literatur-db-quelle"] || commands["literatur-db-ziel"]) {
      // grundlegende Fehler abfangen
      if (!commands["literatur-db-quelle"]) {
        bridge.ipc.invoke("cli-message", "Fehler: Quellpfad der Literaturliste nicht angegeben");
        bridge.ipc.invoke("cli-return-code", 1);
        return;
      } else if (!commands["literatur-db-ziel"]) {
        bridge.ipc.invoke("cli-message", "Fehler: Zielpfad der Literaturliste nicht angegeben");
        bridge.ipc.invoke("cli-return-code", 1);
        return;
      }

      // Export durchführen
      const vars = {
        quelle: commands["literatur-db-quelle"],
        ziel: commands["literatur-db-ziel"],
      };
      if (/^(xml|txt)$/.test(commands["literatur-db-format"])) {
        vars.format = commands["literatur-db-format"];
      }
      const result = await redLit.dbExportierenAuto(vars);
      if (!result) {
        bridge.ipc.invoke("cli-return-code", 1);
        return;
      }
    }

    // KARTEILISTE EXPORTIEREN
    if (commands["karteiliste-quelle"] || commands["karteiliste-ziel"]) {
      // grundlegende Fehler abfangen
      if (!commands["karteiliste-quelle"]) {
        bridge.ipc.invoke("cli-message", "Fehler: Quellpfad der Karteiliste nicht angegeben");
        bridge.ipc.invoke("cli-return-code", 1);
        return;
      } else if (!commands["karteiliste-ziel"]) {
        bridge.ipc.invoke("cli-message", "Fehler: Zielpfad der Karteiliste nicht angegeben");
        bridge.ipc.invoke("cli-return-code", 1);
        return;
      }

      // Export durchführen
      let vorlagen = [ "0" ];
      if (commands["karteiliste-vorlage"]) {
        vorlagen = commands["karteiliste-vorlage"].split(",");
      }
      for (const vorlage of vorlagen) {
        const vars = {
          quelle: commands["karteiliste-quelle"],
          ziel: commands["karteiliste-ziel"],
          vorlage,
        };
        const result = await karteisucheExport.exportierenAuto(vars);
        if (!result) {
          bridge.ipc.invoke("cli-return-code", 1);
          return;
        }
      }
    }

    // EXPORT FEHLERFREI BEENDET
    bridge.ipc.invoke("cli-return-code", 0);
  },
};
