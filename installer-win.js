"use strict";

// Vorbereitung
const builder = require("electron-builder"),
	Arch = builder.Arch,
	Platform = builder.Platform,
	prepare = require("./installer.js"),
	jahr = prepare.getYear();
let config = {};

prepare.makeBuild()
.then(function() {
	makeConfig();
	startInstaller();
})
.catch((err) => console.log(err));

// Konfiguration
function makeConfig () {
	config = {
		targets: Platform.WINDOWS.createTarget(null, Arch.x64),
		config: {
			appId: "zdl.wgd.zettelstraum",
			productName: "Zettel’s Traum",
			copyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
			directories: {
				output: "../build",
			},
			win: {
				target: "nsis",
				icon: "img/icon/win/icon.ico",
			},
			nsis: {
				artifactName: "zettelstraum_${version}_x64.${ext}",
				license: "LICENSE.ZettelsTraum.txt",
				shortcutName: "Zettel’s Traum",
			},
			fileAssociations: [
				{
					ext: "wgd",
					name: "wgd",
					description: "Wortgeschichte digital-Datei",
					icon: "resources/filetype/win/wgd.ico",
				},
			],
			extraResources: [
				{
					from: "resources/Sachgebiete.xml",
					to: "Sachgebiete.xml",
				},
				{
					from: "resources/filetype",
					to: "filetype",
				},
			],
		},
	};
}

// Installer
function startInstaller () {
	builder.build(config)
	.then(() => console.log("\nWindows-Installer erstellt!"))
	.catch((err) => console.log(`\nFEHLER!\n${err}`));
}
