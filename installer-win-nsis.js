"use strict";

// Jahresangaben für Copyright ermitteln
let jahr = "2019",
	jahr_aktuell = new Date().getFullYear();
if (jahr_aktuell > 2019) {
	jahr += `–${jahr_aktuell}`;
}

// Installer erstellen
const builder = require("electron-builder"),
	Arch = builder.Arch,
	Platform = builder.Platform;
builder.build({
	targets: Platform.WINDOWS.createTarget(null, Arch.x64),
	config: {
		"appId": "zdl.wgd.zettelstraum",
		"productName": "Zettel’s Traum",
		"copyright": `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
		"directories": {
			"output": "../build/"
		},
		"win": {
			"target": "nsis",
			"icon": "img/icon/win/icon.ico"
		},
		"nsis": {
			"artifactName": "zettelstraum_${version}_x64.${ext}",
			"license": "LICENSE.ZettelsTraum.txt",
			"shortcutName": "Zettel’s Traum"
		},
		"fileAssociations": [
			{
				"ext": "wgd",
				"name": "wgd",
				"description": "Wortgeschichte digital-Datei",
				"icon": "filetype/win/wgd.ico"
			}
		]
	}
})
.then(() => console.log("\nWindows-Installer erstellt!"))
.catch((err) => console.log(`\nFEHLER!\n${err}`));
