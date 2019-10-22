"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(appImage|deb|rpm|tar\.gz)$/.test(typ)) {
	typ = "deb";
}

// Vorbereitung
const builder = require("electron-builder"),
	Arch = builder.Arch,
	Platform = builder.Platform,
	prepare = require("./installer.js"),
	jahr = prepare.getYear();
let keywords = "",
	config = {};

prepare.makeBuild()
	.then(() => {
		if (/^(appImage|tar\.gz)$/.test(typ)) {
			return false;
		} else {
			prepare.makeChangelog();
		}
	})
	.then(() => {
		if (/^(appImage|tar\.gz)$/.test(typ)) {
			return false;
		} else {
			prepare.getKeywords();
		}
	})
	.then(result => {
		if (result) {
			keywords = `${result};`;
		}
		makeConfig();
		startInstaller();
	})
	.catch(err => console.log(err));

// Konfiguration
function makeConfig () {
	config = {
		targets: Platform.LINUX.createTarget(null, Arch.x64),
		config: {
			appId: "zdl.wgd.zettelstraum",
			productName: "zettelstraum",
			copyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
			directories: {
				output: "../build",
			},
			linux: {
				target: typ,
				executableName: "zettelstraum",
				artifactName: "zettelstraum_${version}_${arch}.${ext}",
				icon: "img/icon/linux/",
				synopsis: "Wortkartei-App von „Wortgeschichte digital“",
				category: "Science",
				desktop: {
					Name: "Zettel’s Traum",
					Keywords: keywords,
				},
			},
			[typ]: {
				packageCategory: "science",
				afterInstall: "installer/linux-after-install.sh",
				afterRemove: "installer/linux-after-remove.sh",
				fpm: [
					`--${typ}-changelog=../build/changelog`,
				],
			},
			fileAssociations: [
				{
					ext: "wgd",
					name: "x-wgd",
					mimeType: "application/x-wgd",
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
	if (typ === "appImage") {
		delete config.config.appImage;
		config.config.appImage = {
			license: "LICENSE.ZettelsTraum.txt",
		};
	} else if (typ === "deb") {
		config.config[typ].priority = "optional";
	} else if (typ === "tar.gz") {
		delete config.config["tar.gz"];
	}
}

// Installer
function startInstaller () {
	builder.build(config)
		.then(() => {
			if (/^(appImage|tar\.gz)$/.test(typ)) {
				console.log("\nLinux-Paketierung erstellt!");
			} else {
				console.log("\nLinux-Installer erstellt!");
			}
		})
		.catch(err => console.log(err));
}
