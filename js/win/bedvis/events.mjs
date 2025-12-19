
import config from "./config.mjs";
import data from "./data.mjs";
import load from "./load.mjs";
import misc from "./misc.mjs";

export { events as default };

class Event {
  constructor ({ id, name, yearFrom }) {
    this.description = "";
    this.id = id;
    this.name = name;
    this.yearFrom = yearFrom;
    this.yearTo = 0;
  }
}

const events = {
  // add a new event
  //   lemma = string
  async add (lemma) {
    // prompt for name
    const name = await misc.prompt({
      text: "Wie lautet der <b>Name</b> des Ereignisses?",
      platzhalter: "Name",
    });
    if (!name) {
      return;
    }

    // prompt for year
    let yearFrom = await misc.prompt({
      text: "In welchem <b>Jahr</b> fand das Ereigniss statt?",
      platzhalter: "Jahr",
    });
    yearFrom = parseInt(yearFrom || 0, 10) || 0;

    // create new event
    const { events } = load.data.vis.da.lemmas[lemma];
    let id = "e1";
    if (events.length) {
      const lastNo = parseInt(events.at(-1).id.replace(/^e/, ""), 10);
      id = "e" + (lastNo + 1);
    }
    const evt = new Event({
      id,
      name,
      yearFrom,
    });
    events.push(evt);

    // insert configuration block
    const configBlock = config.makeEvtBlock(lemma, evt);
    const lemmaCont = document.querySelector(`.lemma-cont[data-lemma="${lemma}"]`);
    lemmaCont.appendChild(configBlock);

    // update SVG and save data
    load.svg();
    load.sha1Update();
    data.save();
  },
};
