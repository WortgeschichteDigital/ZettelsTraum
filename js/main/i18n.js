"use strict";

const i18n = {
  en: {
    "app-neues-fenster": "New Window",
    "app-karteisuche": "Card File Search",
    "app-einstellungen": "Preferences",
    "app-beenden": "Quit",
    kartei: "&Card File",
    "kartei-erstellen": "Create",
    "kartei-oeffnen": "Open",
    "kartei-zuletzt": "Open Recent",
    "kartei-zuletzt-liste-loeschen": "Clear List",
    "kartei-speichern": "Save",
    "kartei-speichern-unter": "Save As",
    "kartei-schliessen": "Close",
    "kartei-lemmata": "Lemmas",
    "kartei-formvarianten": "Variants",
    "kartei-notizen": "Notes",
    "kartei-anhaenge": "Attachments",
    "kartei-lexika": "Dictionaries",
    "kartei-metadaten": "Meta Data",
    "kartei-bedeutungen": "Meanings",
    "kartei-bedeutungen-wechseln": "Change Meaning Stack",
    "kartei-bedeutungen-fenster": "Meanings Window",
    "kartei-suche": "Search",
    belege: "&Documents",
    "belege-hinzufuegen": "Add",
    "belege-auflisten": "List",
    "belege-taggen": "Tag",
    "belege-loeschen": "Delete",
    "belege-kopieren": "Copy",
    "belege-einfuegen": "Paste",
    "belege-zwischenablage": "Documents to Clipboard",
    redaktion: "Editorial &Work",
    "redaktion-metadaten": "Meta Data",
    "redaktion-ereignisse": "Events",
    "redaktion-literatur": "Literature",
    "redaktion-wortinformationen": "Word Details",
    "redaktion-xml": "XML Window",
    "redaktion-belege-xml": "Documents to XML Window",
    hilfe: "&Help",
    "hilfe-handbuch": "Manual",
    "hilfe-demonstrationskartei": "Demonstration File",
    "hilfe-dokumentation": "Technical Documentation",
    "hilfe-changelog": "Changelog",
    "hilfe-fehlerlog": "Error Log",
    "hilfe-updates": "Updates",
    "hilfe-ueber-app": "About Zettel’s Traum",
    "hilfe-ueber-electron": "About Electron",
    bearbeiten: "&Edit",
    "bearbeiten-rueckgaengig": "Undo",
    "bearbeiten-wiederherstellen": "Redo",
    "bearbeiten-ausschneiden": "Cut",
    "bearbeiten-kopieren": "Copy",
    "bearbeiten-einfuegen": "Paste",
    "bearbeiten-auswaehlen": "Select All",
    ansicht: "&View",
    "ansicht-vergroessern": "Zoom In",
    "ansicht-verkleinern": "Zoom Out",
    "ansicht-standard": "Reset Zoom",
    "ansicht-vollbild": "Full Screen Mode",
    "fenster-schliessen": "Close Window",
    "dev-reload": "Reload",
    "dev-force-reload": "Force Reload",
    "dev-tools": "Developer Tools",
  },
  fr: {
    "app-neues-fenster": "Nouvelle fenêtre",
    "app-karteisuche": "Recherche de fichier",
    "app-einstellungen": "Configuration",
    "app-beenden": "Quitter",
    kartei: "&Fichier",
    "kartei-erstellen": "Créer",
    "kartei-oeffnen": "Ouvrir",
    "kartei-zuletzt": "Récemment ouverts",
    "kartei-zuletzt-liste-loeschen": "Effacer la liste",
    "kartei-speichern": "Enregistrer",
    "kartei-speichern-unter": "Enregistrer sous",
    "kartei-schliessen": "Fermer",
    "kartei-lemmata": "Lemmes",
    "kartei-formvarianten": "Variantes",
    "kartei-notizen": "Notes",
    "kartei-anhaenge": "Pièces jointes",
    "kartei-lexika": "Dictionnaires",
    "kartei-metadaten": "Métadonnées",
    "kartei-bedeutungen": "Sens",
    "kartei-bedeutungen-wechseln": "Changer rangée de sens",
    "kartei-bedeutungen-fenster": "Fenêtre sens",
    "kartei-suche": "Recherche",
    belege: "&Documents",
    "belege-hinzufuegen": "Ajouter",
    "belege-auflisten": "Lister",
    "belege-taggen": "Baliser",
    "belege-loeschen": "Supprimer",
    "belege-kopieren": "Copier",
    "belege-einfuegen": "Coller",
    "belege-zwischenablage": "Documents dans le presse-papiers",
    redaktion: "&Rédaction",
    "redaktion-metadaten": "Métadonnées",
    "redaktion-ereignisse": "Événements",
    "redaktion-literatur": "Littérature",
    "redaktion-wortinformationen": "Informations sur les mots",
    "redaktion-xml": "Fenêtre XML",
    "redaktion-belege-xml": "Documents dans le fenêtre XML",
    hilfe: "&Aide",
    "hilfe-handbuch": "Manuel",
    "hilfe-demonstrationskartei": "Fichier de démonstration",
    "hilfe-dokumentation": "Documentation technique",
    "hilfe-changelog": "Journal des modifications",
    "hilfe-fehlerlog": "Journal des erreurs",
    "hilfe-updates": "Mises à jour",
    "hilfe-ueber-app": "À propos de Zettel’s Traum",
    "hilfe-ueber-electron": "À propos de Electron",
    bearbeiten: "Éd&ition",
    "bearbeiten-rueckgaengig": "Annuler",
    "bearbeiten-wiederherstellen": "Refaire",
    "bearbeiten-ausschneiden": "Couper",
    "bearbeiten-kopieren": "Copier",
    "bearbeiten-einfuegen": "Coller",
    "bearbeiten-auswaehlen": "Tout sélectionner",
    ansicht: "Affi&chage",
    "ansicht-vergroessern": "Augmenter la taille",
    "ansicht-verkleinern": "Diminuer la taille",
    "ansicht-standard": "Réinitialiser la taille",
    "ansicht-vollbild": "Mode plein écran",
    "fenster-schliessen": "Fermer fenêtre",
    "dev-reload": "Recharger",
    "dev-force-reload": "Rechargement forcé",
    "dev-tools": "Outils de développement",
  },
  it: {
    "app-neues-fenster": "Nuova finestra",
    "app-karteisuche": "Ricerca di schedario",
    "app-einstellungen": "Impostazioni",
    "app-beenden": "Esci",
    kartei: "&Schedario",
    "kartei-erstellen": "Crea",
    "kartei-oeffnen": "Apri",
    "kartei-zuletzt": "Apri recente",
    "kartei-zuletzt-liste-loeschen": "Pulisci elenco",
    "kartei-speichern": "Salva",
    "kartei-speichern-unter": "Salva come",
    "kartei-schliessen": "Chiudi",
    "kartei-lemmata": "Lemmi",
    "kartei-formvarianten": "Varianti",
    "kartei-notizen": "Appunti",
    "kartei-anhaenge": "Attachments",
    "kartei-lexika": "Dizionari",
    "kartei-metadaten": "Metadati",
    "kartei-bedeutungen": "Accezioni",
    "kartei-bedeutungen-wechseln": "Cambia fila di accezioni",
    "kartei-bedeutungen-fenster": "Finestra degli accezioni",
    "kartei-suche": "Ricerca",
    belege: "&Documenti",
    "belege-hinzufuegen": "Aggiungi",
    "belege-auflisten": "Elenca",
    "belege-taggen": "Tagga",
    "belege-loeschen": "Cancella",
    "belege-kopieren": "Copia",
    "belege-einfuegen": "Incolla",
    "belege-zwischenablage": "Documenti negli appunti",
    redaktion: "&Redazione",
    "redaktion-metadaten": "Metadati",
    "redaktion-ereignisse": "Eventi",
    "redaktion-literatur": "Letteratura",
    "redaktion-wortinformationen": "Informazioni sulle parole",
    "redaktion-xml": "Finestra di XML",
    "redaktion-belege-xml": "Documenti nella finestra XML",
    hilfe: "&Aiuto",
    "hilfe-handbuch": "Manuale",
    "hilfe-demonstrationskartei": "File illustrativo",
    "hilfe-dokumentation": "Documentazione tecnica",
    "hilfe-changelog": "Registro delle modifiche",
    "hilfe-fehlerlog": "Registro degli errori",
    "hilfe-updates": "Aggiornamenti",
    "hilfe-ueber-app": "Informazioni su Zettel’s Traum",
    "hilfe-ueber-electron": "Informazioni su Electron",
    bearbeiten: "&Modifica",
    "bearbeiten-rueckgaengig": "Annulla",
    "bearbeiten-wiederherstellen": "Rifai",
    "bearbeiten-ausschneiden": "Taglia",
    "bearbeiten-kopieren": "Copia",
    "bearbeiten-einfuegen": "Incolla",
    "bearbeiten-auswaehlen": "Seleziona tutto",
    ansicht: "&Visualizza",
    "ansicht-vergroessern": "Ingrandisci",
    "ansicht-verkleinern": "Rimpicciolisci",
    "ansicht-standard": "Ripristina dimensione",
    "ansicht-vollbild": "Modalità à tutto schermo",
    "fenster-schliessen": "Chiudi la finestra",
    "dev-reload": "Ricarica",
    "dev-force-reload": "Ricarica forzata",
    "dev-tools": "Strumenti di sviluppo",
  },
};

module.exports = {
  // get translation
  trans ({ lang, key }) {
    const trans = i18n?.[lang]?.[key] || i18n.en[key] || "";
    return trans;
  },

  // detect language
  transLang ({ lang }) {
    if (lang === "de") {
      return "de";
    } else if (i18n[lang]) {
      return lang;
    }
    return "en";
  },
};
