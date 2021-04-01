/**
 * Processes ffgcards-en.json downloaded data and updates text (and some other) values in ../data/**
 */

const fs = require("fs");
const gitdiff = require("git-diff");
const stringMath = require("string-math");
const diffOpts = {
  color: true,
  noHeaders: true,
  wordDiff: true
};

const readFile = pathFromRoot =>
  fs.readFileSync(`${__dirname}/../${pathFromRoot}`, "utf8");

console.log("Reading ./ffgcards-en.json");
let dataString = "";
try {
  dataString = readFile("scripts/ffgcards-en.json");
} catch (err) {
  console.log("Could not read ./ffgcards-en.json. Use ffgscrape.js first!");
  process.exit(1);
}

console.log("Reading ./ffgmetadata-en.json");
let metadata = {};
try {
  let metadataString = readFile("scripts/ffgmetadata-en.json");
  metadata = JSON.parse(metadataString);
} catch (err) {
  console.log("Could not read ./ffgmetadata-en.json. Use ffgscrape.js first!");
  process.exit(1);
}

let manifest = JSON.parse(readFile("data/manifest.json"));
let factions = JSON.parse(readFile("data/factions/factions.json"));
let translations = JSON.parse(readFile("scripts/translations.json"));
let upgradeTypes = metadata["upgrade_types"];

upgradeTypes.forEach(entry => {
  entry.ffg = entry.id;
  entry.xws = entry.name.replace(/\ /g, "-").toLowerCase();
});

let modifiedFiles = [];
let notFound = [];
let pilotData = {};
let upgradeData = {};

function extractFileList(tree) {
  // "Flatten" a JSON dictionary, keeping only string values with a file extension
  let unpack_queue = [];
  let download_list = [];
  if (tree) {
    // Push the manifest dictionary as the first object
    unpack_queue.push(tree);

    // While there are still items to unpack
    while (unpack_queue.length > 0) {
      // Dequeue the front item
      let item = unpack_queue.shift();

      try {
        // If the item is a string, see if it matches our extension
        if (typeof item == "string") {
          if (item.endsWith(".json")) {
            download_list.push(item);
          }
        } else if (item instanceof Array) {
          // If it's an array, push all values to the back of the unpack queue
          item.forEach(element => {
            if (element == undefined) {
              console.log("Empty array element in ", item);
            } else {
              unpack_queue.push(element);
            }
          });
        } else {
          // If it's a dictionary, unpack all key/value pairs and only push the values
          Object.entries(item).forEach(([key, value]) => {
            if (value == undefined) {
              console.log("Empty value in ", item);
            } else {
              unpack_queue.push(value);
            }
          });
        }
      } catch (err) {
        console.log("Error creating file list from manifest", manifest);
        console.log("Could not unpack", item);
      }
    }
  }
  return download_list;
}

function getFaction(id) {
  let faction = factions.find(entry => entry.ffg == id);
  if (faction) {
    return faction.name;
  } else {
    return "";
  }
}

function parseVariablePointsCost(cost) {
  const matches = /max\((\d*), ?(.*)\)/.exec(cost);
  let hasMax = false;
  let max = false;
  let expression = cost;
  if (matches) {
    hasMax = true;
    max = parseInt(matches[1], 10);
    expression = matches[2];
  }
  if (cost.includes("{ship_size}")) {
    const ship_size_values = {
      Small: 1,
      Medium: 2,
      Large: 3
      // Huge: 4
    };
    const values = {};
    Object.entries(ship_size_values).forEach(([size, value]) => {
      const result = stringMath(expression.replace("{ship_size}", value));
      values[size] = Math.max(0, hasMax ? Math.max(max, result) : result);
    });
    return {
      variable: "size",
      values
    };
  } else if (cost.includes("{initiative}")) {
    const values = {};
    for (let i = 0; i <= 6; i++) {
      const result = stringMath(expression.replace("{initiative}", i));
      values[i] = Math.max(0, hasMax ? Math.max(max, result) : result);
    }
    return {
      variable: "initiative",
      values
    };
  } else if (cost.includes("{statistics:1}")) {
    // statistics:1 = AGILITY
    const values = {};
    for (let i = 0; i <= 3; i++) {
      const result = stringMath(expression.replace("{statistics:1}", i));
      values[i] = Math.max(0, hasMax ? Math.max(max, result) : result);
    }
    return {
      variable: "agility",
      values
    };
  } else {
    throw new Error(`Unknown variable in variable cost: "${cost}"`);
  }
}

