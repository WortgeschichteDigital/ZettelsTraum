// ***** SHARED MODULES AND VARIABLES *****

import electronBuilder from "electron-builder";
import electronPackager from "electron-packager";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { URL } from "node:url";

const __dirname = new URL(".", import.meta.url).pathname;


// ***** SHOW HELP *****

if (process.argv.some(i => /^(-{0,2}help|-h)$/.test(i))) {
  const __filename = new URL("", import.meta.url).pathname;
  console.log(`Usage:
  node ${path.basename(__filename)} [module] [platform] [architecture] [package type] [email] [output]

The options may appear in loose order. If some or even all are missing, the script resorts to defaults. No ia32 support for Linux and macOS.

Option details:
  module:       builder | packager (default = packager)
  platform:     darwin | linux | win32 (default = ${process.platform})
  architecture: ia32 | x64 (default = x64)

Package types for module "builder":
  darwin: dmg
  linux:  appImage | deb | rpm (default = deb)
  win32:  nsis

Default email address = no-reply@address.com

Default output directory = ${path.join(__dirname, "..", "..", "build")}`);
  process.exit(0);
}


// ***** SHARED FUNCTIONS *****

const shared = {
  // check whether the given path exists or not
  //   p = string
  async exists (p) {
    try {
      await fs.access(p);
    } catch {
      return false;
    }
    return true;
  },

  // print a feedback text to the console
  //   text = string
  //   error = boolean | undefined
  feedback (text, error) {
    let colorOn = "";
    let colorOff = "";
    if (error === true) {
      colorOn = "\u001B[1;31m";
      colorOff = "\u001B[0m";
    } else if (error === false) {
      colorOn = "\u001B[1;32m";
      colorOff = "\u001B[0m";
    }
    console.log(colorOn + text + colorOff);
  },

  // print an error message and exit the process
  //   err = error object
  feedbackError (err) {
    shared.feedback(`${err.name}: ${err.message}`, true);
    console.log(new Error(err));
    process.exit(1);
  },

  // print success message
  feedbackSuccess () {
    let { platform } = config;
    switch (platform) {
      case "darwin":
        platform = "macOS";
        break;
      case "linux":
        platform = "Linux";
        break;
      case "win32":
        platform = "Windows";
        break;
    }

    shared.feedback(`${platform}-Paketierung erstellt!`, false);

    let details = `  electron-${config.module} | ${config.platform} | ${config.arch}`;
    if (config.module === "builder") {
      details += ` | ${config.packageType}`;
    }
    shared.feedback(details);

    process.exit(0);
  },

  // return copyright year
  getCopyrightYear () {
    let year = "2019";
    const current = new Date().getFullYear();
    if (current > 2019) {
      year += "–" + current;
    }
    return year;
  },

  // get keywords from package.json
  async getKeywords () {
    if (config.platform === "linux") {
      const packageJSON = await fs.readFile(path.join(config.appDir, "package.json"), {
        encoding: "utf8",
      });
      return JSON.parse(packageJSON).keywords.join(";");
    }
    return "";
  },

  // detect whether the given path is a folder or not
  //   p = string
  async isFolder (p) {
    const stats = await fs.lstat(p);
    return stats?.isDirectory();
  },

  // return an absolute path fot the given string
  //   p = string
  makeAbsolute (p) {
    if (!path.isAbsolute(p)) {
      p = path.join(process.cwd(), p);
      p = path.normalize(p);
    }
    return p;
  },
};


// ***** SCAN ARGS *****

const validArgs = {
  // build module
  builder: "module",
  packager: "module",
  // platform
  darwin: "platform",
  linux: "platform",
  win32: "platform",
  // architecture
  ia32: "arch",
  x64: "arch",
  // package type
  appImage: "packageType",
  deb: "packageType",
  dmg: "packageType",
  nsis: "packageType",
  rpm: "packageType",
};

const packageTypeDefaults = {
  darwin: "dmg",
  linux: "deb",
  win32: "nsis",
};

const config = {
  module: "packager",
  platform: process.platform,
  arch: "x64",
  packageType: "",
  appDir: path.join(__dirname, ".."),
  outDir: path.join(__dirname, "..", "..", "build"),
  email: "no-reply@address.com",
};

