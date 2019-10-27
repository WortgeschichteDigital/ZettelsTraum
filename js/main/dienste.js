"use strict";

const {BrowserWindow} = require("electron"),
	fs = require("fs"),
	fsP = fs.promises,
	path = require("path");

let svg = [];

module.exports = {
	// erzeugt eine Liste der *.svg im Verzeichnis ./app/img/
	async bilder () {
		if (svg.length) {
			return svg;
		}
		let pfade = await fsP.readdir(path.join(__dirname, "../", "../", "img"));
		for (let p of pfade) {
			let stat = await fsP.lstat(path.join(__dirname, "../", "../", "img", p));
			if (stat.isDirectory()) {
				continue;
			}
			svg.push(p);
		}
		return svg;
	},
	// führt Roles aus, die nicht über das Programmmenü, sondern Icons in der
	// Quick-Access-Bar aufgerufen wurden
	//   contents = Object
	//     (der Web-Content, in dem der Befehl ausgeführt werden soll)
	//   befehl = String
	//     (der Befehl, der ausgeführt werden soll)
	quickRoles (contents, befehl) {
		switch(befehl) {
			case "bearbeiten-rueckgaengig":
				contents.undo();
				break;
			case "bearbeiten-wiederherstellen":
				contents.redo();
				break;
			case "bearbeiten-ausschneiden":
				contents.cut();
				break;
			case "bearbeiten-kopieren":
				contents.copy();
				break;
			case "bearbeiten-einfuegen":
				contents.paste();
				break;
			case "bearbeiten-alles-auswaehlen":
				contents.selectAll();
				break;
			case "ansicht-anzeige-vergroessern":
				const faktorGroesser = Math.round((contents.getZoomFactor() + 0.1) * 10) / 10;
				contents.setZoomFactor(faktorGroesser);
				break;
			case "ansicht-anzeige-verkleinern":
				const faktorKleiner = Math.round((contents.getZoomFactor() - 0.1) * 10) / 10;
				contents.setZoomFactor(faktorKleiner);
				break;
			case "ansicht-standardgroesse":
				contents.setZoomFactor(1);
				break;
			case "ansicht-vollbild":
				let win = BrowserWindow.fromWebContents(contents);
				if (win.isFullScreen()) {
					win.setFullScreen(false);
				} else {
					win.setFullScreen(true);
				}
				break;
		}
	},
};
