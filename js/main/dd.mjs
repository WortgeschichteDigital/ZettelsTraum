
import { app } from "electron";

export { dd as default };

const dd = {
  // Speicher-Objekt für die Fenster; Format der Einträge:
  //   "Fenster-ID" (numerischer String, beginnend mit 1; wird von Electron vergeben)
  //     contentsId:  number (ID des webContents im Fenster)
  //     typ:         string (Typ des Fensters:
  //       "index"         = Hauptfenster
  //       "bedeutungen"   = Nebenfenster "Bedeutungsgerüst" (eins pro Hauptfenster möglich)
  //       "changelog"     = Nebenfenster "Changelog"
  //       "dokumentation" = Nebenfenster "technische Dokumentation"
  //       "handbuch"      = Nebenfenster "Handbuch"
  //       "fehlerlog"     = Nebenfenster "Fehlerlog"
  //       "xml"           = Nebenfenster "XML"
  //       "app"           = modales Nebenfenster "Über App"
  //       "electron"      = modales Nebenfenster "Über Electron")
  //     kartei:      string (Pfad zur Kartei, die gerade in dem Fenster geladen ist;
  //       immer leer in Fenstern, die nicht typ === "index" sind;
  //       kann in Fenstern vom typ === "index" leer sein, dann ist keine Kartei geladen;
  //       kann in Fenstern vom typ === "index" auch "neu" sein, dann wurde die Karte erstellt,
  //       aber noch nicht gespeichert)
  //     exit:        boolean (wird dem Objekt kurz vor dem Schließen hinzugefügt,
  //       damit dieses Schließen nicht blockiert wird; s. BrowserWindow.on("close"))
  //     initDone:    boolean (true, sobald die Initialisierung komplett durchgelaufen ist)
  //     optInitDone: boolean (true, sobald die Optionen eingelesen sind)
  win: {},

  // Developer-Tools sollen angezeigt werden (oder nicht)
  // (wird auch für andere Dinge benutzt, für Testzwecke besser zentral anlegen
  // und nicht überall app.isPackaged abfragen)
  devtools: !app.isPackaged,

  // speichert Exceptions im Main-Prozess und in den Renderer-Prozessen
  fehler: [],

  // Variablen für die Kopierfunktion
  kopieren: {
    timeout: null,
    basisdaten: {},
    winIdAnfrage: -1,
  },

  // Variable mit Release Notes
  // (ist gefüllt, wenn Updates zur Verfügung stehen)
  updates: {
    notes: "",
    gesucht: false,
  },

  // Variable mit gecachten Daten der Karteisuche
  //   [ID] (Object; ID = Pfad zur gecachten Kartei)
  //     ctime (String; Änderungsdatum der Kartei)
  //     data (Object; die kompletten Karteidaten)
  ztjCache: {},

  // Variable, die speichert, ob gerade eine Karteisuche läuft
  ztjCacheStatus: false,

  // Variable für Abgleich der Tag-Dateien
  // (soll nur einmal pro Session stattfinden)
  tagDateienAbgleich: true,
};
