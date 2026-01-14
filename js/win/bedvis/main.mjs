
import admin from "./admin.mjs";
import assist from "./assist.mjs";
import io from "./io.mjs";
import lemmas from "./lemmas.mjs";
import load from "./load.mjs";
import means from "./means.mjs";
import misc from "./misc.mjs";
import quots from "./quots.mjs";

import winShared from "../winShared.mjs";

import dropdown2 from "../../dropdown2.mjs";
import overlay from "../../overlay.mjs";
import shared from "../../shared.mjs";
import sharedTastatur from "../../sharedTastatur.mjs";
import tooltip from "../../tooltip.mjs";

window.addEventListener("load", async () => {
  // INITIALIZE WINDOW
  await winShared.infos();
  winShared.ipcListener();
  winShared.events();
  winShared.eventsPopup();
  await dropdown2.init();

  // CLICK EVENTS
  document.getElementById("save-file").addEventListener("click", evt => {
    evt.preventDefault();
    misc.saveFile();
  });
  document.getElementById("main-fun-assist").addEventListener("click", evt => {
    evt.preventDefault();
    assist.show();
  });
  document.getElementById("main-fun-admin").addEventListener("click", evt => {
    evt.preventDefault();
    admin.open();
  });
  document.getElementById("main-fun-import").addEventListener("click", evt => {
    evt.preventDefault();
    io.importWin();
  });
  document.getElementById("main-fun-export").addEventListener("click", evt => {
    evt.preventDefault();
    io.exportWin();
  });

  // OVERLAYS
  document.querySelectorAll(".overlay .icon-schliessen").forEach(i => overlay.initSchliessen(i));

  // OVERLAY ASSISTANT
  document.querySelectorAll("#assist-nav a").forEach(i => {
    i.addEventListener("click", function (evt) {
      evt.preventDefault();
      assist.nav(this);
    });
  });

  // OVERLAY ADMIN
  document.getElementById("admin-add").addEventListener("click", evt => {
    evt.preventDefault();
    admin.add();
  });
  document.getElementById("admin-rename").addEventListener("click", evt => {
    evt.preventDefault();
    admin.rename();
  });
  document.getElementById("admin-delete").addEventListener("click", evt => {
    evt.preventDefault();
    admin.del();
  });
  document.getElementById("admin-config-lemma-list").addEventListener("change", function () {
    admin.toggleLemmaList(this);
  });
  document.querySelectorAll("#admin-source-cont input").forEach(i => {
    i.addEventListener("change", function () {
      admin.toggleXmlLine(this.value);
    });
  });
  document.getElementById("admin-xml-choose").addEventListener("click", evt => {
    evt.preventDefault();
    admin.chooseXmlFile(false);
  });
  document.getElementById("quot-fun-filters").addEventListener("click", evt => {
    evt.preventDefault();
    means.show("quot");
  });
  document.getElementById("quot-fun-reset").addEventListener("click", evt => {
    evt.preventDefault();
    quots.filterReset(true);
  });
  document.getElementById("config-fun-lemmas").addEventListener("click", evt => {
    evt.preventDefault();
    lemmas.show();
  });
  document.getElementById("config-fun-meanings").addEventListener("click", evt => {
    evt.preventDefault();
    means.show("config");
  });

  // OVERLAY IMPORT
  document.getElementById("import-do").addEventListener("click", evt => {
    evt.preventDefault();
    io.importDo();
  });
  document.getElementById("import-add").addEventListener("click", evt => {
    evt.preventDefault();
    io.importAdd();
  });

  // OVERLAY EXPORT
  document.querySelectorAll("#export-cont a").forEach(i => {
    i.addEventListener("click", function (evt) {
      evt.preventDefault();
      const type = this.id.replace(/^.+-/, "");
      io.exportDo(type);
    });
  });

  // OVERLAY MEANINGS
  document.querySelectorAll("#meanings-filters input").forEach(i => {
    i.addEventListener("change", function () {
      quots.filterBy.tags = parseInt(this.value, 10);
      quots.filter();
    });
  });

  // OVERLAY DIALOG
  document.getElementById("dialog-prompt-text").addEventListener("keydown", function (evt) {
    sharedTastatur.detectModifiers(evt);
    if (!sharedTastatur.modifiers && evt.key === "Enter") {
      overlay.schliessen(this);
    }
  });
  [
    "dialog-ok-button",
    "dialog-abbrechen-button",
    "dialog-ja-button",
    "dialog-nein-button",
  ].forEach(id => {
    document.getElementById(id).addEventListener("click", function () {
      overlay.schliessen(this);
    });
  });

  // UPDATE KEYBOARD SHORTCUTS
  sharedTastatur.shortcutsText();

  // INITIALIZE CONTENT AREA AND TOOLTIPS
  await load.vis();
  tooltip.init();

  // UNLOCK WINDOW
  shared.fensterGeladen();
});
