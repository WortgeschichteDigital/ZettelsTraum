"use strict";

let hilfe = {
	// Navigation zwischen den einzelnen Sektionen
	//   a = Element
	//     (Link, der die gewünschte Sektion einblendet)
	navi (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let sektion = this.id.replace(/^link-/, "");
			hilfe.sektionWechseln(sektion);
			this.blur();
		});
	},
	// durch die Menüelemente navigieren
	//   tastaturcode = Number
	naviMenue (tastaturcode) {
		// aktives Element ermitteln
		let links = document.querySelectorAll("nav a"),
			aktiv = document.querySelector("nav a.aktiv"),
			pos = -1;
		for (let i = 0, len = links.length; i < len; i++) {
			if (links[i] === aktiv) {
				pos = i;
				break;
			}
		}
		// zu aktivierendes Element ermitteln
		if (tastaturcode === 38) {
			pos--;
		} else {
			pos++;
		}
		if (pos < 0) {
			pos = links.length - 1;
		} else if (pos >= links.length) {
			pos = 0;
		}
		// Sektion wechseln
		let sektion = links[pos].id.replace(/^link-/, "");
		hilfe.sektionWechseln(sektion);
	},
	// Sektion wechseln
	//   sektion = String
	//     (Hinweis auf die Sektion, die eingeblendet werden soll)
	sektionWechseln (sektion) {
		// Navigation auffrischen
		document.querySelectorAll("nav a").forEach(function(i) {
			if (i.id === `link-${sektion}`) {
				i.classList.add("aktiv");
			} else {
				i.classList.remove("aktiv");
			}
		});
		// Sektionen ein- bzw. ausblenden
		document.querySelectorAll("section").forEach(function(i) {
			if (i.id === `sektion-${sektion}`) {
				i.classList.remove("aus");
			} else {
				i.classList.add("aus");
			}
		});
	},
	// Handbuch über Link öffnen
	//   a = Element
	//     (Link, der zum Handbuch führen soll)
	oeffneHandbuch (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-handbuch");
		});
	},
};
