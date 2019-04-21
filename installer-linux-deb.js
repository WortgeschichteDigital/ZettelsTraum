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
	targets: Platform.LINUX.createTarget(),
	config: {
		"appId": "zdl.wgd.zettelstraum",
		"productName": "zettelstraum",
		"copyright": `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
		"directories": {
			"output": "../dist/"
		},
		"linux": {
			"target": "deb",
			"executableName": "zettelstraum",
			"icon": "img/icon/linux/",
			"synopsis": "Wortkartei-App von „Wortgeschichte digital“",
			"category": "Science",
			"desktop": {
				"Name": "Zettel’s Traum"
			}
		},
		"fileAssociations": [
			{
				"ext": "wgd",
				"name": "wgd",
				"mimeType": "application/x-wgd"
			}
		],
		"extraResources": [
			"filetype/*/*"
		]
	}
})
.then(() => console.log("\nLinux-Installer erstellt!"))
.catch((err) => console.log(`\nFEHLER!\n${err}`));
