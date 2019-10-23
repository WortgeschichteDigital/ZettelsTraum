"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(nsis|zip)$/.test(typ)) {
	typ = "nsis";
}

// Vorbereitung
const builder = require("electron-builder"),
	Arch = builder.Arch,
	Platform = builder.Platform,
	prepare = require("./installer.js"),
	jahr = prepare.getYear();
let config = {};

prepare.makeBuild()
	.then(() => {
		makeConfig();
		startInstaller();
	})
	.catch(err => {
		console.log(new Error(err));
		process.exit(1);
	});

// Konfiguration
function makeConfig () {
	config = {
		targets: Platform.WINDOWS.createTarget(null, Arch.x64),
		config: {
			appId: "zdl.wgd.zettelstraum",
			productName: "zettelstraum",
			copyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
			directories: {
				output: "../build",
			},
			win: {
				target: typ,
				icon: "img/icon/win/icon.ico",
			},
			[typ]: {
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
					from: "resources",
					to: "./",
					filter: ["*.wgd", "*.xml", "filetype"],
				},
			],
		},
	};
	// Anpassungen
	if (typ === "zip") {
		config.config.productName = "zettelstraum";
		delete config.config.zip;
	}
}

// Installer
function startInstaller () {
	builder.build(config)
		.then(() => {
			if (typ === "zip") {
				console.log("Windows-Paketierung erstellt!");
			} else {
				console.log("Windows-Installer erstellt!");
			}
		})
		.catch(err => {
			console.log(new Error(err));
			process.exit(1);
		});
}
