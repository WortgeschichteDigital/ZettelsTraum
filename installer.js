"use strict";

const fs = require("fs");

module.exports = {
	// Build-Ordner überprüfen
	makeBuild () {
		return new Promise(resolve => {
			if (!fs.existsSync("../build")) {
				fs.mkdir("../build", err => {
					if (err) {
						throw new Error(err.message);
					}
					resolve(true);
				});
			} else {
				resolve(true);
			}
		});
	},
	// ggf. leeren Changelog erstellen
	makeChangelog () {
		return new Promise(resolve => {
			if (!fs.existsSync("../build/changelog")) {
				fs.writeFile("../build/changelog", "", err => {
					if (err) {
						throw new Error(err.message);
					}
					resolve(true);
				});
			} else {
				resolve(true);
			}
		});
	},
	// Schlagwörter ermitteln
	getKeywords () {
		return new Promise(resolve => {
			fs.readFile("package.json", "utf-8", (err, content) => {
				if (err) {
					throw new Error(err.message);
				}
				resolve(JSON.parse(content).keywords.join(";"));
			});
		});
	},
	// Jahresangaben für Copyright ermitteln
	getYear () {
		let jahr = "2019",
			jahr_aktuell = new Date().getFullYear();
		if (jahr_aktuell > 2019) {
			jahr += `–${jahr_aktuell}`;
		}
		return jahr;
	},
};
