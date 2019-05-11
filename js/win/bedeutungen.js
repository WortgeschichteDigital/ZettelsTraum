"use strict";

let bedeutungen = {
	// Anzeige mit den gelieferten Daten aufbereiten
	aufbauen (daten) {
		// Wort eintragen
		document.querySelector("h1").textContent = daten.wort;
		// Content leeren
		let cont = document.getElementById("bd-win-cont");
		helfer.keineKinder(cont);
		// Sind überhaupt Bedeutungen vorhanden?
		let bd = daten.bedeutungen.bd_folge;
		if (!bd.length) {
			let p = document.createElement("p");
			p.classList.add("bd-win-keine");
			p.textContent = "kein Bedeutungsgerüst";
			cont.appendChild(p);
			return;
		}
		// Bedeutungen aufbauen
		for (let i = 0, len = bd.length; i < len; i++) {
			let neue_bd = bedeutungen.aufbauenLi(bd[i], daten.bedeutungen.bd[bd[i]]);
			// in Bedeutungsbaum einhängen
			//   [0] = <div>
			//   [1] = Verschachtelungstiefe; 0 = ohne Verschachtelung, 1 = 1. Ebene usw.
			if (neue_bd[1] > 0) {
				let schachtel = schachtelFinden(neue_bd[0].dataset.bd);
				schachtel.appendChild(neue_bd[0]);
			} else if (neue_bd[1] === 0) { // die Bedeutung ist unterhalb einer Baumstruktur
				cont.appendChild(neue_bd[0]);
			}
		}
		// Zählung eintragen
		bedeutungen.zaehlung();
		// sucht das <div>, in den eine Bedeutung verschachtelt werden muss
		function schachtelFinden(bd) {
			// Bedeutung kürzen
			let bd_arr = bd.split(": ");
			if (bd_arr.length > 1) {
				bd_arr.pop();
			}
			bd = bd_arr.join(": ");
			// Schachtel suchen
			let schachtel = cont.querySelector(`[data-bd^="${bd}"]`);
			if (schachtel) {
				return schachtel;
			}
			// nichts gefunden => weiter kürzen
			schachtelFinden(bd);
		}
	},
	// Listen-Item erzeugen
	//   bd = String
	//     (Name der Bedeutung)
	//   obj = Object
	//     (Daten zur Bedeutung)
	aufbauenLi (bd, obj) {
		// Notiz: Über ${obj.wert} erhält man die Anzahl der Belege, die sich mit
		// dieser Bedeutung derzeit im Kasten finden. Wenn gewünscht, könnte man noch ein <span> an
		// den <p> anhängen, in dem eine Ziffer steht (analog zum Bedeutungsbaum
		// in der Filterleiste).
		// 
		// Welche Verschachtelungstiefe hat die Bedeutung
		let baum = bd.match(/: /g),
			baum_tiefe = 0;
		if (baum) {
			baum_tiefe = baum.length;
		}
		// Listen-Item erzeugen
		let div = document.createElement("div"),
			p = document.createElement("p");
		bedeutungen.eintragen(p);
		div.appendChild(p);
		div.classList.add("bd-win-baum");
		div.dataset.bd = bd;
		// Element für Zählung vorbereiten
		let b = document.createElement("b");
		b.textContent = " ";
		p.appendChild(b);
		// Bedeutungstext anhängen
		p.appendChild(document.createTextNode(obj.name));
		// Fragment zurückgeben
		return [div, baum_tiefe];
	},
	// Zählzeichen
	zaehlzeichen: [
		["I.", "II.", "III.", "IV.", "V.", "VI.", "VII.", "VIII.", "IX.", "X.", "XI.", "XII.", "XIII.", "XIV.", "XV.", "XVI.", "XVII.", "XVIII.", "IX.", "XX."],
		["1)", "2)", "3)", "4)", "5)", "6)", "7)", "8)", "9)", "10)", "11)", "12)", "13)", "14)", "15)", "16)", "17)", "18)", "19)", "20)"],
		["a)", "b)", "c)", "d)", "e)", "f)", "g)", "h)", "i)", "j)", "k)", "l)", "m)", "n)", "o)", "p)", "q)", "r)", "s)", "t)"],
		["α)", "β)", "γ)", "δ)", "ε)", "ζ)", "η)", "θ)", "ι)", "κ)", "λ)", "μ)", "ν)", "ξ)", "ο)", "π)", "ρ)", "σ)", "τ)", "υ)"],
		Array(20).fill("•"),
		Array(20).fill("◦"),
	],
	zaehlung () {
		let zaehlungen = [];
		document.querySelectorAll("b").forEach(function(b) {
			// Verschachtelungstiefe ermitteln
			let ebene = -1,
				knoten = b.parentNode.parentNode;
			do {
				ebene++;
				knoten = knoten.parentNode;
			} while (knoten.classList.contains("bd-win-baum"));
			// hochzählen
			if (!zaehlungen[ebene]) {
				zaehlungen[ebene] = 0;
			}
			zaehlungen[ebene]++;
			// alle höheren Zählungen löschen
			zaehlungen.fill(0, ebene + 1);
			// Zählzeichen ermitteln
			let zeichen = "–";
			if (bedeutungen.zaehlzeichen[ebene]) {
				zeichen = bedeutungen.zaehlzeichen[ebene][zaehlungen[ebene] - 1];
			}
			b.textContent = zeichen;
		});
	},
	// Bedeutungsbaum drucken
	drucken () {
		let {ipcRenderer} = require("electron");
		ipcRenderer.send("bedeutungen-fenster-drucken", document.getElementById("bd-win-cont").outerHTML);
	},
	// Bedeutung im Formular des Hauptfensters eintragen
	//   p = Element
	//     (der Absatz, auf den geklickt wurde)
	eintragen (p) {
		p.addEventListener("click", function() {
			const bd = this.parentNode.dataset.bd;
			let {ipcRenderer} = require("electron");
			ipcRenderer.send("bedeutungen-fenster-eintragen", bd);
		});
	},
};
