"use strict";

// Versions-Nummer einlesen
const fs = require("fs");
const version = JSON.parse(fs.readFileSync("package.json")).version;

// Installer bauen
const electronInstaller = require("electron-winstaller");
let resultPromise = electronInstaller.createWindowsInstaller({
	appDirectory: "../dist/zettelstraum-win32-x64",
	outputDirectory: "../dist/installer-win",
	setupIcon: "img/icon/win/icon.ico",
	setupExe: `ZettelsTraum-${version}.exe`,
	authors: "Nico Dorn"
});
resultPromise.then(() => console.log("Installer erstellt!"), (err) => console.log(`FEHLER!\n${err.message}`));
