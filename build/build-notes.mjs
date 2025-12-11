
import { exec } from "node:child_process";

// variables
const commitTypeMap = {
  Change: "enhancement",
  Feature: "feature",
  Fix: "fix",
  Removal: "removal",
  Update: "update",
};
const commitTypes = {
  removal: "Entfernte Funktionen",
  feature: "Neue Funktionen",
  enhancement: "Verbesserungen",
  change: "Änderungen",
  update: "Updates",
  fix: "Behobene Fehler",
  documentation: "Dokumentation",
  chore: "Routinearbeiten",
};
const execOpt = {
  windowsHide: true,
};
const version = process.argv[2];

// get most recent tag
const lastTag = await new Promise(resolve => {
  exec("git describe --abbrev=0", execOpt, (err, stdout) => {
    if (err) {
      resolve(false);
    } else {
      resolve(stdout.trim());
    }
  });
});

// get relevant commits
const commitsRaw = await new Promise(resolve => {
  exec(`git log -E --grep="^(\[\[[a-z]+\]\]|(Change|Feature|Fix|Removal|Update):) " --format="%s" ${lastTag}..HEAD`, execOpt, (err, stdout) => {
    if (err) {
      resolve(false);
    } else {
      resolve(stdout.trim());
    }
  });
});

// categorize commits
const commits = {};
for (let message of commitsRaw.split("\n")) {
  if (!message) {
    continue;
  }

  let type;
  if (/^\[\[/.test(message)) {
    const matches = message.match(/^\[\[([a-z]+)\]\] (.+)/);
    type = matches[1];
    message = matches[2];
  } else {
    const matches = message.replace(/^([^:]+): (.+)/, "");
    type = commitTypeMap[matches[1]];
    message = matches[2];
  }

  if (!commits[type]) {
    commits[type] = [];
  }
  commits[type].push(message);
}

// create release notes
const typeOrder = Object.keys(commitTypes);
const types = Object.keys(commits).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

let notes = `# Release Notes v${version}\n`;
for (const type of types) {
  notes += `\n## ${commitTypes[type]}\n\n`;
  for (const message of commits[type]) {
    notes += `* ${message}\n`;
  }
}

console.log(notes.trim());
process.exit(0);
