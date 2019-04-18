"use strict";

let hilfe = {
	// mit der Tastatur durch durch die Menüelemente navigieren
	//   tastaturcode = Number
	naviMenue (tastaturcode) {
		// aktives Element ermitteln
		let links = document.querySelectorAll("nav a.kopf"),
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
		let sektion = links[pos].classList.item(0).replace(/^link-sektion-/, "");
		hilfe.sektionWechseln(sektion);
	},
	// korrigiert den Sprung nach Klick auf einen internen Link,
	// sodass er nicht hinter dem Header verschwindet
	naviSprung (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const id = this.getAttribute("href").replace(/^#/, ""),
				h2 = document.getElementById(id);
			window.scrollTo(0, h2.offsetTop - 70);
		});
	},
	// Klick-Event zum Wechseln der Sektion
	//   a = Element
	//     (Link zur gewünschten Sektion)
	sektion (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const sektion = this.classList.item(0).replace(/^link-sektion-/, "");
			hilfe.sektionWechseln(sektion);
			this.blur();
		});
	},
	// Sektion wechseln
	//   sektion = String
	//     (Hinweis auf die Sektion, die eingeblendet werden soll)
	sektionWechseln (sektion) {
		// Navigation auffrischen
		document.querySelectorAll("nav a.kopf").forEach(function(i) {
			if (i.classList.contains(`link-sektion-${sektion}`)) {
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
		// Überschriftenliste aufbauen
		hilfe.sektionenH(sektion);
	},
	// Überschriftenliste der aktiven Sektion aufbauen
	sektionenH(sektion) {
		// alte Liste entfernen
		const nav = document.querySelector("nav");
		let ul_h = nav.querySelector("ul.h");
		if (ul_h) {
			ul_h.parentNode.removeChild(ul_h);
		}
		// aktive Sektion ermitteln
		const aktiv = nav.querySelector("a.aktiv");
		if (!aktiv) {
			return;
		}
		// neuen Listencontainer erstellen und einhängen
		let ul = document.createElement("ul");
		ul.classList.add("h");
		aktiv.parentNode.appendChild(ul);
		// Listencontainer füllen
		document.querySelectorAll(`section[id="sektion-${sektion}"] h2`).forEach(function(h2) {
			let li = document.createElement("li"),
				a = document.createElement("a");
			a.classList.add("intern");
			a.href = `#${h2.id}`;
			a.innerHTML = h2.innerHTML;
			li.appendChild(a);
			ul.appendChild(li);
			hilfe.naviSprung(a);
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
