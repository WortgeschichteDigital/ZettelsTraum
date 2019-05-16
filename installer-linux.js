"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(deb|rpm)/.test(typ)) {
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
.then(() => prepare.makeChangelog())
.then(() => prepare.getKeywords())
.then(function(result) {
	keywords = result;
	makeConfig();
	startInstaller();
})
.catch((err) => console.log(err));

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
					Keywords: `${keywords};`,
				},
			},
			[typ]: {
				packageCategory: "science",
				afterInstall: "installer/linux-after-install.sh",
				afterRemove: "installer/linux-after-remove.sh",
				fpm: [
					"--license=GPL-3.0-only"
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
	// Anpassungen
	if (typ === "deb") {
		config.config[typ].priority = "optional";
		config.config[typ].fpm.push("--deb-changelog=../build/changelog");
	} else if (typ === "rpm") {
		config.config[typ].fpm.push("--rpm-changelog=../build/changelog");
	}
}

// Installer
function startInstaller () {
	builder.build(config)
	.then(() => console.log("\nLinux-Installer erstellt!"))
	.catch((err) => console.log(`\nFEHLER!\n${err}`));
}
