"use strict";

let bedeutungenDrag = {
	// Zwischenspeicher für diverse Daten
	data: {
		// Höhe des Headers über dem Bedeutungsgerüst (wird beim Initialisieren des Drags gefüllt)
		header: 0,
		// Position, an der sich der Marker befindet
		pos: -1,
		// Ebene, in die hinein verschoben werden soll
		ebene: 0,
	},
	scroll () {
		bedeutungenDrag.markerAus();
	},
	// Bewegung bei aktiviertem Drag-Mode abfangen
	mouse (evt) {
		const y = evt.clientY;
		// ggf. Scrollposition des Gerüsts ändern
		// (kann bei langen Gerüsten oder flachen Fenster nötig sein)
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
		for (let i = 0, len = zeilen.length - 1; i < len; i++) {
			let rectAkt = zeilen[i].getBoundingClientRect(),
				rectNext = zeilen[i + 1].getBoundingClientRect();
			if (y >= rectAkt.top && y < rectNext.top) {
				// Ebene ermitteln
				let x = evt.clientX,
					rectAktBd = zeilen[i].childNodes[3].getBoundingClientRect(),
					ebene = 0;
				if (x > rectAktBd.left + rectAktBd.width) {
					// Maus ist so weit rechts, dass sie außerhabl des Bedeutungsfeldes ist => Marker ausblenden
					bedeutungenDrag.data.ebene = 0; // damit der Marker beim langsamen bewegen nach links wieder angezeigt wird
					bedeutungenDrag.markerAus();
					return;
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
				marker.style.top = `${rectAkt.top + rectAkt.height - 2}px`; // 2px um den 5px hohen Marker zentral zwischen den Items zu positionieren
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
			document.removeEventListener("scroll", bedeutungenDrag.scroll);
			document.removeEventListener("mouseup", bedeutungenDrag.end);
			document.removeEventListener("mousemove", bedeutungenDrag.mouse);
			// die Bedeutung ggf. bewegen
			let moved = bedeutungenDrag.move();
			// Markierung entfernen
			if (!moved) {
				bedeutungen.moveAus();
			}
			document.getElementById("bedeutungen-cont").classList.remove("drag");
			// Marker entfernen
			let marker = document.getElementById("bedeutungen-drag-marker");
			if (marker) { // es könnte sein, dass der Marker noch gar nicht initialisiert wurde
				document.body.removeChild(marker);
			}
		}, 0); // ohne Timeout würde der Bedeutungszweig aktiviert
	},
	// ermittelt, ob die gewünschte Bewegung erlaubt ist
	movable () {
		let pos = bedeutungenDrag.data.pos,
			ebene = bedeutungenDrag.data.ebene,
			zeilen = document.querySelectorAll("#bedeutungen-cont tr");
		// Test 1: Bedeutung kann nicht an dieselbe Stelle oder in ihren Zweig hinein geschoben werden
		let ebeneNachPos = pos + 1 < zeilen.length - 1 ? bedeutungen.akt.bd[parseInt(zeilen[pos + 1].dataset.idx, 10)].bd.length : 0;
		if (zeilen[pos].classList.contains("bedeutungen-aktiv") || 
			zeilen[pos].classList.contains("bedeutungen-affiziert") ||
			ebeneNachPos && zeilen[pos + 1].classList.contains("bedeutungen-aktiv") && ebeneNachPos === ebene) {
			return false;
		}
		// Test 2: Bedeutung kann nicht an eine Position geschoben werden, wenn dies eine Lücke im Gerüst zur Folge hätte
		let ebeneVor = bedeutungen.akt.bd[pos].bd.length,
			ebeneNach = 0;
		if (bedeutungen.akt.bd[pos + 1]) {
			ebeneNach = bedeutungen.akt.bd[pos + 1].bd.length;
		}
		if (ebeneVor === ebene && ebeneNach > ebene ||
				ebeneVor > ebene && ebeneNach > ebene ||
				ebeneVor < ebene - 1) {
			return false;
		}
		// Test 3: Bedeutung darf nicht verschoben werden, weil sie identisch mit einer anderen Bedeutung im Zielbedeutungszweig wäre
		let start = pos; // Start des Zweiges, in dem getestet wird
		if (ebene === ebeneNach || ebene > ebeneNach) {
			for (let i = pos; i >= 0; i--) {
				start = i;
				let ebeneTmp = bedeutungen.akt.bd[i].bd.length;
				if (ebeneTmp < ebene) {
					break;
				}
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
			if (ebeneTmp < ebene) {
				break;
			} else if (i === aktiv || ebeneTmp !== ebene) {
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
			return false;
		}
		// Move ausführen TODO
		return true;
	},
};
