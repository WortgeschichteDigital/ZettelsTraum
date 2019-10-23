"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(dmg|tar\.gz)$/.test(typ)) {
	typ = "dmg";
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
		targets: Platform.MAC.createTarget(null, Arch.x64),
		config: {
			appId: "zdl.wgd.zettelstraum",
			productName: "zettelstraum",
			copyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
			directories: {
				output: "../build",
			},
			mac: {
				target: typ,
				icon: "img/icon/mac/icon.icns",
				category: "public.app-category.utilities",
			},
			[typ]: {
				artifactName: "zettelstraum_${version}_${arch}.${ext}",
				background: "installer/mac-background.png",
				title: "${productName} ${version}",
			},
			fileAssociations: [
				{
					ext: "wgd",
					name: "x-wgd",
					icon: "resources/filetype/mac/wgd.icns",
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
	if (typ === "tar.gz") {
		delete config.config["tar.gz"];
	}
}

// Installer
function startInstaller () {
	builder.build(config)
		.then(() => {
			if (typ === "tar.gz") {
				console.log("macOS-Paketierung erstellt!");
			} else {
				console.log("macOS-Installer erstellt!");
			}
		})
		.catch(err => {
			console.log(new Error(err));
			process.exit(1);
		});
}
