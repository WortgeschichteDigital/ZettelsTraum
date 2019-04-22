"use strict";

// Jahresangaben für Copyright ermitteln
let jahr = "2019",
	jahr_aktuell = new Date().getFullYear();
if (jahr_aktuell > 2019) {
	jahr += `–${jahr_aktuell}`;
}

// Schlagwörter ermitteln
const fs = require("fs"),
	keywords = JSON.parse(fs.readFileSync("package.json")).keywords.join(";");

// Installer erstellen
const builder = require("electron-builder"),
	Arch = builder.Arch,
	Platform = builder.Platform;
builder.build({
	targets: Platform.LINUX.createTarget(null, Arch.x64),
	config: {
		"appId": "zdl.wgd.zettelstraum",
		"productName": "zettelstraum",
		"copyright": `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
		"directories": {
			"output": "../build/"
		},
		"linux": {
			"target": "deb",
			"executableName": "zettelstraum",
			"artifactName": "zettelstraum_${version}_${arch}.${ext}",
			"icon": "img/icon/linux/",
			"synopsis": "Wortkartei-App von „Wortgeschichte digital“",
			"category": "Science",
			"desktop": {
				"Name": "Zettel’s Traum",
				"Keywords": `${keywords};`
			}
		},
		"deb": {
			"packageCategory": "science",
			"priority": "optional",
			"afterInstall": "/home/nico/Web/webapps/zettelstraum/app/installer/deb-after-install.sh",
			"afterRemove": "/home/nico/Web/webapps/zettelstraum/app/installer/deb-after-remove.sh"
		},
		"fileAssociations": [
			{
				"ext": "wgd",
				"name": "x-wgd",
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