function applyDiff(destination, key, value) {
  // Returns true if data was modified

  let identifier = destination.name || destination.title || destination.xws;
  identifier = identifier ? `(${identifier})` : "";

  // Remove double spaces in value
  if (typeof value === "string") {
    value = value.replace(/\s{2,}/g, " ");
  }

  // Handle the destination missing some data
  if (
    !destination.hasOwnProperty(key) &&
    typeof value !== undefined &&
    value !== ""
  ) {
    console.log(key + ` was missing. ${identifier}`);
    console.log(gitdiff("", "" + value, diffOpts));
    destination[key] = value;
    return true;
  }

  // Handle an update to existing data
  if (typeof value !== "undefined" && typeof destination[key] !== "undefined") {
    let existing = JSON.stringify(destination[key]).trim();
    let newValue = JSON.stringify(value).trim();
    if (existing.localeCompare(newValue) != 0) {
      console.log(`Change detected in ${key} ${identifier}`);
      const old =
        typeof destination[key] === "string"
          ? destination[key]
          : JSON.stringify(destination[key], null, 2);
      const updated =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      const diff = gitdiff(old, updated, diffOpts);
      console.log(diff);
      destination[key] = value;
      return true;
    }
  }
  return false;
}

function sanitize(text) {
  // Return sanitized text
  // If text is falsy, just return it back
  if (!text) {
    return text;
  }
  let sanitized = text;
  translations.forEach(translation => {
    let regex = new RegExp(translation.ffg.replace(/\//g, "/"), "gi");
    sanitized = sanitized.replace(regex, translation.xws);
  });
  // The Squadbuilder API uses certain characters that visually look similar
  // but should be replaced with escaped characters
  sanitized = sanitized.replace(/\–/g, "-");
  sanitized = sanitized.replace(/\’/g, "'");
  sanitized = sanitized.replace(/\“/g, '\\"');
  sanitized = sanitized.replace(/\”/g, '\\"');
  sanitized = sanitized.replace(/[˚º]/g, "°");
  return sanitized;
}

function getUnsanitized(text) {
  if (!text) {
    return [];
  }
  matches = text.match(/\<[^\>]+\>/g);
  if (!matches) {
    return [];
  } else {
    return matches;
  }
}

function getTagContent(text, tag) {
  let regex = RegExp("<" + tag + ">" + ".*</" + tag + ">", "gi");
  let found = text.match(regex);
  if (!found || found.length == 0) {
    return null;
  }
  let foundText = found[0].substring(tag.length + 2);
  foundText = foundText.substring(0, foundText.length - tag.length - 3);
  return foundText.trim();
}

function stripTag(text, tag) {
  let regex = RegExp("<" + tag + ">" + ".*</" + tag + ">", "gi");
  return text.replace(regex, "");
}

function stripAllTags(text) {
  // Replace <return> followed by space with single space
  text = text.replace(/<return>\s/gi, " ");
  // Replace <return> with no space with a single space.
  text = text.replace(/<return>/gi, " ");
  // Replace <nonbreak> with space
  text = text.replace(/<nonbreak>/gi, " ");
  // Replace all other tags with nothing.
  return text.replace(/\<[^\>]+\>/gi, "");
}

function getShipFromFFGId(ffgid) {
  return metadata.ship_types.find(ship => ship.id === ffgid);
}

function getUpgradeTypeFromFFGId(ffgid) {
  return metadata.upgrade_types.find(upgradeType => upgradeType.id === ffgid);
}

function processShipType(ship_type) {
  let result = false;
  Object.entries(pilotData).forEach(([filename, ship]) => {
    if (ship.ffg == ship_type.id) {
      result = true;
      // Inspect ship type for icon data
      const modified = applyDiff(ship, "icon", ship_type.icon);

      if (modified) {
        modifiedFiles.push(filename);
      }
    }
  });
  return result;
}

function processCard(card) {
  // Reference to data to update
  let ref = null;
  let upgradeRef = null;
  let filename = null;
  let limited = (card.name.match(/\•/g) || []).length;
  card.name = stripAllTags(card.name.replace(/\•/g, "")).trim();
  // console.log("Processing " + card.name);
  // If the card contains a pilot
  if (card.card_type_id == 1) {
    Object.entries(pilotData).forEach(
      // Check each ship file
      ([filenameKey, ship]) => {
        // If the ship type number and faction match the data in the file
        if (
          ship.ffg == card.ship_type &&
          ship.faction == getFaction(card.faction_id)
        ) {
          // Save the filename
          filename = filenameKey;
          // Find the pilot inside the data in the ship file
          ref = ship.pilots.find(pilot =>
            pilot.ffg ? pilot.ffg == card.id : pilot.name == card.name
          );
        }
      }
    );
    if (!ref) {
      console.log(
        `** Could not find existing data for pilot FFG id ${card.id} named ${
          card.name
        } [${getShipFromFFGId(card.ship_type).name}]`
      );
      return false;
    }
  }
  // If the card contains an upgrade
  if (card.card_type_id == 2) {
    // Find the upgradeType. There may be more than one upgrade type listed in the FFG data
    // if the upgrade takes more than one slot type (ex: Calibrated Laser Targeting)
    card.upgrade_types.forEach(upgradeTypeNum => {
      // Card-specific tweaks:
      //
      // L3-37's Programming: Treat it as Crew because front side is a Crew card
      if (card.id === 383) {
        upgradeTypeNum = 8;
      }

      let upgradeType = upgradeTypes.find(
        upgradeType => upgradeType.ffg == upgradeTypeNum
      );
      if (!upgradeType) {
        console.log(
          "*** WARNING: Could not find FFG Upgrade Type " + upgradeTypeNum
        );
        return false;
      }
      // Find the filename with matching upgrade type
      filename = Object.keys(upgradeData).find(filename =>
        filename.includes(upgradeType.xws)
      );
      if (!filename) {
        console.log(
          "*** WARNING: Could not find file containing upgrade data for type",
          upgradeType.xws
        );
        return false;
      }
      // Look at every upgrade in the file
      upgradeData[filename].forEach(upgrade => {
        // Look at each side of each upgrade
        upgrade.sides.forEach(side => {
          if (side.ffg) {
            if (side.ffg == card.id) {
              ref = side;
              upgradeRef = upgrade;
            }
          } else if (sanitize(card.name) == sanitize(side.title)) {
            console.log(
              "Found title match without FFG ID match for ",
              card.name
            );
            console.log("Applying FFG ID", card.id);
            ref = side;
            upgradeRef = upgrade;

            ref.ffg = card.id;
          }
        });
      });
    });

    if (!ref) {
      return false;
    }
  }

  let modified = false;

  const intCost = parseInt(card.cost, 10);
  let cost = { value: intCost };
  if (card.cost === "*") {
    cost = null;
  } else if (Number.isNaN(intCost)) {
    // Variable cost detected!
    cost = parseVariablePointsCost(card.cost);
  }

  if (upgradeRef) {
    // For upgrades, some fields are stored in the parent object
    // while other fields are specific to the upgrade card's side

    // Card-specific tweaks:
    //
    switch (card.id) {
      case 329:
        // Outrider [Title] Errata
        card.ability_text = card.ability_text.replace(
          "obstructed attack",
          "attack that is obstructed by an obstacle"
        );
        break;
      case 390:
        // Lando's Millennium Falcon [Title] doesn't properly capitalize ship name
        card.ability_text = card.ability_text.replace(
          "escape craft",
          "Escape Craft"
        );
        break;
      case 549:
      case 654:
      case 724:
      case 725:
      case 726:
      case 728:
      case 729:
      case 730:
      case 731:
      case 727:
      case 903:
        // FFG treats Calibrated Laser Targeting as a Mod/Config, but we use Config/Mod
        // FFG treats Deuterium Power Cells as Mod/Tech, but we use Tech/Mod
        // FFG treats these as Crew/Command, but we use Command/Crew (since Command is first on the card):
        //        Admiral Ozzel
        //        Azmorigan
        //        Captain Needa
        //        Carlist Rieekan
        //        Jan Dodonna
        //        Raymus Antilles
        //        Stalwart Captain
        //        Strategic Commander
        // FFG treats B6 Blade Wing Prototype as Title/Command, but we use Command/Title
        card.upgrade_types = card.upgrade_types.reverse();
        break;
      case 869:
        // Slave I [Title] doesn't properly capitalize Full Rear Arc
        card.ability_text = card.ability_text.replace(
          "full rear arc",
          "[Full Rear Arc]"
        );
        break;
    }

    // Only apply a card name or xws change when looking at side[0]
    if (upgradeRef.sides[0] == ref) {
      // Replace `(Open)` and `(Closed)` in dual-side cards
      let name = card.name
        .replace(
          /\((Open|Closed|Inactive|Active|Perfected|Cyborg|Attached|Detached|Hired|Paid)\)/,
          ""
        )
        .trim();

      // Card-specific tweaks:
      //
      // Correct name for Palpatine/Sidious
      if (card.id === 556) {
        name = "Palpatine/Sidious";
      }
      // Correct name for In It For The Money / In It For The Rebellion
      else if (card.id === 907) {
        name = "In It For The Money/Rebellion";
      }

      modified = applyDiff(upgradeRef, "name", name) || modified;

      if (!upgradeRef.xws) {
        modified = applyDiff(upgradeRef, "xws", generateXWS(name)) || modified;
      }
    }
    if (cost == null) {
      if (!upgradeRef.cost || !("variable" in upgradeRef.cost)) {
        console.log(
          "** WARNING: Variable cost detected but no variable cost metadata for",
          card.name
        );
      }
    } else {
      modified = applyDiff(upgradeRef, "cost", cost) || modified;
    }
    modified = applyDiff(ref, "title", card.name) || modified;
    modified =
      applyDiff(
        ref,
        "type",
        getUpgradeTypeFromFFGId(card.upgrade_types[0]).name
      ) || modified;
    modified =
      applyDiff(
        ref,
        "slots",
        card.upgrade_types.map(id => getUpgradeTypeFromFFGId(id).name)
      ) || modified;
    modified = applyDiff(upgradeRef, "limited", limited) || modified;
  } else {
    // Card-specific tweaks:
    //
    if (card.id === 700) {
      // Mini Chireen [T-70 X-wing]: Card name is "Mini Chereen" which should be "Mini Chireen"
      card.name = "Nimi Chireen";
    }

    if (!ref.xws) {
      modified = applyDiff(ref, "xws", generateXWS(card.name)) || modified;
    }

    const engagementStat = findStatistic(card.statistics, "engagement");
    if (engagementStat) {
      modified =
        applyDiff(ref, "engagement", parseInt(engagementStat.value, 10)) ||
        modified;
    }

    modified = applyDiff(ref, "name", card.name) || modified;
    modified = applyDiff(ref, "caption", card.subtitle) || modified;
    if (card.initiative) {
      modified = applyDiff(ref, "initiative", card.initiative) || modified;
    }
    modified = applyDiff(ref, "cost", parseInt(card.cost, 10)) || modified;
    modified = applyDiff(ref, "ffg", card.id) || modified;
    if (!ref.caption || ref.caption.length == 0) {
      delete ref.caption;
    }
    modified = applyDiff(ref, "limited", limited) || modified;
  }

  modified = applyDiff(ref, "artwork", card.image) || modified;

  // Unfortunately the new squadbuidler API no longer has full card images :(
  // modified = applyDiff(ref, "image", card.card_image) || modified;

  let card_text = card.ability_text;

  // Card-specific tweaks:
  //
  switch (card.id) {
    case 65:
      // Norra Wexley [ARC-170 Starfighter]: Ability was changed in errata
      card_text = card_text.replace("you may ", "");
      break;
    case 226:
      // Lando [Escape Craft]: Card text is missing the `</shipability>` closing tag
      card_text = card_text + "</shipability>";
      break;
    case 801:
      // Zam Wesell [Firespray]: Quotes are not generated correctly by script
      card_text = card_text.replace(
        "You Should Thank Me",
        '"You Should Thank Me" or'
      );
      card_text = card_text.replace(
        "You'd Better Mean Business",
        '"You\'d Better Mean Business"'
      );
      break;
  }

  // Parse card text for shipability text
  let ship_ability_text = getTagContent(card_text, "shipability");
  if (ship_ability_text) {
    // We found a shipability, so create an object for it
    let ship_ability = {};
    // Find text tagged with <sabold> - this will be the name of the ability
    // Remove the ":" at the end
    ship_ability.name = getTagContent(ship_ability_text, "sabold").replace(
      /:$/,
      ""
    );
    // Strip out the <sabold> ability name and any other tag content such as <return>
    ship_ability_text = stripTag(ship_ability_text, "sabold");
    ship_ability_text = stripAllTags(ship_ability_text);
    // Save what's left as the ship ability
    ship_ability.text = ship_ability_text.trim();

    // Card-specific tweaks:
    //
    // Nashtah Pup: Ability is missing a space after `Setup:`
    ship_ability.text = ship_ability.text.replace(
      /([a-z]):([a-z])/gi,
      "$1: $2"
    );

    // Update the card data
    modified = applyDiff(ref, "shipAbility", ship_ability) || modified;
    // Remove the shipability tag
    card_text = stripTag(card_text, "shipability").trim();
  }

  // Parse card for flavor text
  let flavor_text = getTagContent(card_text, "flavor");
  if (flavor_text) {
    flavor_text = stripTag(flavor_text, "flavor");
    flavor_text = stripAllTags(flavor_text).trim();
    modified = applyDiff(ref, "text", flavor_text) || modified;
    // Remove flavor tag
    card_text = stripTag(card_text, "flavor").trim();
  }

  card_text = stripAllTags(card_text).trim();

  // Card-specific tweaks:
  //
  // Ezra [Sheathipede]: Ability has `[Evade] /[Hit]` which should be `[Evade]/[Hit]`
  card_text = card_text.replace(/\] \/\[/g, "]/[");

  if (card_text && card_text.length) {
    // Whatever card text is left is a pilot ability
    modified = applyDiff(ref, "ability", card_text) || modified;
  }

  if (modified) {
    modifiedFiles.push(filename);
  }
  return true;
}

/**
 * Process data
 */
dataStringSanitized = sanitize(dataString);
unsanitized = getUnsanitized(dataStringSanitized);
formatTags = [
  "<return>",
  "<nonbreak>",
  "<smallcaps>",
  "</smallcaps>",
  "<italic>",
  "</italic>",
  "<bitalic>",
  "</bitalic>",
  "<untalic>",
  "</untalic>",
  "<smallbody>",
  "</smallbody>",
  "<flavor>",
  "</flavor>",
  "<shipability>",
  "</shipability>",
  "<sabold>",
  "</sabold>"
];
if (unsanitized && unsanitized.length) {
  let unhandledTags = [];
  unsanitized.forEach(tag => {
    if (unhandledTags.indexOf(tag) >= 0) {
      unhandledTags.push(tag);
    }
  });
  if (unhandledTags.length) {
    console.log(
      "** Please add unhandled tags to ../translations/translations.json and re-run **"
    );
    unhandledTags.forEach(tag => {
      console.log(tag);
    });
    process.exit(1);
  }
}

let scrapedData = JSON.parse(dataStringSanitized);
console.log("** Loaded Scraped Data **");

// Load each of the existing pilot data files
extractFileList(manifest["pilots"]).forEach(file => {
  pilotData[file] = JSON.parse(readFile(file));
});

// Load each of the existing upgrade data files
extractFileList(manifest["upgrades"]).forEach(file => {
  upgradeData[file] = JSON.parse(readFile(file));
});

metadata["ship_types"].forEach(shipType => {
  let result = processShipType(shipType);
  if (!result) {
    console.log("Could not find ship_type", shipType);
  }
});

// Process every scraped card
scrapedData["cards"].forEach(card => {
  if (!processCard(card)) {
    const type = card.card_type_id === 2 ? "upgrade" : "pilot";
    const cardData = { ffgId: card.id, name: card.name };
    if (type === "upgrade") {
      cardData["slot"] = upgradeTypes.find(
        upgradeType => upgradeType.ffg == card.upgrade_types[0]
      ).xws;
    } else {
      cardData["ship"] = metadata["ship_types"].find(
        shipType => shipType.id === card.ship_type
      ).name;
    }
    notFound.push(cardData);
  }
});

if (notFound.length) {
  console.log("** WARNING: Could not find cards with FFG IDs", notFound);
}

if (modifiedFiles.length) {
  console.log("** Files Modified **");
  modifiedFiles.forEach(filename => {
    console.log(filename);
    // Find the data that matches the file
    let data = pilotData[filename]
      ? pilotData[filename]
      : upgradeData[filename];
    fs.writeFileSync(
      `${__dirname}/../${filename}`,
      JSON.stringify(data, null, 0)
    );
  });
}

function findStatistic(statistics = [], id) {
  return statistics.find(({ ffg_id }) => ffg_id === id);
}

function generateXWS(str) {
  return str.toLowerCase().replace(/[^0-9a-z]/g, "");
}
