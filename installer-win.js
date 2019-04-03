"use strict";

const electronInstaller = require("electron-winstaller");

let resultPromise = electronInstaller.createWindowsInstaller({
	appDirectory: "../dist/zettelstraum-win32-x64",
	outputDirectory: "../dist/installer-win",
	setupIcon: "img/icon/win/icon.ico",
	setupExe: "ZettelsTraum.exe",
	authors: "Nico Dorn"
});

resultPromise.then( () => console.log("Installer erstellt!"), (err) => console.log(`FEHLER!\n${err.message}`) );
