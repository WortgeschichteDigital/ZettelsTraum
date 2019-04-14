"use strict";

let bedeutungencont = {
	// Anzeige mit den gelieferten Daten aufbereiten
	aufbauen (daten) {
		// Wort eintragen
		document.querySelector("h1").textContent = daten.wort;
		// Content leeren
		const cont = document.getElementById("bedeutungen");
		helfer.keineKinder(cont);
		// zaehlungenzählung zurücksetzen
		bedeutungencont.zaehlungen = [];
		// Bedeutungen aufbauen
		const bd = daten.bedeutungen.bd_folge;
		for (let i = 0, len = bd.length; i < len; i++) {
			const neue_bd = bedeutungencont.aufbauenLi(bd[i], daten.bedeutungen.bd[bd[i]]);
			// in Bedeutungsbaum einhängen
			//   [0] = <div>
			//   [1] = Verschachtelungstiefe; 0 = ohne Verschachtelung, 1 = 1. Ebene usw.
			if (neue_bd[1] > 0) {
				const schachtel = schachtelFinden(neue_bd[0].dataset.bd);
				schachtel.appendChild(neue_bd[0]);
			} else if (neue_bd[1] === 0) { // die Bedeutung ist unterhalb einer Baumstruktur
				cont.appendChild(neue_bd[0]);
			}
		}
		// sucht das <div>, in den eine Bedeutung verschachtelt werden muss
		function schachtelFinden(bd) {
			// Bedeutung kürzen
			let bd_arr = bd.split(": ");
			if (bd_arr.length > 1) {
				bd_arr.pop();
			}
			bd = bd_arr.join(": ");
			// Schachtel suchen
			const schachtel = cont.querySelector(`[data-bd^="${bd}"]`);
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
		div.appendChild(p);
		div.classList.add("baum");
		div.dataset.bd = bd;
		// Zählung anhängen
		bedeutungencont.zaehlung(p, baum_tiefe);
		// Bedeutungstext anhängen
		p.appendChild(document.createTextNode(obj.name));
		// Fragment zurückgeben
		return [div, baum_tiefe];
	},
	// speichert die letzte Zählung der jeweiligen Verschachtelungstiefe
	zaehlungen: [],
	zaehlungenTiefe: [
		["I.", "II.", "III.", "IV.", "V.", "VI.", "VII.", "VIII.", "IX.", "X.", "XI.", "XII.", "XIII.", "XIV.", "XV."],
		["1)", "2)", "3)", "4)", "5)", "6)", "7)", "8)", "9)", "10)", "11)", "12)", "13)", "14)", "15)"],
		["a)", "b)", "c)", "d)", "e)", "f)", "g)", "h)", "i)", "j)", "k)", "l)", "m)", "n)", "o)"],
		["α)", "β)", "γ)", "δ)", "ε)", "ζ)", "η)", "θ)", "ι)", "κ)", "λ)", "μ)", "ν)", "ξ)", "ο)"],
		Array(15).fill("•"),
		Array(15).fill("◦"),
		Array(15).fill("‣"),
		Array(15).fill("⁃"),
	],
	// Zählung anhängen
	//   div = Element
	//     (der Container, an den die Zählung angehängt werden soll)
	//   baum_tiefe = Number
	//     (die Verschachtelungstiefe)
	zaehlung (div, baum_tiefe) {
		// hochzählen
		if (!bedeutungencont.zaehlungen[baum_tiefe]) {
			bedeutungencont.zaehlungen[baum_tiefe] = 0;
		}
		bedeutungencont.zaehlungen[baum_tiefe]++;
		// alle höheren zaehlungen löschen
		bedeutungencont.zaehlungen.fill(0, baum_tiefe + 1);
		// zaehlungenanzeige erzeugen
		let b = document.createElement("b");
		let zeichen = "*";
		if (bedeutungencont.zaehlungenTiefe[baum_tiefe]) {
			zeichen = bedeutungencont.zaehlungenTiefe[baum_tiefe][bedeutungencont.zaehlungen[baum_tiefe] - 1];
		}
		b.textContent = zeichen;
		div.appendChild(b);
	},
};
