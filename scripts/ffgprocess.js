/**
 * Processes ffgcards.json downloaded data and updates text (and some other) values in ../data/**
 */

const fs = require("fs");

const readFile = pathFromRoot =>
  fs.readFileSync(`${__dirname}/../${pathFromRoot}`, "utf8");

console.log("Reading ./ffgcards.json");
let dataString = "";
try {
  dataString = readFile("scripts/ffgcards.json");
} catch (err) {
  console.log("Could not read ./ffgcards.json. Use ffgscrape.js first!");
  process.exit(1);
}

console.log("Reading ./ffgmetadata.json");
let metadata = {};
try {
  let metadataString = readFile("scripts/ffgmetadata.json");
  metadata = JSON.parse(metadataString);
} catch (err) {
  console.log("Could not read ./ffgmetadata.json. Use ffgscrape.js first!");
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

function applyDiff(destination, key, value) {
  // Returns true if data was modified

  // Remove double spaces in value
  if (typeof value === "string") {
    value = value.replace(/\s{2,}/g, " ");
  }

  // Handle the destination missing some data
  if (!destination.hasOwnProperty(key) && (value || value.length > 0)) {
    console.log(key + " was missing.");
    console.log("--New:      ", value);
    destination[key] = value;
    return true;
  }

  // Handle an update to existing data
  if (value && destination[key]) {
    let existing = JSON.stringify(destination[key]).trim();
    let newValue = JSON.stringify(value).trim();
    if (existing.localeCompare(newValue) != 0) {
      console.log("Change detected in " + key);
      console.log("--Existing: ", destination[key]);
      console.log("--New:      ", value);
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
  card.name = stripAllTags(card.name).trim();
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
          ref = ship.pilots.find(pilot => pilot.ffg == card.id);
        }
      }
    );
    if (!ref) {
      console.log("** Could not find existing data for", card);
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
          if (side.ffg == card.id) {
            ref = side;
            upgradeRef = upgrade;
          } else if (sanitize(upgrade.title) == sanitize(side.title)) {
            console.log(
              "Found title match without FFG ID match for ",
              upgrade.title
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

  let cost = card.cost == "*" ? null : { value: parseInt(card.cost) };
  let limited = (card.name.match(/\•/g) || []).length;
  card.name = card.name.replace(/\•/g, "");

  if (upgradeRef) {
    // For upgrades, some fields are stored in the parent object
    // while other fields are specific to the upgrade card's side

    // Only apply a card name change when looking at side[0]
    if (upgradeRef.sides[0] == ref) {
      modified = modified || applyDiff(upgradeRef, "name", card.name);
    }
    if (cost == null) {
      if (!upgradeRef.cost || !("variable" in upgradeRef.cost)) {
        console.log(
          "** WARNING: Variable cost detected but no variable cost metadata for",
          card.name
        );
      }
    } else {
      modified = modified || applyDiff(upgradeRef, "cost", cost);
    }
    modified = modified || applyDiff(ref, "title", card.name);
    modified = modified || applyDiff(upgradeRef, "limited", limited);
  } else {
    modified = modified || applyDiff(ref, "name", card.name);
    modified = modified || applyDiff(ref, "caption", card.subtitle);
    if (!ref.caption || ref.caption.length == 0) {
      delete ref.caption;
    }
    modified = modified || applyDiff(ref, "limited", limited);
  }

  modified = modified || applyDiff(ref, "artwork", card.image);
  modified = modified || applyDiff(ref, "image", card.card_image);

  let card_text = card.ability_text;

  // Card-specific tweaks:
  //
  // Lando [Escape Craft]: Card text is missing the `</shipability>` closing tag
  if (card.id == 226) {
    card_text = card_text + "</shipability>";
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
    modified = modified || applyDiff(ref, "shipAbility", ship_ability);
    // Remove the shipability tag
    card_text = stripTag(card_text, "shipability").trim();
  }

  // Parse card for flavor text
  let flavor_text = getTagContent(card_text, "flavor");
  if (flavor_text) {
    flavor_text = stripTag(flavor_text, "flavor");
    flavor_text = stripAllTags(flavor_text).trim();
    modified = modified || applyDiff(ref, "text", flavor_text);
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
    modified = modified || applyDiff(ref, "ability", card_text);
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
    notFound.push({ id: card.id, name: card.name });
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
