"use strict";

let lock = {
	// Lock-Datei erstellen/überprüfen/löschen
	//   datei = String
	//     (Dateipfad)
	//   aktion = String
	//     (lock, unlock, check)
	//   maxLockTime = Number
	//     (Millisekunden nach denen eine Lockdatei übergangen wird, Standard 12 h)
	actions ({datei, aktion, maxLockTime = 432e5}) {
		return new Promise(async resolve => {
			if (!datei) { // für just erstellte, aber noch nicht gespeicherte Karteien
				resolve(true);
				return;
			}
			let pfad = datei.match(/^(.+[/\\])(.+)$/);
			const fsP = require("fs").promises,
				lockfile = `${pfad[1]}.~lock.${pfad[2]}#`;
			if (aktion === "lock") {
				// alte Datei ggf. löschen
				// (Unter Windows gibt es Probleme, wenn die Datei direkt überschrieben werden soll.
				// Ist das vielleicht ein Node-BUG? Eigentlich sollte das nämlich gehen.)
				const exists = await helfer.exists(lockfile);
				if (exists) {
					const erfolg = await lock.unlink(lockfile);
					if (!erfolg) {
						resolve(false);
						return;
					}
				}
				// Lock-Datei erstellen
				const os = require("os"),
					host = os.hostname(),
					user = os.userInfo().username,
					datum = new Date().toISOString(),
					lockcontent = `${datum};;${host};;${user}`;
				fsP.writeFile(lockfile, lockcontent)
					.then(() => {
						// Datei unter Windows verstecken
						if (process.platform === "win32") {
							const child_process = require("child_process");
							child_process.spawn("cmd.exe", ["/c", "attrib", "+h", lockfile]);
						}
						resolve(true);
					})
					.catch(err => {
						dialog.oeffnen({
							typ: "alert",
							text: `Beim Erstellen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
						});
						resolve(false);
						throw err;
					});
			} else if (aktion === "unlock") {
				const erfolg = await lock.unlink(lockfile);
				resolve(erfolg);
			} else if (aktion === "check") {
				const exists = await helfer.exists(lockfile);
				if (!exists) {
					resolve(false); // keine Lockdatei => nicht gesperrt
					return;
				}
				const lockcontent = await lock.read(lockfile);
				if (!lockcontent) {
					resolve(true); // gesperrt (zur Sicherheit, weil unklarer Status oder Fehler)
					return;
				}
				let datum_host_user = lockcontent.split(";;");
				const os = require("os"),
					host = os.hostname(),
					user = os.userInfo().username;
				// nicht gesperrt, wenn:
				//   derselbe Computer + dieselbe BenutzerIn
				//   vor mehr als n Millisekunden gesperrt (Standard für Kartei-Lockdateien: 12 h)
				if (host === datum_host_user[1] && user === datum_host_user[2] ||
						new Date() - new Date(datum_host_user[0]) > maxLockTime) {
					resolve(false); // nicht gesperrt
				} else if (datum_host_user[2]) {
					resolve(["user", datum_host_user[2]]); // gesperrt
				} else {
					resolve(["computer", datum_host_user[1]]); // gesperrt
				}
			}
		});
	},
	// Lock-Datei löschen
	//   lockfile = String
	//     (Pfad zur Lock-Datei)
	unlink (lockfile) {
		return new Promise(resolve => {
			const fsP = require("fs").promises;
			fsP.unlink(lockfile)
				.then(() => resolve(true))
				.catch(err => {
					dialog.oeffnen({
						typ: "alert",
						text: `Beim Löschen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`
					});
					resolve(false);
					throw err;
				});
		});
	},
	// Lock-Datei einlesen
	//   lockfile = String
	//     (Pfad zur Lock-Datei)
	read (lockfile) {
		return new Promise(resolve => {
			const fsP = require("fs").promises;
			fsP.readFile(lockfile, {encoding: "utf8"})
				.then(content => resolve(content))
				.catch(err => {
					dialog.oeffnen({
						typ: "alert",
						text: `Beim Lesen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`
					});
					resolve("");
					throw err;
				});
		});
	},
	// Sperrmeldung ausgeben
	//   info = Boolean || Array
	//     (Array enhält Informationen zu Person/Computer, die die Datei gerade benutzen)
	//   typ = String || undefined
	//     (Typ der Datei, die gespeichert werden soll; falls generisches "Datei" unerwünscht)
	locked ({info, typ = "Datei"}) {
		let durch = "";
		if (Array.isArray(info)) {
			switch (info[0]) {
				case "computer":
					durch = ` durch Computer <i>${info[1]}</i>`;
					break;
				case "user":
					durch = ` durch BenutzerIn <i>${info[1]}</i>`;
					break;
			}
		}
		dialog.oeffnen({
			typ: "alert",
			text: `Beim Öffnen der ${typ} ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nDatei ist gesperrt${durch}`,
		});
	},
};
