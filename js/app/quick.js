"use strict";

let quick = {
	// Liste der möglichen Icons
	icons: {
		"app-neues-fenster": {
			title: "App > Neues Fenster",
			short: "",
			img: "fenster-plus.svg",
		},
		"app-karteisuche": {
			title: "App > Karteisuche",
			short: "",
			img: "lupe.svg",
		},
		"app-einstellungen": {
			title: "App > Einstellungen",
			short: "",
			img: "zahnrad.svg",
		},
		"app-beenden": {
			title: "App > Beenden",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + Q`,
			img: "ausgang.svg",
		},
		"kartei-erstellen": {
			title: "Kartei > Erstellen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + E`,
			img: "dokument-plus.svg",
		},
		"kartei-oeffnen": {
			title: "Kartei > Öffnen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + O`,
			img: "oeffnen.svg",
		},
		"kartei-speichern": {
			title: "Kartei > Speichern",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + S`,
			img: "speichern.svg",
		},
		"kartei-speichern-unter": {
			title: "Kartei > Speichern unter",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + Umsch + S`,
			img: "speichern-unter.svg",
		},
		"kartei-schliessen": {
			title: "Kartei > Schließen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + W`,
			img: "x-dick.svg",
		},
		"kartei-formvarianten": {
			title: "Kartei > Formvarianten",
			short: "",
			img: "formvarianten.svg",
		},
		"kartei-notizen": {
			title: "Kartei > Notizen",
			short: "",
			img: "stift.svg",
		},
		"kartei-anhaenge": {
			title: "Kartei > Anhänge",
			short: "",
			img: "bueroklammer.svg",
		},
		"kartei-lexika": {
			title: "Kartei > Überprüfte Lexika",
			short: "",
			img: "buecher.svg",
		},
		"kartei-metadaten": {
			title: "Kartei > Metadaten",
			short: "",
			img: "zeilen-4,0.svg",
		},
		"kartei-bedeutungen": {
			title: "Kartei > Bedeutungsgerüst",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + B`,
			img: "geruest.svg",
		},
		"kartei-bedeutungen-wechseln": {
			title: "Kartei > Bedeutungsgerüst wechseln",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + ${tastatur.shortcutsTextAktuell("Alt")} + B`,
			img: "geruest-zahnrad.svg",
		},
		"kartei-bedeutungen-fenster": {
			title: "Kartei > Bedeutungsgerüst-Fenster",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + Umsch + B`,
			img: "fenster.svg",
		},
		"kartei-suche": {
			title: "Kartei > Suche",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + F`,
			img: "lupe.svg",
		},
		"redaktion-metadaten": {
			title: "Redaktion > Metadaten",
			short: "",
			img: "zeilen-4,0.svg",
		},
		"redaktion-ereignisse": {
			title: "Redaktion > Ereignisse",
			short: "",
			img: "personen.svg",
		},
		"redaktion-literatur": {
			title: "Redaktion > Literatur",
			short: "",
			img: "buecher.svg",
		},
		"redaktion-wortinformationen": {
			title: "Redaktion > Wortinformationen",
			short: "",
			img: "kreis-info.svg",
		},
		"belege-hinzufuegen": {
			title: "Belege > Hinzufügen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + N`,
			img: "dokument-plus.svg",
		},
		"belege-auflisten": {
			title: "Belege > Auflisten",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + L`,
			img: "liste-bullets.svg",
		},
		"belege-kopieren": {
			title: "Belege > Kopieren",
			short: "",
			img: "kopieren.svg",
		},
		"belege-einfuegen": {
			title: "Belege > Einfügen",
			short: "",
			img: "einfuegen.svg",
		},
		"bearbeiten-rueckgaengig": {
			title: "Bearbeiten > Rückgängig",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + Z`,
			img: "pfeil-rund-links.svg",
		},
		"bearbeiten-wiederherstellen": {
			title: "Bearbeiten > Wiederherstellen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + Umsch + ${process.platform === "win32" ? "Y" : "Z"}`,
			img: "pfeil-rund-rechts.svg",
		},
		"bearbeiten-ausschneiden": {
			title: "Bearbeiten > Ausschneiden",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + X`,
			img: "schere.svg",
		},
		"bearbeiten-kopieren": {
			title: "Bearbeiten > Kopieren",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + C`,
			img: "kopieren.svg",
		},
		"bearbeiten-einfuegen": {
			title: "Bearbeiten > Einfügen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + V`,
			img: "einfuegen.svg",
		},
		"bearbeiten-alles-auswaehlen": {
			title: "Bearbeiten > Alles auswählen",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + A`,
			img: "auswaehlen.svg",
		},
		"ansicht-anzeige-vergroessern": {
			title: "Ansicht > Anzeige vergrößern",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + ${process.platform === "darwin" ? "=" : "+"}`,
			img: "plus-quadrat.svg",
		},
		"ansicht-anzeige-verkleinern": {
			title: "Ansicht > Anzeige verkleinern",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + -`,
			img: "minus-quadrat.svg",
		},
		"ansicht-standardgroesse": {
			title: "Ansicht > Standardgröße",
			short: `${tastatur.shortcutsTextAktuell("Strg")} + 0`,
			img: "fenster-standard.svg",
		},
		"ansicht-vollbild": {
			title: "Ansicht > Vollbild",
			short: `${process.platform === "darwin" ? "Ctrl + ⌘ + F" : "F11"}`,
			img: "fenster-vollbild.svg",
		},
		"hilfe-handbuch": {
			title: "Hilfe > Handbuch",
			short: "F1",
			img: "kreis-fragezeichen.svg",
		},
	},
	// Liste der Standard-Icons
	iconsStandard: ["app-beenden", "sep-1", "app-neues-fenster", "sep-2", "kartei-oeffnen", "kartei-speichern", "kartei-schliessen", "sep-3", "belege-hinzufuegen", "sep-4", "hilfe-handbuch"],
	// Leiste aufbauen
	fill () {
		// Leiste leeren
		let bar = document.getElementById("quick");
		helfer.keineKinder(bar);
		// ggf. veraltete Einträge in der Konfiguration umbenennen
		quick.amendItems();
		// Leiste füllen
		let icons = optionen.data.einstellungen["quick-icons"];
		for (let i of icons) {
			// Spacer
			if (/^sep/.test(i)) {
				let span = document.createElement("span");
				bar.appendChild(span);
				span.classList.add("quick-spacer");
				span.textContent = " ";
				continue;
			}
			// Icon
			let a = document.createElement("a");
			bar.appendChild(a);
			a.classList.add("icon-link");
			a.href = "#";
			a.id = `quick-${i}`;
			let title = quick.icons[i].title;
			if (quick.icons[i].short) {
				title += ` (${quick.icons[i].short})`;
			}
			a.title = title;
			a.textContent = " ";
		}
		// Events anhängen
		document.querySelectorAll("#quick a").forEach(a => {
			if (/^quick-(bearbeiten|ansicht)-/.test(a.id)) {
				quick.accessRoles(a);
			} else {
				quick.access(a);
			}
		});
	},
	// Leiste ein- oder ausschalten
	toggle () {
		let bar = document.getElementById("quick");
		// Leiste ein- oder ausblenden
		if (optionen.data.einstellungen.quick) {
			bar.classList.add("an");
		} else {
			bar.classList.remove("an");
		}
		// Icons in der Leiste von der Tab-Navigation ausschließen od. in sie einbeziehen
		bar.querySelectorAll("a").forEach(a => {
			if (optionen.data.einstellungen.quick) {
				a.removeAttribute("tabindex");
			} else {
				a.setAttribute("tabindex", "-1");
			}
		});
		// affizierte Elemente anpassen
		document.querySelectorAll("body > header, body > section").forEach(i => {
			if (optionen.data.einstellungen.quick) {
				i.classList.add("quick");
			} else {
				i.classList.remove("quick");
			}
		});
	},
	// Vorauswahl der Icons anwenden
	//   a = Element
	//     (der Link, der die Aktion triggert)
	preset (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Preset laden
			const preset = this.id.match(/.+-(.+)/)[1];
			if (preset === "alle") {
				optionen.data.einstellungen["quick-icons"] = Object.keys(quick.icons);
			} else if (preset === "keine") {
				optionen.data.einstellungen["quick-icons"] = [];
			} else if (preset === "standard") {
				optionen.data.einstellungen["quick-icons"] = [...quick.iconsStandard];
			}
			// Listen neu aufbauen
			quick.fill();
			quick.fillConfig(true);
			// Optionen speichern
			optionen.speichern();
		});
	},
	// Klicks auf Icons der Leiste verteilen
	// (Icons der Kategorie Bearbeiten und Ansicht werden in quick.accessRoles() behandelt)
	//   a = Element
	//     (Icon-Link in der Leiste)
	access (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron"),
				befehl = this.id.replace(/^quick-/, "");
			switch (befehl) {
				case "app-neues-fenster":
					ipcRenderer.send("fenster-oeffnen");
					return;
				case "app-karteisuche":
					karteisuche.oeffnen();
					return;
				case "app-einstellungen":
					optionen.oeffnen();
					return;
				case "app-beenden":
					ipcRenderer.send("app-beenden");
					return;
				case "kartei-erstellen":
					kartei.wortErfragen();
					return;
				case "kartei-oeffnen":
					kartei.oeffnen();
					return;
				case "redaktion-literatur":
					redLit.oeffnen();
					return;
				case "hilfe-handbuch":
					ipcRenderer.send("hilfe-handbuch", "");
					return;
			}
			// Ist eine Kartei geöffnet?
			if (!kartei.wort) {
				dialog.oeffnen({
					typ: "alert",
					text: `Die Funktion <i>${quick.icons[befehl].title}</i> steht nur zur Verfügung, wenn eine Kartei geöffnet ist.`,
				});
				return;
			}
			// diese Funktionen stehen nur bei einer geöffneten Kartei zur Verfügung
			switch (befehl) {
				case "kartei-speichern":
					kartei.speichern(false);
					break;
				case "kartei-speichern-unter":
					kartei.speichern(true);
					break;
				case "kartei-schliessen":
					kartei.schliessen();
					break;
				case "kartei-formvarianten":
					stamm.oeffnen();
					break;
				case "kartei-notizen":
					notizen.oeffnen();
					break;
				case "kartei-anhaenge":
					anhaenge.fenster();
					break;
				case "kartei-lexika":
					lexika.oeffnen();
					break;
				case "kartei-metadaten":
					meta.oeffnen();
					break;
				case "kartei-bedeutungen":
					bedeutungen.oeffnen();
					break;
				case "kartei-bedeutungen-wechseln":
					bedeutungenGeruest.oeffnen();
					break;
				case "kartei-bedeutungen-fenster":
					bedeutungenWin.oeffnen();
					break;
				case "kartei-suche":
					filter.suche();
					break;
				case "redaktion-metadaten":
					redMeta.oeffnen();
					break;
				case "redaktion-ereignisse":
					redaktion.oeffnen();
					break;
				case "redaktion-wortinformationen":
					redWi.oeffnen();
					break;
				case "belege-hinzufuegen":
					speichern.checkInit(() => beleg.erstellen());
					break;
				case "belege-auflisten":
					speichern.checkInit(() => liste.wechseln());
					break;
				case "belege-kopieren":
					kopieren.init();
					break;
				case "belege-einfuegen":
					kopieren.einfuegen();
					break;
			}
		});
	},
	// speichert das Element, das vor einem Mousedown-Event aktiv war
	accessRolesActive: null,
	// Klicks auf Icons in der Leiste verteilen (Bearbeiten und Ansicht)
	//   a = Element
	//     (Icon-Link in der Leiste)
	accessRoles (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const befehl = this.id.replace(/^quick-/, ""),
				{ipcRenderer} = require("electron");
			let fokus = ["bearbeiten-rueckgaengig", "bearbeiten-wiederherstellen", "bearbeiten-ausschneiden", "bearbeiten-kopieren", "bearbeiten-einfuegen", "bearbeiten-alles-auswaehlen"];
			if (fokus.includes(befehl)) {
				quick.accessRolesActive.focus();
			}
			ipcRenderer.invoke("quick-roles", befehl);
		});
	},
	// Konfigurationsanzeige im Einstellungen-Fenster aufbauen
	//   toTop = true || undefined
	//     (die Konfigurationsfelder nach oben scrollen
	fillConfig (toTop = false) {
		let contSelected = document.getElementById("quick-config-selected"),
			contSelectable = document.getElementById("quick-config-selectable");
		if (toTop) {
			contSelected.scrollTop = 0;
			contSelectable.scrollTop = 0;
		}
		helfer.keineKinder(contSelected);
		helfer.keineKinder(contSelectable);
		// ausgewählte Optionen aufbauen
		for (let i of optionen.data.einstellungen["quick-icons"]) {
			contSelected.appendChild(quick.fillConfigItem(i));
		}
		// auswählbare Optionen aufbauen
		contSelectable.appendChild(quick.fillConfigItem("sep"));
		for (let i in quick.icons) {
			if (!quick.icons.hasOwnProperty(i)) {
				continue;
			}
			if (optionen.data.einstellungen["quick-icons"].includes(i)) {
				continue;
			}
			contSelectable.appendChild(quick.fillConfigItem(i));
		}
		// Events anhängen
		quick.eventsConfig();
		// Pfeile auffrischen
		quick.pfeile();
	},
	// Item für die Konfiguration im Einstellungen-Fenster erzeugen
	//   i = String
	//     (Identifier des Items)
	fillConfigItem (i) {
		let a = document.createElement("a");
		a.href = "#";
		a.dataset.icon = i;
		if (/^sep/.test(i)) {
			// Seperator
			let hr = document.createElement("hr");
			a.appendChild(hr);
		} else {
			// Bild
			let img = document.createElement("img");
			a.appendChild(img);
			img.src = `img/${quick.icons[i].img}`;
			img.width = "24";
			img.height = "24";
			// Text
			a.appendChild(document.createTextNode(quick.icons[i].title));
		}
		return a;
	},
	// Events an die Elemente in den Konfigurationsblöcken heften
	eventsConfig () {
		document.querySelectorAll("#quick-config a").forEach(a => {
			a.addEventListener("click", function(evt) {
				evt.preventDefault();
				let aktiv = quick.rmAktiv();
				if (aktiv !== this) {
					this.classList.add("aktiv");
				}
				quick.pfeile();
			});
		});
	},
	// aktives Element deaktivieren
	rmAktiv () {
		let aktiv = document.querySelector("#quick-config .aktiv");
		if (aktiv) {
			aktiv.classList.remove("aktiv");
		}
		return aktiv;
	},
	// Timeout für das Fokussieren des Items
	itemFocusTimeout: null,
	// führt die Bewegung eines Items durch
	//   dir = String
	//     (Bewegungsrichtung: hoch, rechts, runter, links)
	moveConfig (dir) {
		// Bewegung erlaubt?
		if (!quick.pfeileAktiv[dir]) {
			return;
		}
		// Item bewegen
		let aktiv = document.querySelector("#quick-config .aktiv"),
			opt = optionen.data.einstellungen["quick-icons"],
			icon = aktiv.dataset.icon;
		const idx = opt.indexOf(icon);
		if (dir === "hoch" || dir === "runter") {
			opt.splice(idx, 1);
			if (dir === "hoch") {
				opt.splice(idx - 1, 0, icon);
			} else {
				opt.splice(idx + 1, 0, icon);
			}
		} else if (/selected$/.test(aktiv.closest("div").id)) {
			opt.splice(idx, 1);
			if (/^sep/.test(icon)) { // sonst wird der Separator nicht gefunden
				icon = "sep";
			}
		} else {
			if (icon === "sep") {
				// Seperatoren können mehrfach auftauchen,
				// müssen aber eindeutig ansprechbar sein
				let sepNr = 0,
					sep;
				do {
					sepNr++;
					sep = document.querySelector(`#quick-config-selected [data-icon="sep-${sepNr}"]`);
				} while (sep);
				icon = `sep-${sepNr}`;
			}
			opt.push(icon);
		}
		// Listen neu aufbauen
		quick.fill();
		quick.fillConfig();
		// Item aktivieren
		let item = document.querySelector(`#quick-config [data-icon="${icon}"]`);
		item.dispatchEvent( new KeyboardEvent("click", {key: "Enter"}) );
		// Item ggf. in den sichtbaren Bereich scrollen
		let cont = item.closest("div"),
			contScroll = cont.scrollTop,
			contHeight = cont.offsetHeight,
			itemTop = item.offsetTop,
			itemHeight = item.offsetHeight;
		if (itemTop + itemHeight + 26 > contHeight + contScroll) {
			cont.scrollTop = itemTop + itemHeight - 4 * 26 - 4; // 26px = Höhe eines Links
		} else if (itemTop - 26 < contScroll) {
			cont.scrollTop = itemTop + itemHeight - 7 * 26 - 4; // 26px = Höhe eines Links
		}
		// Item fokussieren
		clearTimeout(quick.itemFocusTimeout);
		quick.itemFocusTimeout = setTimeout(() => item.focus(), 500);
		// Optionen speichern
		optionen.speichern();
	},
	// speichert, welche Pfeile gerade aktiv sind
	pfeileAktiv: {
		hoch: false,
		rechts: false,
		runter: false,
		links: false,
	},
	// Farbe der Pfeile auffrischen
	pfeile () {
		quick.pfeileAktiv = {
			hoch: false,
			rechts: false,
			runter: false,
			links: false,
		};
		let aktiv = quick.pfeileAktiv,
			selectedAktiv = document.querySelector("#quick-config-selected .aktiv");
		if (selectedAktiv) {
			aktiv.rechts = true;
			let div = selectedAktiv.closest("div");
			if (div.firstChild !== selectedAktiv) {
				aktiv.hoch = true;
			}
			if (div.lastChild !== selectedAktiv) {
				aktiv.runter = true;
			}
		} else if (document.querySelector("#quick-config-selectable .aktiv")) {
			aktiv.links = true;
		}
		for (let i in aktiv) {
			if (!aktiv.hasOwnProperty(i)) {
				continue;
			}
			let src = `img/pfeil-gerade-${i}${aktiv[i] ? "" : "-grau"}.svg`;
			document.getElementById(`quick-config-${i}`).src = src;
		}
	},
	// Events an die Pfeile hängen
	//   img = Element
	//     (Pfeil, zum Bewegen der Elemente)
	eventsPfeile (img) {
		img.addEventListener("click", function() {
			const dir = this.src.match(/.+-(.+)\./)[1];
			quick.moveConfig(dir);
		});
	},
	// veraltete Einträge in den Einstellungen ändern
	amendItems () {
		let umbenannt = {
			"kartei-redaktion": "redaktion-ereignisse",
		};
		for (let i of Object.keys(umbenannt)) {
			const idx = optionen.data.einstellungen["quick-icons"].indexOf(i);
			if (idx < 0) {
				continue;
			}
			optionen.data.einstellungen["quick-icons"][idx] = umbenannt[i];
			optionen.speichern();
		}
	},
};