for (let i = 2, len = process.argv.length; i < len; i++) {
  const item = process.argv[i];
  const key = validArgs[item];
  if (key) {
    config[key] = item;
  } else if (/^.+@.+\..+$/.test(item)) {
    config.email = item;
  } else {
    const p = shared.makeAbsolute(item);
    if (await shared.exists(p) && await shared.isFolder(p)) {
      config.outDir = p;
    }
  }
}

if (config.module === "builder" && !config.packageType) {
  config.packageType = packageTypeDefaults[config.platform];
}

if (config.arch === "ia32" && (config.platform === "darwin" || config.platform === "linux")) {
  config.arch = "x64";
}


// ***** ELECTRON BUILDER *****

const builder = {
  // builder configuration
  config: null,

  // make builder configuration
  async makeConfig () {
    class ConfigObject {
      constructor (keywords) {
        // create target
        let platformBuilder;
        switch (config.platform) {
          case "darwin":
            platformBuilder = "MAC";
            break;
          case "linux":
            platformBuilder = "LINUX";
            break;
          case "win32":
            platformBuilder = "WINDOWS";
            break;
        }
        this.targets = electronBuilder.Platform[platformBuilder].createTarget(null, electronBuilder.Arch[config.arch]);

        // shared options
        this.config = {
          appId: "zdl.wgd.zettelstraum",
          copyright: `© ${shared.getCopyrightYear()}, Akademie der Wissenschaften zu Göttingen`,
          directories: {
            output: config.outDir,
          },
          extraMetadata: {
            author: {
              email: config.email,
            },
          },
          extraResources: [
            {
              from: path.join(config.appDir, "resources"),
            },
          ],
          productName: "zettelstraum",
        };

        // platform specific options
        if (config.platform === "darwin") {
          this.config.mac = {
            target: config.packageType,
            icon: path.join(config.appDir, "img", "icon", "mac", "icon.icns"),
            category: "public.app-category.utilities",
          };

          this.config.fileAssociations = [
            {
              ext: "ztj",
              name: "x-ztj",
              icon: path.join(config.appDir, "resources", "filetype", "mac", "ztj.icns"),
            },
          ];

          this.config[config.packageType] = {
            artifactName: "zettelstraum_${version}_${arch}.${ext}",
            background: path.join(config.appDir, "build", "mac-background.png"),
            title: "${productName} ${version}",
          };
        } else if (config.platform === "linux") {
          this.config.linux = {
            target: config.packageType,
            executableName: "zettelstraum",
            artifactName: "zettelstraum_${version}_${arch}.${ext}",
            icon: path.join(config.appDir, "img", "icon", "linux"),
            synopsis: "Wortkartei-App von „Wortgeschichte digital“",
            category: "Science",
            desktop: {
              Name: "Zettel’s Traum",
              Keywords: keywords,
            },
          };

          this.config.fileAssociations = [
            {
              ext: "ztj",
              name: "x-ztj",
              mimeType: "application/x-ztj",
            },
          ];

          if (config.packageType === "appImage") {
            this.config.appImage = {
              license: path.join(config.appDir, "LICENSE"),
            };
          } else {
            this.config[config.packageType] = {
              // BUG this.config.fileAssociations works fine in general;
              //   but on Linux it is unable to associate an icon with the MIME type;
              //   the shell scripts can do this, but currently,
              //   they are unable to associate the app with the correct MIME type :-(
              // afterInstall: path.join(config.appDir, "build", "linux-after-install.sh"),
              // afterRemove: path.join(config.appDir, "build", "linux-after-remove.sh"),
              fpm: [ `--${config.packageType}-changelog=${path.join(config.outDir, "changelog")}` ],
              packageCategory: "science",
            };
            if (config.packageType === "deb") {
              this.config.deb.priority = "optional";
            }
          }
        } else if (config.platform === "win32") {
          this.config.win = {
            target: config.packageType,
            icon: path.join(config.appDir, "img", "icon", "win", "icon.ico"),
          };

          this.config.fileAssociations = [
            {
              ext: "ztj",
              name: "ztj",
              description: "Zettel’s Traum-Datei",
              icon: path.join(config.appDir, "resources", "filetype", "win", "ztj.ico"),
            },
          ];

          this.config[config.packageType] = {
            artifactName: "zettelstraum_${version}_${arch}.${ext}",
            license: path.join(config.appDir, "LICENSE"),
            shortcutName: "Zettel’s Traum",
          };
        }
      }
    }

    if (config.platform === "linux" && config.packageType !== "appImage") {
      const changelog = path.join(config.outDir, "changelog");
      if (!await shared.exists(changelog)) {
        await fs.writeFile(changelog, "")
      }
    }

    const keywords = await shared.getKeywords();
    this.config = new ConfigObject(keywords);
  },

  // start building
  async build () {
    // make configuration object
    await this.makeConfig();

    // start packaging
    try {
      await electronBuilder.build(this.config);
    } catch (err) {
      shared.feedbackError(err);
    }

    // feedback
    shared.feedbackSuccess();
  },
};


