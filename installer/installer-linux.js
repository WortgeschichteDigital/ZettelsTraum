"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(appImage|deb|rpm)$/.test(typ)) {
	typ = "deb";
}

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
let keywords = "",
	config = {};

prepare.makeBuild()
	.then(async () => {
		if (typ === "appImage") {
			return;
		} else {
			await prepare.makeChangelog();
		}
	})
	.then(async () => {
		if (typ === "appImage") {
			return;
		} else {
			keywords = await prepare.getKeywords();
		}
	})
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
		targets: Platform.LINUX.createTarget(null, Arch.x64),
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
			linux: {
				target: typ,
				executableName: "zettelstraum",
				artifactName: "zettelstraum_${version}_${arch}.${ext}",
				icon: "./img/icon/linux/",
				synopsis: "Wortkartei-App von „Wortgeschichte digital“",
				category: "Science",
				desktop: {
					Name: "Zettel’s Traum",
					Keywords: keywords,
				},
			},
			[typ]: {
				packageCategory: "science",
				afterInstall: "./installer/linux-after-install.sh",
				afterRemove: "./installer/linux-after-remove.sh",
				fpm: [
					`--${typ}-changelog=../build/changelog`,
				],
			},
			// "fileAssociations" funktioniert zwar gut, ordnet den ZTJ-Dateien aber
			// kein Datei-Icon zu; ich übernehme das lieber selbst in "linux-after-install.sh"
// 			fileAssociations: [
// 				{
// 					ext: "ztj",
// 					name: "x-ztj",
// 					mimeType: "application/x-ztj",
// 				},
// 			],
			extraResources: [
				{
					from: "./resources",
					to: "./",
					filter: ["*.ztj", "*.xml", "filetype"],
				},
			],
		},
	};
	// Anpassungen
	if (typ === "appImage") {
		delete config.config.appImage;
		config.config.appImage = {
			license: "./LICENSE.ZettelsTraum.txt",
		};
	} else if (typ === "deb") {
		config.config[typ].priority = "optional";
	}
}

// Installer
function startInstaller () {
	builder.build(config)
		.then(() => {
			if (typ === "appImage") {
				console.log("Linux-Paketierung erstellt!");
			} else {
				console.log("Linux-Installer erstellt!");
			}
		})
		.catch(err => {
			console.log(new Error(err));
			process.exit(1);
		});
}
