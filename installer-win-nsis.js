"use strict";

// Jahresangaben für Copyright ermitteln
let jahr = "2019",
	jahr_aktuell = new Date().getFullYear();
if (jahr_aktuell > 2019) {
	jahr += `–${jahr_aktuell}`;
}

// Installer erstellen
const builder = require("electron-builder"),
	Platform = builder.Platform;
builder.build({
	targets: Platform.WINDOWS.createTarget(),
	config: {
		"appId": "zdl.wgd.zettelstraum",
		"productName": "ZettelsTraum",
		"copyright": `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
		"directories": {
			"output": "../dist/"
		},
		"win": {
			"target": "nsis",
			"icon": "img/icon/win/icon.ico"
		},
		"nsis": {
			"artifactName": "zettelstraum-${version}.${ext}",
			"license": "licenses/Zettel's Traum.txt",
			"deleteAppDataOnUninstall": true,
			"shortcutName": "Zettel’s Traum"
		},
		"fileAssociations": [
			{
				"ext": "wgd",
				"name": "wgd",
				"description": "Wortgeschichte digital-Datei",
				"icon": "img/filetype/win/wgd.ico"
			}
		]
	}
})
.then(() => console.log("\nWindows-Installer erstellt!"))
.catch((err) => console.log(`\nFEHLER!\n${err}`));
