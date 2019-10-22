"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(darwin|linux|win32)$/.test(typ)) {
	typ = "linux";
}

// Vorbereitung
const packager = require("electron-packager"),
	prepare = require("./installer.js"),
	jahr = prepare.getYear();

let config = {
	arch: "x64",
	dir: "./",
	out: "../build",
	executableName: "zettelstraum",
	extraResource: "resources",
	ignore: [/node_modules/, /package-lock\.json/],
	overwrite: true,
	asar: true,
	prune: true,
	junk: true,
	name: "Zettel’s Traum",
	appCopyright: `© ${jahr} Akademie der Wissenschaften zu Göttingen`,
};

switch (typ) {
	case "darwin":
		config.platform = "darwin";
		config.icon = "img/icon/mac/icon.icns";
		config.appCategoryType = "public.app-category.utilities";
		break;
	case "linux":
		config.platform = "linux";
		break;
	case "win32":
		config.platform = "win32";
		config.icon = "img/icon/win/icon.ico";
		config.win32metadata = {
			CompanyName: "Nico Dorn <ndorn@gwdg.de>",
			FileDescription: "Zettel’s Traum",
			ProductName: "Zettel’s Traum",
			InternalName: "Zettel’s Traum",
		};
		break;
}

// Paketierer
packager(config)
	.then(paths => {
		let os = "Linux";
		if (typ === "darwin") {
			os = "macOS";
		} else if (typ === "win32") {
			os = "Windows";
		}
		console.log(`\n${os}-Paketierung erstellt!\n  ${paths[0]}`);
	})
	.catch( err => console.log(new Error(err)) );
