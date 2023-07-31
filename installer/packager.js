"use strict";

// Pakettyp
let typ = process.argv[2];
if (!typ || !/^(darwin|linux|win32)$/.test(typ)) {
  typ = "linux";
}

// Vorbereitung
const packager = require("electron-packager"),
  prepare = require("./installer"),
  jahr = prepare.getYear();

let config = {
  platform: typ,
  arch: "x64",
  dir: "./",
  out: process.argv[3] || "../build",
  executableName: "zettelstraum",
  extraResource: "./resources",
  ignore: [/node_modules/, /package-lock\.json/],
  overwrite: true,
  asar: true,
  prune: true,
  junk: true,
  name: "Zettel’s Traum",
  appCopyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
};

switch (typ) {
  case "darwin":
    config.icon = "./img/icon/mac/icon.icns";
    config.appCategoryType = "public.app-category.utilities";
    break;
  case "win32":
    config.icon = "./img/icon/win/icon.ico";
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
  .then(async () => {
    const fs = require("fs"),
      fsPromises = fs.promises,
      ordnerAlt = `Zettel’s Traum-${typ}-x64`,
      ordnerNeu = `zettelstraum-${typ}-x64`;
    // ggf. alten Ordner umbenennen
    // (fsPromises.rmdir() hat zwar einen rekursiven Modus,
    // ist aber noch experimentell und funktioniert nicht gut)
    let renameCount = 0,
      renameString = "";
    while (fs.existsSync(`${config.out}/${ordnerNeu}${renameString}`)) {
      renameCount++;
      renameString = `-old.${renameCount}`;
    }
    if (renameCount > 0) {
      await fsPromises.rename(`${config.out}/${ordnerNeu}`, `${config.out}/${ordnerNeu}${renameString}`);
    }
    // Ordner umbenennen
    await fsPromises.rename(`${config.out}/${ordnerAlt}`, `${config.out}/${ordnerNeu}`);
    // Resources müssen umkopiert werden
    let resources = `${config.out}/${ordnerNeu}/resources`;
    if (typ === "darwin") {
      resources = `${config.out}/${ordnerNeu}/Zettel’s Traum.app/Contents/Resources`;
    }
    let files = await fsPromises.readdir(`${resources}/resources`);
    for (let f of files) {
      await fsPromises.rename(`${resources}/resources/${f}`, `${resources}/${f}`);
    }
    await fsPromises.rmdir(`${resources}/resources`);
    // Feedback
    let os = "Linux";
    if (typ === "darwin") {
      os = "macOS";
    } else if (typ === "win32") {
      os = "Windows";
    }
    console.log(`${os}-Paketierung erstellt!`);
  })
  .catch(err => {
    console.log(new Error(err));
    process.exit(1);
  });
