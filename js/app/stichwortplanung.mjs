
import dd from "../dd.mjs";
import dialog from "../dialog.mjs";

export { stichwortplanung as default };

const stichwortplanung = {
  // list lemmas that are part of the Stichwortplanung
  showLemmas () {
    const sup = [ "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹" ];
    const hl = [];

    for (const la of dd.file.la.la) {
      if (la.nl) {
        continue;
      }
      let text = la.sc.join("/");
      if (la.ho) {
        text = sup[la.ho - 1] + text;
      }
      hl.push("• " + text);
    }

    const numerus = hl.length === 1 ? "Dieses Lemma wird" : "Diese Lemmata werden";
    dialog.oeffnen({
      typ: "alert",
      text: `${numerus} in der Stichwortplanung gelistet:\n${hl.join("<br>")}`,
    });
  },
};
