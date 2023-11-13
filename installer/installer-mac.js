"use strict";

// Pakettyp
const typ = "dmg";

// Maintainer-Mail
let email = process.argv[3];
if (!email || !/^.+@.+\..+$/.test(email)) {
  email = "no-reply@adress.com";
}

// Vorbereitung
const builder = require("electron-builder");
const Arch = builder.Arch;
const Platform = builder.Platform;
const prepare = require("./installer");
const jahr = prepare.getYear();
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
      extraMetadata: {
        author: {
          email,
        },
      },
      appId: "zdl.wgd.zettelstraum",
      productName: "zettelstraum",
      copyright: `© ${jahr}, Akademie der Wissenschaften zu Göttingen`,
      directories: {
        output: "../build",
      },
      mac: {
        target: typ,
        icon: "./img/icon/mac/icon.icns",
        category: "public.app-category.utilities",
      },
      [typ]: {
        artifactName: "zettelstraum_${version}_${arch}.${ext}",
        background: "./installer/mac-background.png",
        title: "${productName} ${version}",
      },
      fileAssociations: [
        {
          ext: "ztj",
          name: "x-ztj",
          icon: "./resources/filetype/mac/ztj.icns",
        },
      ],
      extraResources: [
        {
          from: "./resources",
          to: "./",
          filter: [ "*.ztj", "*.xml", "filetype" ],
        },
      ],
    },
  };
}

// Installer
function startInstaller () {
  builder.build(config)
    .then(() => console.log("macOS-Installer erstellt!"))
    .catch(err => {
      console.log(new Error(err));
      process.exit(1);
    });
}
