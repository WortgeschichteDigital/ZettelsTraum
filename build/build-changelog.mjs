
import { exec } from "node:child_process";

// variables
const commitTypeMap = {
  Change: "enhancement",
  Feature: "feature",
  Fix: "fix",
  Removal: "removal",
  Update: "update",
};
const commitTypes = [
  "removal",
  "feature",
  "enhancement",
  "change",
  "update",
  "fix",
  "documentation",
  "chore",
];
const execOpt = {
  windowsHide: true,
};
const mail = {
  "Nico Dorn": "nico.dorn adwgoe de",
};
const packageType = process.argv[2];

// detect release tags
const tagsRaw = await new Promise(resolve => {
  exec("git tag --sort=-creatordate", execOpt, (err, stdout) => {
    if (err) {
      resolve(false);
    } else {
      resolve(stdout.trim());
    }
  });
});

if (!tagsRaw) {
  console.log("");
  process.exit(1);
}

// create log file
let logFile = "";

const tags = tagsRaw.split("\n");

for (let i = 0, len = tags.length; i < len; i++) {
  const tag = tags[i];
  let nextTag = tags[i + 1];
  if (!nextTag) {
    nextTag = await new Promise(resolve => {
      exec("git log --max-parents=0 --format=%H", execOpt, (err, stdout) => {
        if (err) {
          resolve(false);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // detect commit info
  let releaseAuthor;
  let releaseAuthorMail;
  let releaseDate;
  let releaseType;
  const releaseVersion = tag;

  const tagCommit = await new Promise(resolve => {
    exec(`git show "${tag}" | head -n 5 | tail -n 4`, execOpt, (err, stdout) => {
      if (err) {
        resolve(false);
      } else {
        resolve(stdout.trim());
      }
    });
  });

  for (const line of tagCommit.split("\n")) {
    if (!line) {
      continue;
    } else if (/^Tagger:/.test(line)) {
      releaseAuthor = line.match(/^.+?:\s+(.+?)\s+</)[1];
      if (mail[releaseAuthor]) {
        releaseAuthorMail = mail[releaseAuthor]
          .replace(" ", "@")
          .replace(" ", ".");
      } else {
        releaseAuthorMail = "no-reply@address.com";
      }
    } else if (/^Date:/.test(line)) {
      const date = line.match(/^.+?:\s+(.+)/)[1].split(" ");
      if (packageType === "deb") {
        releaseDate = `${date[0]}, ${date[2]} ${date[1]} ${date[4]} ${date[3]} ${date[5]}`;
      } else if (packageType === "rpm") {
        releaseDate = `${date[0]} ${date[1]} ${date[2]} ${date[4]}`;
      }
    } else {
      releaseType = line.replace(/\s+v[0-9]+\.[0-9]+\.[0-9]$/, "");
    }
  }

  // detect relevant commits
  const commitsRaw = await new Promise(resolve => {
    exec(`git log -E --grep="^(\[\[[a-z]+\]\]|(Change|Feature|Fix|Removal|Update):) " --oneline ${nextTag}..${tag}`, execOpt, (err, stdout) => {
      if (err) {
        resolve(false);
      } else {
        resolve(stdout.trim());
      }
    });
  });

  const commits = {};
  for (const commit of commitsRaw.split("\n")) {
    if (!commit) {
      continue;
    }

    let message = commit.replace(/^.+? /, "");
    let type;
    if (/^\[\[/.test(message)) {
      type = message.match(/^\[\[([a-z]+)\]\]/)[1];
    } else {
      const oldType = message.split(":")[0];
      type = commitTypeMap[oldType];
      message = message.replace(/^[^:]+:/, `[[${type}]]`);
    }

    if (!commits[type]) {
      commits[type] = [];
    }
    commits[type].push(message);
  }

  // construct release block
  const types = Object.keys(commits).sort((a, b) => commitTypes.indexOf(a) - commitTypes.indexOf(b));
  if (packageType === "deb") {
    logFile += `zettelstraum (${releaseVersion}) whatever; urgency=medium\n\n`;
    if (types.length) {
      for (const type of types) {
        for (const message of commits[type]) {
          logFile += " ".repeat(2) + `* ${message}\n`;
        }
      }
    } else {
      logFile += " ".repeat(2) + `* ${releaseType}\n`;
    }
    logFile += "\n";
    logFile += ` -- ${releaseAuthor} <${releaseAuthorMail}> ${releaseDate}\n`;
  } else if (packageType === "rpm") {
    logFile += `* ${releaseDate} ${releaseAuthor} <${releaseAuthorMail}> - ${releaseVersion}\n`;
    if (types.length) {
      for (const type of types) {
        for (const message of commits[type]) {
          logFile += `- ${message}\n`;
        }
      }
    } else {
      logFile += `- ${releaseType}\n`;
    }
  }
  logFile += "\n";
}

// return log file
console.log(logFile.trim());
process.exit(0);