// ***** ELECTRON PACKAGER *****

const packager = {
  // packager configuration
  config: null,

  // make packager configuration
  makeConfig () {
    class ConfigObject {
      constructor () {
        // shared config
        this.appCopyright = `© ${shared.getCopyrightYear()}, Akademie der Wissenschaften zu Göttingen`;
        this.arch = config.arch;
        this.asar = true;
        this.dir = config.appDir;
        this.executableName = "zettelstraum";
        this.extraResource = path.join(config.appDir, "resources");
        this.ignore = [
          /node_modules/,
          /package-lock\.json/,
        ];
        this.junk = true;
        this.name = "Zettel’s Traum";
        this.out = config.outDir;
        this.overwrite = true;
        this.platform = config.platform;
        this.prune = true;

        // platform specific
        if (config.platform === "darwin") {
          this.appCategoryType = "public.app-category.utilities";
          this.icon = path.join(config.appDir, "img", "icon", "mac", "icon.icns");
        } else if (config.platform === "win32") {
          this.icon = path.join(config.appDir, "img", "icon", "win", "icon.ico");
          this.win32metadata = {
            CompanyName: "Nico Dorn",
            FileDescription: "Zettel’s Traum",
            InternalName: "Zettel’s Traum",
            ProductName: "Zettel’s Traum",
          };
        }
      }
    }

    this.config = new ConfigObject();
  },

  // start building
  async build () {
    // make configuration object
    this.makeConfig();

    // start packaging
    try {
      // build
      await electronPackager(this.config);

      // rename folder
      const buildDir = `Zettel’s Traum-${this.config.platform}-${this.config.arch}`;
      const renameDir = `zettelstraum-${this.config.platform}-${this.config.arch}`;
      let renameCount = 1;
      let renamePath = path.join(this.config.out, renameDir);
      while (await shared.exists(renamePath)) {
        renameCount++;
        renamePath = path.join(this.config.out, renameDir + "." + renameCount);
      }
      await fs.rename(path.join(this.config.out, buildDir), renamePath);

      // copy resources to correct folder
      let resTarget = path.join(renamePath, "resources");
      if (this.config.platform === "darwin") {
        resTarget = path.join(renamePath, "Zettel’s Traum.app", "Contents", "Resources");
      }
      const resSource = path.join(resTarget, "resources");
      const files = await fs.readdir(resSource);
      for (const i of files) {
        const source = path.join(resSource, i);
        const target = path.join(resTarget, i);
        await fs.rename(source, target);
      }
      await fs.rmdir(resSource);
    } catch (err) {
      shared.feedbackError(err);
    }

    // feedback
    shared.feedbackSuccess();
  },
};


// ***** START BUILD PROCESS *****

if (!await shared.exists(config.outDir)) {
  try {
    await fs.mkdir(config.outDir, {
      recursive: true,
    });
  } catch (err) {
    shared.feedbackError(err);
  }
}

if (config.module === "builder") {
  if (__dirname === process.cwd() + "/") {
    // electron-builder is unable to find the package.json
    // if the working directory is not equal to the apps base directory
    process.chdir("..");
  }
  await builder.build();
} else if (config.module === "packager") {
  await packager.build();
} else {
  process.exit(1);
}
