"use strict";

const fs = require("fs");

module.exports = {
	// Build-Ordner überprüfen
	makeBuild () {
		return new Promise(function(resolve, reject) {
			if (!fs.existsSync("../build")) {
				fs.mkdir("../build", function(err) {
					if (err) {
						reject(`\nFEHLER!\n${err}`);
					} else {
						resolve();
					}
				});
			} else {
				resolve();
			}
		});
	},
	// ggf. leeren Changelog erstellen
	makeChangelog () {
		return new Promise(function(resolve, reject) {
			if (!fs.existsSync("../build/changelog")) {
				fs.writeFile("../build/changelog", "", function(err) {
					if (err) {
						reject(`\nFEHLER!\n${err}`);
					} else {
						resolve();
					}
				});
			} else {
				resolve();
			}
		});
	},
	// Schlagwörter ermitteln
	getKeywords () {
		return new Promise(function(resolve, reject) {
			fs.readFile("package.json", "utf-8", function(err, content) {
				if (err) {
					reject(`\nFEHLER!\n${err.message}`);
				} else {
					resolve(JSON.parse(content).keywords.join(";"));
				}
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
