"use strict";

let karteisucheExport = {
	// Fenster initialisieren
	init: true,
	// Fenster öffnen
	async oeffnen () {
		// keine Treffer in der Liste
		const items = document.querySelectorAll("#karteisuche-karteien > div:not(.aus)");
		if (!items.length) {
			let text = "Es wurden keine Karteien gefunden.";
			if (!document.querySelector("#karteisuche-treffer").textContent) {
				text = "Sie müssen zuerst eine Suche anstoßen.";
			}
			dialog.oeffnen({
				typ: "alert",
				text,
				callback: () => {
					const buttons = document.querySelectorAll('#karteisuche input[type="button"]');
					if (Object.keys(karteisuche.ztjCache).length) {
						buttons[1].focus();
					} else {
						buttons[0].focus();
					}
				},
			});
			return;
		}
		// Fenster vorbereiten
		if (!optionen.data["karteisuche-export-vorlagen"].length) {
			await karteisucheExport.vorlagenToolsReset(false);
			karteisucheExport.vorlageLaden(0);
		} else if (karteisucheExport.init) {
			karteisucheExport.vorlagenListe();
			karteisucheExport.vorlageLaden(0);
		}
		karteisucheExport.init = false;
		// Fenster öffnen
		let fenster = document.querySelector("#karteisuche-export");
		overlay.oeffnen(fenster);
		// Maximalhöhe des Fensters festlegen
		helfer.elementMaxHeight({
			ele: document.querySelector("#karteisuche-export-form-cont"),
		});
		// Export-Button fokussieren
		document.querySelector("#karteisuche-export-exportieren").focus();
	},
	// Exportieren: ausgewählte Optionen
	exportierenOpt: {},
	// Exportieren
	//   auto = Boolean
	//     (automatischer Export)
	exportieren (auto = false) {
		// Einstellungen auslesen
		karteisucheExport.exportierenOpt = {
			format: "html",
			optDatum: document.querySelector("#karteisuche-export-optionen-datum").checked,
			optAlphabet: document.querySelector("#karteisuche-export-optionen-alphabet").checked,
			optTabellenkopf: document.querySelector("#karteisuche-export-optionen-tabellenkopf").checked,
			optTabellenkopfKurz: document.querySelector("#karteisuche-export-optionen-tabellenkopf-kurz").checked,
			optVariantenTrennen: document.querySelector("#karteisuche-export-optionen-varianten-trennen").checked,
			optInitialien: document.querySelector("#karteisuche-export-optionen-initialien").checked,
			optStylesheet: document.querySelector("#karteisuche-export-optionen-stylesheet").checked,
			feldNummerierung: document.querySelector("#karteisuche-export-felder-nummerierung").checked,
			feldLemma: document.querySelector("#karteisuche-export-felder-lemma").checked,
			feldArtikel: document.querySelector("#karteisuche-export-felder-artikel").checked,
			feldHauptlemma: document.querySelector("#karteisuche-export-felder-hauptlemma").checked,
			feldNebenlemma: document.querySelector("#karteisuche-export-felder-nebenlemma").checked,
			feldRedaktionStatus: document.querySelector("#karteisuche-export-felder-redaktion-status").checked,
			feldRedaktionErstellt: document.querySelector("#karteisuche-export-felder-redaktion-erstellt").checked,
			feldRedaktionOnline: document.querySelector("#karteisuche-export-felder-redaktion-online").checked,
			feldRedaktionText: document.querySelector("#karteisuche-export-felder-redaktion-text").checked,
			feldBehandelt: document.querySelector("#karteisuche-export-felder-behandelt").checked,
			feldKarteiDurch: document.querySelector("#karteisuche-export-felder-kartei-durch").checked,
			feldKarteiAm: document.querySelector("#karteisuche-export-felder-kartei-am").checked,
			feldArtikelDurch: document.querySelector("#karteisuche-export-felder-artikel-durch").checked,
			feldArtikelAm: document.querySelector("#karteisuche-export-felder-artikel-am").checked,
			feldNotizen: document.querySelector("#karteisuche-export-felder-notizen").checked,
		};
		let opt = karteisucheExport.exportierenOpt;
		if (document.querySelector("#karteisuche-export-format-md").checked) {
			opt.format = "md";
			opt.optTabellenkopf = true;
			opt.optStylesheet = false;
		}
		if (!opt.optStylesheet) {
			opt.feldRedaktionStatus = false;
		}
		if (!opt.feldLemma &&
				!opt.feldArtikel) {
			opt.feldLemma = true;
		}
		if (!opt.feldLemma) {
			opt.optVariantenTrennen = false;
			opt.feldHauptlemma = false;
			opt.feldNebenlemma = false;
			opt.feldBehandelt = false;
		}
		// Lemma- und Artikelliste erstellen
		const liste = karteisucheExport.exportierenListe();
		// Datensätze zusammentragen
		const daten = karteisucheExport.exportierenDaten(liste);
		// Exportdatum ermitteln
		const datum = karteisucheExport.exportierenDatum();
		// zentrierte Spalten ermitteln
		let spaltenCenter = [],
			n = -1;
		for (const [k, v] of Object.entries(opt)) {
			if (/^(format|opt)/.test(k) || !v) {
				continue;
			}
			n++;
			if (/feld(Hauptlemma|Nebenlemma|Redaktion(Erstellt|Online))/.test(k)) {
				spaltenCenter.push(n);
			}
		}
		// Dateidaten erstellen
		let tabellenkopf = karteisucheExport.exportierenTabellenkopf(spaltenCenter),
			titel = document.querySelector("#karteisuche-export-optionen-titel").value.trim() || "Karteiliste",
			content = "";
		// HTML
		if (opt.format === "html") {
			// Content vorbereiten
			const stylesheet = `<style>
				body {
					margin: 20px;
					font-family: Arial, Helvetica, sans-serif;
					font-size: 16px;
					line-height: 24px;
				}
				h1 {
					margin: 0 0 20px 0;
					font-size: 28px;
					line-height: 40px;
					font-weight: bold;
				}
				h1 span {
					margin-left: 20px;
					font-size: 16px;
					font-weight: normal;
				}
				h2 {
					margin: 40px 0 10px 0;
					font-size: 22px;
					line-height: 32px;
					font-weight: bold;
				}
				table {
					border-collapse: collapse;
					border-spacing: 0;
				}
				th,
				td {
					padding: 5px 10px;
					white-space: nowrap;
				}
				th {
					vertical-align: bottom;
					text-align: left;
				}
				td {
					vertical-align: top;
				}
				th.center,
				td.center {
					text-align: center;
				}
				td.umbruch {
					white-space: normal;
				}
				tr:nth-child(even) td {
					background-color: #f6f6f6;
				}
				tr:hover td {
					background-color: #ffffcd;
				}
				.nebenlemmata {
					font-size: 14px;
					line-height: 20px;
				}
				.redaktion-status {
					position: relative;
					top: 4px;
					display: inline-block;
					border-radius: 8px;
					width: 16px;
					height: 16px;
					cursor: help;
					user-select: none;
				}
				.redaktion-status-1 {
					background-color: #c00;
				}
				.redaktion-status-2 {
					background-color: #ecec00;
				}
				.redaktion-status-3 {
					background-color: #080;
				}
				.redaktion-status-4 {
					background-color: #0c0;
				}
				</style>\n`;
			content = `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<title>${titel}</title>\n${opt.optStylesheet ? stylesheet.replace(/\n\t{4}/g, "\n") : ""}</head>\n<body>\n<h1>${titel + datum}</h1>\n`;
			// Spalten ermitteln, in denen umgebrochen werden darf
			let spaltenUmbruch = [],
				nummerierung = opt.feldNummerierung ? 1 : 0;
			if (opt.feldLemma) {
				spaltenUmbruch.push(0 + nummerierung);
			}
			if (opt.feldArtikel) {
				spaltenUmbruch.push(spaltenUmbruch.length + nummerierung);
			}
			// Dokument erzeugen
			let tabelleStart = true;
			for (const item of daten) {
				if (item.typ === "Überschrift") {
					if (!tabelleStart) {
						content += "</table>\n";
					}
					tabelleStart = true;
					content += `<h2>${item.daten[0]}</h2>\n`;
				} else if (item.typ === "Zeile") {
					if (tabelleStart) {
						content += "<table>\n";
						if (tabellenkopf) {
							content += tabellenkopf;
						}
						tabelleStart = false;
					}
					content += "<tr>";
					for (let i = 0, len = item.daten.length; i < len; i++) {
						let text = item.daten[i];
						content += "<td";
						if (opt.optStylesheet) {
							if (spaltenCenter.includes(i)) {
								content += ` class="center"`;
							} else if (spaltenUmbruch.includes(i)) {
								content += ` class="umbruch"`;
								text = text.replace(/\/(?!span>)/g, "/<wbr>");
							}
						}
						content += `>${text}</td>`;
					}
					content += "</tr>\n";
				}
			}
			content += "</table>\n";
			content += "</body>\n</html>\n";
		}
		// MD
		else if (opt.format === "md") {
			content = `\n# ${titel + datum}\n\n`;
			let tabelleStart = true;
			for (const item of daten) {
				if (item.typ === "Überschrift") {
					if (!tabelleStart) {
						content += "\n";
					}
					tabelleStart = true;
					content += `## ${item.daten[0]}\n`;
				} else if (item.typ === "Zeile") {
					if (tabelleStart) {
						content += "\n";
						if (tabellenkopf) {
							content += tabellenkopf;
						}
						tabelleStart = false;
					}
					for (const i of item.daten) {
						content += `| ${i} `;
					}
					content += "|\n";
				}
			}
		}
		// Dateidaten speichern
		if (auto) {
			return content;
		} else {
			karteisucheExport.speichern(content, {
				name: opt.format === "html" ? "HTML" : "Markdown",
				ext: opt.format,
				content: titel.replace(/[/\\]/g, "-"),
			});
		}
	},
	// Exportieren: Lemma- und Artikelliste erstellen
	exportierenListe () {
		const opt = karteisucheExport.exportierenOpt;
		// Karteien sammeln
		let indizes = [];
		const items = document.querySelectorAll("#karteisuche-karteien > div:not(.aus)");
		for (const i of items) {
			indizes.push(parseInt(i.dataset.idx, 10));
		}
		indizes.sort((a, b) => a - b);
		let liste = {
			artikel: [],
			lemmata: [],
		};
		for (const idx of indizes) {
			if (karteisuche.ztj[idx].behandeltIn) {
				// dieses Lemma steht in der korrespondierenden Kartei
				// in karteisuche.ztj[idx].behandeltMit
				continue;
			}
			const ztj = karteisuche.ztj[idx],
				redaktion = karteisuche.ztjAuflistenRedaktion(idx),
				artikelErstellt = redaktion.status >= 2,
				artikelOnline = redaktion.status >= 4,
				karteiDurch = ztj.redaktion.find(i => i.er === "Kartei erstellt").pr || "N. N.",
				karteiAm = ztj.redaktion.find(i => i.er === "Kartei erstellt").da,
				artikelDurch = ztj.redaktion.find(i => i.er === "Artikel erstellt")?.pr || "",
				artikelAm = ztj.redaktion.find(i => i.er === "Artikel erstellt")?.da || "",
				notizen = karteisuche.ztjCache[ztj.pfad].data.rd.no || "",
				lemmata = [...new Set([ztj.wort].concat(ztj.behandeltMit).concat(ztj.nebenlemmata))],
				lemmataPushed = [],
				artLemmas = [],
				artLemmasHl = [],
				artLemmasNl = [];
			for (const lemma of lemmata) {
				// Nebenlemma?
				let nebenlemma = false;
				if (ztj.nebenlemmata.includes(lemma)) {
					nebenlemma = true;
				}
				// Artikel
				if (!liste.artikel.some(i => i.lemmas.includes(lemma))) {
					artLemmas.push(lemma);
					if (nebenlemma) {
						artLemmasNl.push(lemma);
					} else {
						artLemmasHl.push(lemma);
					}
				}
				// Lemmata-Daten sammeln?
				if (!opt.feldLemma) {
					continue;
				}
				// behandelt in/mit
				let behandeltInMit = [];
				if (nebenlemma) {
					behandeltInMit.push(`→ ${ztj.wort}`);
				} else if (lemmata.length > 1) {
					let mit = [...lemmata];
					mit.splice(mit.indexOf(lemma), 1);
					for (const m of mit) {
						behandeltInMit.push(`+ ${m}`);
					}
				}
				// Lemmata
				let ll = [lemma];
				if (opt.optVariantenTrennen) {
					ll = lemma.split("/");
				}
				for (const l of ll) {
					if (liste.lemmata.some(i => i.lemma === l)) {
						continue;
					}
					lemmataPushed.push(liste.lemmata.length);
					liste.lemmata.push({
						lemma: l,
						lemmaSort: karteisuche.wortSort(l),
						nebenlemma,
						hauptlemma: !nebenlemma,
						redaktionStatus: redaktion.status,
						artikelErstellt,
						artikelOnline,
						redaktionText: redaktion.ereignis,
						behandeltInMit,
						karteiDurch,
						karteiAm,
						artikelDurch,
						artikelAm,
						notizen,
					});
				}
			}
			if (opt.feldArtikel &&
					artLemmas.length) {
				const idxArtikel = liste.artikel.length;
				for (const i of lemmataPushed) {
					liste.lemmata[i].artikel = idxArtikel;
				}
				liste.artikel.push({
					lemmas: artLemmas,
					lemmaSort: karteisuche.wortSort(artLemmas[0]),
					lemmasHl: artLemmasHl,
					lemmasNl: artLemmasNl,
					redaktionStatus: redaktion.status,
					artikelErstellt,
					artikelOnline,
					redaktionText: redaktion.ereignis,
					karteiDurch,
					karteiAm,
					artikelDurch,
					artikelAm,
					notizen,
				});
			}
		}
		// Liste sortieren
		liste.artikel.sort(sortierer);
		liste.lemmata.sort(sortierer);
		function sortierer (a, b) {
			let x = [a.lemmaSort, b.lemmaSort];
			x.sort(helfer.sortAlpha);
			if (x[0] === a.lemmaSort) {
				return -1;
			}
			return 1;
		}
		// Liste zurückgeben
		return liste;
	},
	// Exportieren: Datensätze zusammentragen
	//   liste = Object
	//     (Liste mit Lemmata- und Artikeldaten)
	exportierenDaten (liste) {
		const opt = karteisucheExport.exportierenOpt;
		// Daten zusammenstellen
		let daten = [],
			buchstabeZuletzt = "",
			n = 0,
			arr = liste.lemmata;
		if (!opt.feldLemma) {
			arr = liste.artikel;
		}
		for (const i of arr) {
			n++;
			// BUCHSTABE
			if (opt.optAlphabet) {
				let buchstabeAktuell = karteisuche.wortAlpha(i.lemmaSort);
				if (buchstabeAktuell !== buchstabeZuletzt) {
					daten.push({
						typ: "Überschrift",
						daten: [buchstabeAktuell],
					});
					buchstabeZuletzt = buchstabeAktuell;
				}
			}
			// ZEILE
			let zeile = {
				typ: "Zeile",
				daten: [],
			};
			// Nummerierung
			if (opt.feldNummerierung) {
				zeile.daten.push(`${n}.`);
			}
			// Lemma und Artikel
			if (opt.feldLemma) {
				zeile.daten.push(i.lemma);
				if (opt.feldArtikel) {
					const artikel = liste.artikel[i.artikel];
					zeile.daten.push(artikelLemmata(artikel));
				}
			} else {
				zeile.daten.push(artikelLemmata(i));
			}
			// Hauptlemma
			if (opt.feldHauptlemma) {
				if (i.hauptlemma) {
					zeile.daten.push("X");
				} else {
					zeile.daten.push(" ");
				}
			}
			// Nebenlemma
			if (opt.feldNebenlemma) {
				if (i.nebenlemma) {
					zeile.daten.push("X");
				} else {
					zeile.daten.push(" ");
				}
			}
			// Redaktion: Status
			if (opt.feldRedaktionStatus) {
				zeile.daten.push(`<span class="redaktion-status redaktion-status-${i.redaktionStatus}" title="${i.redaktionText}"> </span>`);
			}
			// Redaktion: Artikel erstellt
			if (opt.feldRedaktionErstellt) {
				if (i.artikelErstellt) {
					zeile.daten.push("X");
				} else {
					zeile.daten.push(" ");
				}
			}
			// Redaktion: Artikel online
			if (opt.feldRedaktionOnline) {
				if (i.artikelOnline) {
					zeile.daten.push("X");
				} else {
					zeile.daten.push(" ");
				}
			}
			// Redaktion: Text
			if (opt.feldRedaktionText) {
				zeile.daten.push(i.redaktionText);
			}
			// behandelt in/mit
			if (opt.feldBehandelt) {
				if (i.behandeltInMit.length) {
					zeile.daten.push(i.behandeltInMit.join("<br>"));
				} else {
					zeile.daten.push(" ");
				}
			}
			// Kartei durch
			if (opt.feldKarteiDurch) {
				zeile.daten.push(initialien(i.karteiDurch));
			}
			// Kartei am
			if (opt.feldKarteiAm) {
				zeile.daten.push(datum(i.karteiAm));
			}
			// Artikel durch
			if (opt.feldArtikelDurch) {
				if (i.artikelDurch) {
					zeile.daten.push(initialien(i.artikelDurch));
				} else {
					zeile.daten.push(" ");
				}
			}
			// Artikel am
			if (opt.feldArtikelAm) {
				if (i.artikelDurch) {
					zeile.daten.push(datum(i.artikelAm));
				} else {
					zeile.daten.push(" ");
				}
			}
			// Notizen
			if (opt.feldNotizen) {
				if (i.notizen) {
					zeile.daten.push(i.notizen);
				} else {
					zeile.daten.push(" ");
				}
			}
			// ZEILE EINHÄNGEN
			daten.push(zeile);
		}
		// Daten zurückgeben
		return daten;
		// Helferfunktionen
		function artikelLemmata (artikel) {
			let text = artikel.lemmasHl.join(" · ");
			if (artikel.lemmasNl.length) {
				text += "<br>";
				if (opt.optStylesheet) {
					text += `<span class="nebenlemmata">${artikel.lemmasNl.join(" · ")}</span>`;
				} else if (opt.format === "html") {
					text += `<small>${artikel.lemmasNl.join(" · ")}</small>`;
				} else {
					text += artikel.lemmasNl.join(" · ");
				}
			}
			return text;
		}
		function initialien (name) {
			if (!opt.optInitialien) {
				return name;
			}
			if (/, /.test(name)) {
				const nameSp = name.split(", ");
				name = nameSp[1] + " " + nameSp[0];
			}
			name = name.replace(/-/g, " ");
			let initialien = "";
			for (const chunk of name.split(" ")) {
				initialien += chunk[0].toUpperCase();
			}
			return initialien;
		}
		function datum (d) {
			const arr = d.split("-");
			return arr[2] + ". " + arr[1] + ". " + arr[0];
		}
	},
	// Exportieren: Exportdatum erstellen
	exportierenDatum () {
		const opt = karteisucheExport.exportierenOpt;
		if (!opt.optDatum) {
			return "";
		}
		const wochentage = [
			"Sonntag",
			"Montag",
			"Dienstag",
			"Mittwoch",
			"Donnerstag",
			"Freitag",
			"Samstag",
		];
		const monate = [
			"Januar",
			"Februar",
			"März",
			"April",
			"Mai",
			"Juni",
			"Juli",
			"August",
			"September",
			"Oktober",
			"November",
			"Dezember",
		];
		let jetzt = new Date(),
			datum = wochentage[jetzt.getDay()] + ", " + jetzt.getDate().toString().replace(/^0/, "") + ". " + monate[jetzt.getMonth()] + " " + jetzt.getFullYear();
		if (opt.format === "html" &&
				opt.optStylesheet) {
			return `<span>${datum}</span>`;
		} else {
			return ` – ${datum}`;
		}
	},
	// Exportieren: Tabellenkopf erstellen
	//   spaltenCenter = Array
	//     (Index-Liste mit zentrierten Spalten)
	exportierenTabellenkopf (spaltenCenter) {
		const opt = karteisucheExport.exportierenOpt;
		// kein Tabellenkopf gewünscht
		if (opt.format === "html" &&
				!opt.optTabellenkopf) {
			return "";
		}
		// Tabellenkopf gewünscht
		const spalten = {
			feldNummerierung: {
				lang: " ",
				kurz: " ",
			},
			feldLemma: {
				lang: "Lemma",
				kurz: "Lemma",
			},
			feldArtikel: {
				lang: "Artikel",
				kurz: "Artikel",
			},
			feldHauptlemma: {
				lang: "Haupt&shy;lemma",
				kurz: "HL",
			},
			feldNebenlemma: {
				lang: "Neben&shy;lemma",
				kurz: "NL",
			},
			feldRedaktionStatus: {
				lang: " ",
				kurz: " ",
			},
			feldRedaktionErstellt: {
				lang: "Artikel<br>erstellt",
				kurz: "erstellt",
			},
			feldRedaktionOnline: {
				lang: "Artikel<br>online",
				kurz: "online",
			},
			feldRedaktionText: {
				lang: "Redaktions&shy;status",
				kurz: "Status",
			},
			feldBehandelt: {
				lang: "behandelt<br>in/mit",
				kurz: "in/mit",
			},
			feldKarteiDurch: {
				lang: "AutorIn<br>Kartei",
				kurz: "Kartei",
			},
			feldKarteiAm: {
				lang: "Datum<br>Kartei",
				kurz: "Datum",
			},
			feldArtikelDurch: {
				lang: "AutorIn<br>Artikel",
				kurz: "Artikel",
			},
			feldArtikelAm: {
				lang: "Datum<br>Artikel",
				kurz: "Datum",
			},
			feldNotizen: {
				lang: "Notizen",
				kurz: "Notizen",
			},
		};
		let kopf = "",
			n = -1;
		for (const [spalte, texte] of Object.entries(spalten)) {
			if (!opt[spalte]) {
				continue;
			}
			n++;
			const text = opt.optTabellenkopfKurz ? texte.kurz : texte.lang;
			if (opt.format === "html") {
				kopf += "<th";
				if (opt.optStylesheet &&
						spaltenCenter.includes(n)) {
					kopf += ' class="center"';
				}
				kopf += `>${text}</th>`;
			} else if (opt.format === "md") {
				kopf += `| ${text} `;
			}
		}
		if (opt.format === "html") {
			return `<tr>${kopf}</tr>\n`;
		} else if (opt.format === "md") {
			kopf += "|\n";
			for (let i = 0; i <= n; i++) {
				if (spaltenCenter.includes(i)) {
					kopf += "| :---: ";
				} else {
					kopf += "| :--- ";
				}
			}
			kopf+= "|\n";
			return kopf;
		}
	},
	// Exportieren: Karteiliste automatisch speichern
	//   vars = Object
	//     (Pfade: vars.quelle, vars.ziel; Vorlagen-Index: vars.vorlage)
	async exportierenAuto (vars) {
		const { ipcRenderer: ipc } = require("electron");
		let opt = optionen.data["karteisuche-export-vorlagen"];
		if (!opt.length) {
			karteisucheExport.vorlagenFillOpt();
			opt = optionen.data["karteisuche-export-vorlagen"];
		}

		// Vorlage vorhanden?
		if (typeof vars.vorlage === "undefined") {
			vars.vorlage = 0;
		} else {
			vars.vorlage = parseInt(vars.vorlage, 10);
		}
		if (!opt[vars.vorlage]) {
			ipc.invoke("cli-message", `Fehler: Vorlage ${vars.vorlage} nicht gefunden`);
			return false;
		}

		// Format ermitteln
		const format = opt[vars.vorlage].inputs.includes("format-html") ? "html" : "md";
		const titel = opt[vars.vorlage].titel || "Karteiliste";

		// Ordner überprüfen
		const result = await helfer.cliFolderCheck({
			format,
			typ: titel,
			vars,
		});
		if (result === false) {
			return false;
		}
		vars = result;

		// Message
		ipc.invoke("cli-message", `Exportiere Karteiliste "${titel}" nach ${vars.ziel}`);

		// Karteisuche aufrufen
		await karteisuche.oeffnen();

		// ggf. Quellpfad in Liste ergänzen
		let pfadBereinigen = false;
		if (!optionen.data.karteisuche.pfade.includes(vars.quelle)) {
			optionen.data.karteisuche.pfade.push(vars.quelle);
			karteisuche.pfadeAuflisten();
			pfadBereinigen = true;
		}

		// Filter: Backup erstellen und temporär entfernen
		let filter = [];
		for (const f of optionen.data.karteisuche.filter) {
			filter.push([...f]);
		}
		document.querySelectorAll("#karteisuche-filter .icon-loeschen").forEach(a => a.click());

		// nur der Quellpfad darf aktiv sein
		document.querySelectorAll("#karteisuche-pfade input").forEach(i => {
			if (i.value !== vars.quelle) {
				i.checked = false;
			}
		});

		// Suche durchführen > Exportfenster öffnen > Vorlage laden > Dateidaten ermitteln
		await karteisuche.suchenPrep();
		karteisucheExport.oeffnen();
		karteisucheExport.vorlageLaden(vars.vorlage);
		const content = karteisucheExport.exportieren(true);

		// Daten speichern
		const fsP = require("fs").promises;
		const writeResult = await new Promise(resolve => {
			fsP.writeFile(vars.ziel, content)
				.then(async () => {
					// alle Pfade abhaken
					document.querySelectorAll("#karteisuche-pfade input").forEach(i => i.checked = true);

					// ggf. Quellpfad wieder aus der Liste entfernen
					if (pfadBereinigen) {
						const idx = optionen.data.karteisuche.pfade.indexOf(vars.quelle);
						optionen.data.karteisuche.pfade.splice(idx, 1);
						karteisuche.pfadeAuflisten();
					}

					// Filter wiederherstellen
					filterWieder();

					// Fenster schließen
					await overlay.alleSchliessen();

					// Promise auflösen
					resolve(true);
				})
				.catch(err => {
					// Filter wiederherstellen
					filterWieder();

					// Fehlermeldung
					ipc.invoke("cli-message", `Fehler: ${err.name} – ${err.message}`);

					// Promise auflösen
					resolve(false);
				});
		});
		return writeResult;

		// Filter wiederherstellen
		function filterWieder () {
			for (const f of filter) {
				optionen.data.karteisuche.filter.push([...f]);
			}
			karteisuche.filterWiederherstellen();
		}
	},
	// Vorlagen
	vorlagen: [
		{
			name: "1 Stichwortübersicht",
			titel: "Stichwortliste",
			inputs: [
				"format-html",
				"optionen-datum",
				"optionen-tabellenkopf",
				"optionen-tabellenkopf-kurz",
				"optionen-varianten-trennen",
				"optionen-initialien",
				"optionen-stylesheet",
				"felder-lemma",
				"felder-hauptlemma",
				"felder-redaktion-status",
				"felder-redaktion-text",
				"felder-behandelt",
				"felder-kartei-durch",
				"felder-notizen",
			],
		},
		{
			name: "2 Artikelübersicht",
			titel: "Artikelliste",
			inputs: [
				"format-html",
				"optionen-datum",
				"optionen-tabellenkopf",
				"optionen-tabellenkopf-kurz",
				"optionen-initialien",
				"optionen-stylesheet",
				"felder-nummerierung",
				"felder-artikel",
				"felder-redaktion-status",
				"felder-redaktion-text",
				"felder-kartei-durch",
				"felder-notizen",
			],
		},
		{
			name: "3 Statistik",
			titel: "Stichwortliste",
			inputs: [
				"format-html",
				"optionen-tabellenkopf",
				"optionen-tabellenkopf-kurz",
				"felder-nummerierung",
				"felder-lemma",
				"felder-nebenlemma",
				"felder-redaktion-text",
			],
		},
		{
			name: "4 ausführliche Tabellen",
			titel: "Stichwortliste",
			inputs: [
				"format-html",
				"optionen-datum",
				"optionen-alphabet",
				"optionen-tabellenkopf",
				"optionen-varianten-trennen",
				"optionen-stylesheet",
				"felder-lemma",
				"felder-redaktion-status",
				"felder-redaktion-text",
				"felder-behandelt",
				"felder-kartei-durch",
				"felder-kartei-am",
				"felder-artikel-durch",
				"felder-artikel-am",
				"felder-notizen",
			],
		},
	],
	// Vorlagen auflisten
	vorlagenListe () {
		let opt = optionen.data["karteisuche-export-vorlagen"],
			vorlagen = document.querySelector("#karteisuche-export-vorlagen");
		vorlagen.replaceChildren();
		for (let i = 0, len = opt.length; i < len; i++) {
			let p = document.createElement("p");
			vorlagen.appendChild(p);
			p.dataset.idx = i;
			// Löschlink
			if (len > 1) {
				let del = document.createElement("a");
				p.appendChild(del);
				del.classList.add("icon-link", "icon-muelleimer");
				del.href = "#";
				del.textContent = " ";
				del.title = "diese Vorlage löschen";
				karteisucheExport.vorlagenToolsListener(del);
			}
			// Vorlagentext
			let text = document.createElement("a");
			p.appendChild(text);
			text.classList.add("karteisuche-export-vorlage");
			text.href = "#";
			text.textContent = opt[i].name;
			karteisucheExport.vorlagenToolsListener(text);
		}
	},
	// Vorlage laden
	//   idx = Number
	//     (Index der zu ladenden Vorlage)
	vorlageLaden (idx) {
		// Inputs zurücksetzen
		document.querySelectorAll("#karteisuche-export-form input").forEach(i => {
			if (i.type === "text") {
				i.value = "";
			} else {
				i.checked = false;
			}
		});
		// Inputs abhaken
		const titel = optionen.data["karteisuche-export-vorlagen"][idx].titel || "Karteiliste";
		document.querySelector("#karteisuche-export-optionen-titel").value = titel;
		const inputs = optionen.data["karteisuche-export-vorlagen"][idx].inputs;
		for (const i of inputs) {
			const box = document.querySelector(`#karteisuche-export-${i}`);
			if (box) {
				box.checked = true;
			}
		}
	},
	// Vorlagen-Tools (Listener)
	//   a = Element
	//     (Tool-Link)
	vorlagenToolsListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			karteisucheExport.vorlagenTools(this);
		});
	},
	// Vorlagen-Tools
	//   a = Element
	//     (Tool-Link)
	async vorlagenTools (a) {
		if (/tools-add$/.test(a.id)) { // Vorlage hinzufügen
			karteisucheExport.vorlagenToolsAdd();
		} else if (/tools-reset$/.test(a.id)) { // Vorlagen zurücksetzen
			karteisucheExport.vorlagenToolsReset(true);
		} else if (a.classList.contains("icon-muelleimer")) { // Vorlage löschen
			const idx = parseInt(a.parentNode.dataset.idx, 10);
			optionen.data["karteisuche-export-vorlagen"].splice(idx, 1);
			optionen.speichern();
			karteisucheExport.vorlagenListe();
		} else if (a.parentNode.dataset.idx) { // Vorlage laden
			const idx = parseInt(a.parentNode.dataset.idx, 10);
			karteisucheExport.vorlageLaden(idx);
		}
	},
	// Vorlagen-Tools: Hinzufügen
	async vorlagenToolsAdd () {
		let name = "";
		const result = await new Promise(resolve => {
			dialog.oeffnen({
				typ: "prompt",
				text: "Welchen Namen soll die Vorlage haben?",
				platzhalter: "Vorlage",
				callback: () => {
					const eingabe = dialog.getPromptText();
					if (dialog.antwort && !eingabe) {
						dialog.oeffnen({
							typ: "alert",
							text: "Sie haben keinen Namen eingegeben.\nDie Vorlage wurde nicht gespeichert.",
						});
						resolve(false);
					} else if (dialog.antwort && eingabe) {
						name = eingabe;
						resolve(true);
					} else {
						resolve(false);
					}
				},
			});
		});
		if (!result) {
			return;
		}
		// neue Vorlage anlegen
		let inputs = [];
		document.querySelectorAll("#karteisuche-export-form input").forEach(i => {
			if (i.checked) {
				const id = i.id.replace(/^karteisuche-export-/, "");
				inputs.push(id);
			}
		});
		const titel = document.querySelector("#karteisuche-export-optionen-titel").value.trim() || "Karteiliste",
			idx = optionen.data["karteisuche-export-vorlagen"].findIndex(i => i.name === name);
		if (idx >= 0) {
			optionen.data["karteisuche-export-vorlagen"].splice(idx, 1, {
				name,
				titel,
				inputs,
			});
		} else {
			optionen.data["karteisuche-export-vorlagen"].push({
				name,
				titel,
				inputs,
			});
		}
		// Vorlagen sortieren
		optionen.data["karteisuche-export-vorlagen"].sort((a, b) => {
			const x = [a.name, b.name];
			x.sort(helfer.sortAlpha);
			if (x[0] === a.name) {
				return -1;
			}
			return 1;
		});
		// Abschluss
		optionen.speichern();
		karteisucheExport.vorlagenListe();
	},
	// Vorlagen-Tools: Zurücksetzen
	//   fragen = Boolean
	//     (Sicherheitsfrage muss bei der Initialisierung unterdrückt werden)
	async vorlagenToolsReset (fragen) {
		// Sicherheitsfrage
		if (fragen) {
			const result = await new Promise(resolve => {
				dialog.oeffnen({
					typ: "confirm",
					text: "Sollen die Vorlagen wirklich zurückgesetzt werden?\nSelbst definierte Vorlagen gehen dabei verloren.",
					callback: () => resolve(dialog.antwort),
				});
			});
			if (!result) {
				return;
			}
		}
		// Zurücksetzen
		karteisucheExport.vorlagenFillOpt();
		karteisucheExport.vorlagenListe();
	},
	// Vorlagen-Tools: Optionen mit Standardvorlagen füllen
	vorlagenFillOpt () {
		optionen.data["karteisuche-export-vorlagen"] = [];
		let opt = optionen.data["karteisuche-export-vorlagen"];
		for (const i of karteisucheExport.vorlagen) {
			opt.push({
				name: i.name,
				titel: i.titel,
				inputs: [...i.inputs],
			});
		}
		optionen.speichern();
	},
	// Datei speichern
	// (Funktion wird auch für das Speichern der Literaturdatenbank genutzt)
	//   content = String
	//     (die Daten)
	//   format = Object
	//     (Angaben zum Format und Inhalt der Daten)
	async speichern (content, format) {
		const path = require("path");
		const opt = {
			title: `${format.name} speichern`,
			defaultPath: path.join(appInfo.documents, `${format.content}.${format.ext}`),
			filters: [
				{
					name: `${format.name}-Dateien`,
					extensions: [format.ext],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		const result = await ipcRenderer.invoke("datei-dialog", {
			open: false,
			winId: winInfo.winId,
			opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Kartei speichern
		const fsP = require("fs").promises;
		fsP.writeFile(result.filePath, content)
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Speichern der ${format.content} ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`,
				});
			});
	},
};
