"use strict";

const fs = require("fs");
const fsPromises = fs.promises;

module.exports = {
  // Build-Ordner überprüfen
  makeBuild () {
    return new Promise(resolve => {
      if (!fs.existsSync("../build")) {
        fsPromises.mkdir("../build")
          .then(() => {
            resolve(true);
          })
          .catch(err => {
            throw new Error(err.message);
          });
      } else {
        resolve(true);
      }
    });
  },

  // ggf. leeren Changelog erstellen
  makeChangelog () {
    return new Promise(resolve => {
      if (!fs.existsSync("../build/changelog")) {
        fsPromises.writeFile("../build/changelog", "")
          .then(() => {
            resolve(true);
          })
          .catch(err => {
            throw new Error(err.message);
          });
      } else {
        resolve(true);
      }
    });
  },

  // Schlagwörter ermitteln
  getKeywords () {
    return new Promise(resolve => {
      fsPromises.readFile("./package.json", {
        encoding: "utf8",
      })
        .then(result => {
          resolve(JSON.parse(result).keywords.join(";"));
        })
        .catch(err => {
          throw new Error(err.message);
        });
    });
  },

  // Jahresangaben für Copyright ermitteln
  getYear () {
    let jahr = "2019";
    const jahr_aktuell = new Date().getFullYear();
    if (jahr_aktuell > 2019) {
      jahr += `–${jahr_aktuell}`;
    }
    return jahr;
  },
};
