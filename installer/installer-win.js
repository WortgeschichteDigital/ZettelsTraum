"use strict";

// Pakettyp
let typ = "nsis";

// Maintainer-Mail
let email = process.argv[3];
if (!email || !/^.+@.+\..+$/.test(email)) {
	email = "no-reply@adress.com";
}

// Vorbereitung
const builder = require("electron-builder"),
	Arch = builder.Arch,
	Platform = builder.Platform,
	prepare = require("./installer"),
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
			extraMetadata: {
				author: {
					email: email,
				},
			},
			appId: "zdl.wgd.zettelstraum",
			productName: "zettelstraum",
			copyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
			directories: {
				output: "../build",
			},
			win: {
				target: typ,
				icon: "./img/icon/win/icon.ico",
			},
			[typ]: {
				artifactName: "zettelstraum_${version}_x64.${ext}",
				license: "./LICENSE.ZettelsTraum.txt",
				shortcutName: "Zettel’s Traum",
			},
			fileAssociations: [
				{
					ext: "ztj",
					name: "ztj",
					description: "Wortgeschichte digital-Datei",
					icon: "./resources/filetype/win/ztj.ico",
				},
			],
			extraResources: [
				{
					from: "./resources",
					to: "./",
					filter: ["*.ztj", "*.xml", "filetype"],
				},
			],
		},
	};
}

// Installer
function startInstaller () {
	builder.build(config)
		.then(() => console.log("Windows-Installer erstellt!"))
		.catch(err => {
			console.log(new Error(err));
			process.exit(1);
		});
}
