"use strict";

let bedeutungenDrag = {
	// Zwischenspeicher für diverse Daten
	data: {
		// Höhe des Headers über dem Bedeutungsgerüst
		// (wird beim Initialisieren des Drags gefüllt)
		header: 0,
		// Position, an der sich der Marker befindet
		// (ist zugleich Zielposition des Drops)
		pos: -1,
		// Ebene, in die hinein verschoben werden soll
		// (Start mit 1)
		ebene: 0,
	},
	// Bewegung bei aktiviertem Drag-Mode abfangen
	mouse (evt) {
		const y = evt.clientY;
		// ggf. Scrollposition des Gerüsts ändern
		// (kann bei langen Gerüsten oder flachem Fenster nötig sein)
		if (y >= window.innerHeight - 25 || y <= bedeutungenDrag.data.header + 25) {
			let top = 0;
			if (y <= bedeutungenDrag.data.header + 25) {
				top = window.scrollY - 100;
			} else {
				top = window.scrollY + 100;
			}
			window.scrollTo({
				left: 0,
				top: top,
				behavior: "smooth",
			});
			return;
		}
		// Marker
		let zeilen = document.querySelectorAll("#bedeutungen-cont tr");
		for (let i = 0, len = zeilen.length; i < len; i++) {
			let rectAkt = zeilen[i].getBoundingClientRect();
			if (y < rectAkt.top) {
				break;
			} else if (y >= rectAkt.top && y < rectAkt.top + rectAkt.height) {
				// Ebene ermitteln
				let x = evt.clientX,
					rectAktBd = zeilen[i].childNodes[3].getBoundingClientRect(),
					ebene = 0;
				if (x > rectAktBd.left + rectAktBd.width) {
					// Maus ist so weit rechts, dass sie außerhabl des Bedeutungsfeldes ist => Marker ausblenden
					bedeutungenDrag.data.ebene = 0; // damit der Marker beim langsamen bewegen nach links sofort wieder angezeigt wird
					break;
				} else if (x - rectAktBd.left <= 0) {
					// Maus ist weit links => Ebene 1
					ebene = 1;
				} else {
					// Ebene berechnen
					// (35px ist der Einzug für die Ebenen)
					ebene = Math.ceil((x - rectAktBd.left) / 35);
				}
				// Marker ist noch an derselben Position
				if (i === bedeutungenDrag.data.pos &&
						ebene === bedeutungenDrag.data.ebene) {
					return;
				}
				// Werte zwischenspeichern
				bedeutungenDrag.data.pos = i;
				bedeutungenDrag.data.ebene = ebene;
				// Marker positionieren
				let marker = bedeutungenDrag.marker();
				marker.style.top = `${rectAkt.top - 3}px`; // 3px um den 6px hohen Marker zentral zwischen den Items zu positionieren
				let td = zeilen[i].childNodes[3].getBoundingClientRect();
				marker.style.left = `${td.left + (ebene - 1) * 35}px`;
				marker.style.width = `${td.width - (ebene - 1) * 35}px`;
				marker.classList.remove("aus", "drag-unmovable");
				if (!bedeutungenDrag.movable()) {
					marker.classList.add("drag-unmovable");
				}
				return;
			}
		}
		// Marker ausblenden
		bedeutungenDrag.markerAus();
	},
	// Marker ggf. erzeugen; immer den Verweis auf das Element zurückgeben
	marker () {
		if (document.getElementById("bedeutungen-drag-marker")) {
			return document.getElementById("bedeutungen-drag-marker");
		}
		let div = document.createElement("div");
		document.body.appendChild(div);
		div.id = "bedeutungen-drag-marker";
		return div;
	},
	// Marker ausblenden
	markerAus () {
		let marker = document.getElementById("bedeutungen-drag-marker");
		if (marker) {
			marker.classList.add("aus");
		}
	},
	// Drag-Mode beenden
	end () {
		setTimeout(() => {
			// Events entfernen
			document.removeEventListener("scroll", bedeutungenDrag.markerAus);
			document.removeEventListener("mouseup", bedeutungenDrag.end);
			document.removeEventListener("mousemove", bedeutungenDrag.mouse);
			// die Bedeutung ggf. bewegen
			bedeutungenDrag.move();
			// Status des Gerüsts zurücksetzen entfernen
			document.getElementById("bedeutungen-cont").classList.remove("drag");
			// Marker entfernen
			let marker = document.getElementById("bedeutungen-drag-marker");
			if (marker) { // es könnte sein, dass der Marker noch gar nicht initialisiert wurde
				document.body.removeChild(marker);
			}
		}, 0); // ohne Timeout würde der Bedeutungszweig in jedem Fall aktiviert
	},
	// ermittelt, ob die gewünschte Bewegung erlaubt ist
	movable () {
		let zeilen = document.querySelectorAll("#bedeutungen-cont tr"),
			pos = bedeutungenDrag.data.pos,
			ebeneZiel = bedeutungenDrag.data.ebene,
			ebeneVor = pos - 1 > 0 ? bedeutungen.akt.bd[pos - 1].bd.length : 1,
			ebeneNach = 0,
			ebenePos = pos < zeilen.length - 1 ? bedeutungen.akt.bd[pos].bd.length : 0,
			affizierte = document.querySelectorAll(".bedeutungen-affiziert");
		if (affizierte.length) {
			let affiziertLetzter = parseInt(affizierte[affizierte.length - 1].dataset.idx, 10);
			if (affiziertLetzter + 1 < zeilen.length - 1) {
				ebeneNach = bedeutungen.akt.bd[affiziertLetzter + 1].bd.length;
			}
		} else if (pos + 1 < zeilen.length - 1) {
			ebeneNach = bedeutungen.akt.bd[pos + 1].bd.length;
		}
		// Test 1: Bedeutung kann nicht an dieselbe Stelle, in sich oder in ihren Zweig hinein geschoben werden
		if (zeilen[pos].classList.contains("bedeutungen-aktiv") && ebenePos === ebeneZiel || 
			zeilen[pos].classList.contains("bedeutungen-affiziert") ||
			zeilen[pos - 1] && /bedeutungen-(aktiv|affiziert)/.test(zeilen[pos - 1].getAttribute("class"))) {
			return false;
		}
		// Test 2: Bedeutung kann nicht an eine Position geschoben werden, wenn dies eine Lücke im Gerüst zur Folge hätte
		const posZiel = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10);
		if (ebeneZiel < ebenePos && !(pos === posZiel && (ebeneZiel === ebeneNach || ebeneZiel > ebeneNach)) ||
			ebeneZiel > ebeneVor + 1 ||
			pos === 0 && ebeneZiel > 1) {
			return false;
		}
		// Test 3: Bedeutung darf nicht verschoben werden, weil sie identisch mit einer anderen Bedeutung im Zielbedeutungszweig wäre
		let start = pos; // Start des Zweiges, in dem getestet wird
		for (let i = pos - 1; i >= 0; i--) {
			start = i;
			let ebeneTmp = bedeutungen.akt.bd[i].bd.length;
			if (ebeneTmp < ebeneZiel) {
				break;
			}
		}
		if (start === 0) { // sonst wird die erste Bedeutung auf der obersten Ebene nicht überprüft
			start--;
		}
		const aktiv = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10),
			bd = bedeutungen.akt.bd[aktiv].bd,
			text = bedeutungen.editFormat(bd[bd.length - 1]).replace(/<.+?>/g, "");
		for (let i = start + 1, len = bedeutungen.akt.bd.length; i < len; i++) {
			let ebeneTmp = bedeutungen.akt.bd[i].bd.length;
			if (ebeneTmp < ebeneZiel) {
				break;
			} else if (i === aktiv || ebeneTmp !== ebeneZiel) {
				continue;
			}
			let bdTmp = bedeutungen.akt.bd[i].bd,
				textTmp = bedeutungen.editFormat(bdTmp[bdTmp.length - 1]).replace(/<.+?>/g, "");
			if (text === textTmp) {
				return false;
			}
		}
		// Tests bestanden => Bedeutung kann verschoben werden
		return true;
	},
	// Bewegung ausführen
	move () {
		// Move abbrechen
		let marker = document.getElementById("bedeutungen-drag-marker");
		if (!marker ||
				marker.classList.contains("aus") ||
				marker.classList.contains("drag-unmovable")) {
			bedeutungen.feedback("bedeutungen-unmovable");
			return;
		}
		// Move ausführen
		const pos = bedeutungenDrag.data.pos,
			ebene = bedeutungenDrag.data.ebene;
		let pad = [];
		if (ebene > 1) {
			pad = bedeutungen.akt.bd[pos - 1].bd.slice(0, ebene - 1);
		}
		let idStart = 0, // ID der mit .bedeutungen-aktiv markierten Bedeutung
			items = bedeutungen.moveGetItems();
		const ebeneAktiv = bedeutungen.akt.bd[items[0]].bd.length;
		for (let i = 0, len = items.length; i < len; i++) {
			let idx = items[i];
			if (pos > items[0]) { // nach unten verschieben
				idx -= i;
			}
			// Kopie der Bedeutung erstellen
			let kopie = bedeutungen.makeCopy(idx);
			// Bedeutungspfad auffrischen
			kopie.bd.splice(0, ebeneAktiv - 1);
			kopie.bd = pad.concat(kopie.bd);
			// verschieben
			if (pos > items[0]) { // nach unten
				bedeutungen.akt.bd.splice(pos, 0, kopie);
				bedeutungen.akt.bd.splice(idx, 1);
			} else { // nach oben oder in derselben Position
				bedeutungen.akt.bd.splice(pos + i, 0, kopie);
				bedeutungen.akt.bd.splice(idx + 1, 1);
			}
			// ID der ersten verschobenen Bedeutung merken
			if (i === 0) {
				idStart = kopie.id;
			}
		}
		// Gerüst neu aufbauen
		bedeutungen.konstitZaehlung();
		bedeutungen.aufbauen();
		// bewegten Bedeutungszweig wieder markieren
		let start = -1;
		for (let i = 0, len = bedeutungen.akt.bd.length; i < len; i++) {
			if (bedeutungen.akt.bd[i].id === idStart) {
				start = i;
				break;
			}
		}
		bedeutungen.moveAn(start, true);
		// Änderungsmarkierung setzen
		bedeutungen.bedeutungenGeaendert(true);
	},
};
