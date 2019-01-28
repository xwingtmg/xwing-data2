const fs = require("fs");
const jsonfile = require("jsonfile");
const fetch = require("node-fetch");
const Keywords = require("./keywords");
const dataRoot = __dirname + "/../data";

const ffg2xwsids = require(`${dataRoot}/ffg-xws.json`);

let metadata = {};
let ships = {};
let upgrades = {};

const getApiResponse = async endpoint => {
  console.log(`Fetching ${endpoint}`);
  const response = await fetch(
    `https://squadbuilder.fantasyflightgames.com/api${endpoint}`
  );
  return await response.json();
};

const parseMetadata = data => {
  for (const section in data) {
    console.log(`Parsing ${section}`);
    metadata[section] = data[section].reduce((a, item) => {
      a[item.id] = item;
      return a;
    }, {});
  }
};

const run = async () => {
  const metadata = await getApiResponse("/app-metadata/");
  const { cards } = await getApiResponse("/cards/");

  parseMetadata(metadata);

  cards.forEach(card => {
    if (card.card_type_id === 1) {
      processShip(card);
    } else if (card.card_type_id === 2) {
      // processUpgrade(card);
    } else {
      throw new Error(`Unknown card type: ${card.card_type_id}`);
    }
  });

  saveShips(ships);
  jsonfile.writeFileSync(`${dataRoot}/upgrades.json`, upgrades);
};

const str2filename = str =>
  str
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/\//g, "-");

const saveShips = ships => {
  Object.entries(ships).forEach(([_, ship]) => {
    const filename = `${str2filename(ship.name)}.json`;
    const faction = str2filename(ship.faction);
    const path = [dataRoot, "pilots", faction, filename].join("/");
    console.log(`Writing ${ship.name} (${ship.faction})`);
    ship.pilots = ship.pilots.sort((a, b) => {
      return a.name > b.name ? 1 : -1;
    });

    const xwingDataFile = jsonfile.readFileSync(path);
    const mergedShip = Object.assign({}, xwingDataFile, ship);
    mergedShip.pilots = [
      ...xwingDataFile.pilots
        .concat(ship.pilots)
        .reduce(
          // Merge pilots by "ffg" field
          (m, o) => m.set(o.ffg, Object.assign(m.get(o.ffg) || {}, o)),
          new Map()
        )
        .values()
    ];
    jsonfile.writeFileSync(path, mergedShip);
  });
};

const generateXws = (str = "") => {
  return Keywords.replace(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

const upgradeIdToName = id => {
  const upgradeType = metadata.upgrade_types[id];
  if (!upgradeType) throw new Error(`Could not find upgrade type ${id}`);
  return upgradeType.name;
};

const parseSlots = available_upgrades =>
  available_upgrades
    // Remove "Special" slot with id 999
    .filter(id => id !== 999)
    // Convert slot id to slot name
    .map(upgradeIdToName);

const getForceSide = force_side =>
  metadata.force_affiliation[force_side].name.toLowerCase();

const parseStats = (statistics, { force_side }) => {
  const stats = [];
  let force = null;
  let charges = null;

  statistics.forEach(({ statistic_id, value, recurring }) => {
    const statistic = metadata.card_stats[statistic_id];
    if (!statistic) throw new Error(`Could not find card stat ${statistic_id}`);
    if (statistic.groups.indexOf("attack") > -1) {
      stats.push({
        type: "attack",
        value: parseInt(value, 10),
        arc: Keywords.fixExactMatch(statistic.name.replace(/ /g, ""))
      });
      return;
    }
    switch (statistic.name) {
      case "Agility":
      case "Hull":
      case "Shields":
        stats.push({
          type: statistic.name.toLowerCase(),
          value: parseInt(value, 10)
        });
        break;
      case "Charge":
        charges = {
          value: parseInt(value, 10),
          recovers: recurring ? 1 : 0
        };
        break;
      case "Force":
        force = {
          value: parseInt(value, 10),
          recovers: recurring ? 1 : 0,
          side: [getForceSide(force_side)]
        };
        break;
      default:
        throw new Error(`Unknown statistic "${statistic.name}"`);
    }
  });

  return [stats, charges, force];
};

const parseAction = (id, effect) => {
  const action = metadata.card_action_types[id];
  if (!action) throw new Error(`Could not find action with id ${id}`);
  const type = Keywords.fixExactMatch(action.name);
  const difficulty =
    (effect || "").toLowerCase() === "stress" ? "Red" : "White";
  return {
    difficulty,
    type
  };
};

const parseActions = available_actions => {
  return available_actions.map(
    ({
      base_action_id,
      related_action_id,
      base_action_side_effect,
      related_action_side_effect
    }) => {
      const action = parseAction(base_action_id, base_action_side_effect);
      if (related_action_id) {
        action.linked = parseAction(
          related_action_id,
          related_action_side_effect
        );
      }
      return action;
    }
  );
};

const parseShipAbility = str => {
  const [name, ...text] = Keywords.replace(str).split(":");
  return { name, text: text.join(": ").trim() };
};

const processShipName = str =>
  ({
    // Ship names
    "Scavenged YT-1300 Light Freighter": "Scavenged YT-1300",
    "TIE/in Interceptor": "TIE Interceptor",
    "Upsilon-class Shuttle": "Upsilon-class command shuttle"
  }[str] || str);

const processShip = ({
  name,
  initiative,
  is_unique,
  cost,
  ability_text,
  subtitle: caption,
  card_image,
  image,
  id,
  available_upgrades,
  available_actions,
  ship_type,
  ship_size,
  faction_id,
  force_side,
  statistics
}) => {
  let pilot = {
    name: Keywords.replace(is_unique ? name.slice(1) : name),
    cost: parseInt(cost, 10),
    slots: parseSlots(available_upgrades),
    ffg: id
  };
  /*
  if (caption.length) {
    // pilot.caption = Keywords.replace(caption);
  }

  pilot = {
    ...pilot,
    initiative: initiative || 0,
    limited: is_unique ? 1 : 0,
    cost: parseInt(cost, 10),
    // xws: generateXws(name),
    image: card_image,
    artwork: image,
    ffg: id,
    slots: parseSlots(available_upgrades)
  };

  const [stats, charges, force] = parseStats(statistics, { force_side });
  if (force) {
    pilot.force = force;
  }
  if (charges) {
    pilot.charges = charges;
  }

  const [pilotAbility, shipAbility] = ability_text.split("<shipability>");
  if (!is_unique) {
    pilot.text = Keywords.replace(pilotAbility);
  } else {
    pilot.ability = Keywords.replace(pilotAbility);
  }

  if (shipAbility) {
    pilot.shipAbility = parseShipAbility(shipAbility);
  }
  */

  const shipName = processShipName(
    Keywords.replace(metadata.ship_types[ship_type].name)
  );
  const shipXws = generateXws(shipName);
  const shipUniqueKey = `${shipXws}-${faction_id}`;

  if (!ships[shipUniqueKey]) {
    // console.log(`Creating ship ${shipName}`);
    ships[shipUniqueKey] = {
      name: shipName,
      xws: shipXws,
      ffg: ship_type,
      // size: metadata.ship_size[ship_size].name,
      // dial: [],
      faction: metadata.factions[faction_id].name,
      // stats,
      // actions: parseActions(available_actions),
      pilots: []
    };
  }

  // console.log(`Adding pilot ${pilot.name} (${ships[shipXws].name})`);
  ships[shipUniqueKey].pilots.push(pilot);
};

const processUpgrade = ({
  name,
  is_unique,
  cost,
  ability_text,
  available_actions = [],
  card_image,
  image,
  id,
  restrictions = [],
  force_side,
  statistics,
  upgrade_types
}) => {
  let upgrade = {
    title: Keywords.replace(is_unique ? name.slice(1) : name)
  };

  upgrade = {
    ...upgrade,
    limited: is_unique ? 1 : 0,
    // xws: generateXws(name),
    image: card_image,
    artwork: image,
    ability: Keywords.replace(ability_text),
    ffg: id,
    grants: []
  };

  if (cost !== "*") {
    upgrade.cost = { value: parseInt(cost, 10) };
  }

  if (available_actions.length) {
    parseActions(available_actions).forEach(value => {
      upgrade.grants.push({
        type: "action",
        value
      });
    });
  }

  if (restrictions.length) {
    upgrade.restrictions = restrictions.map(r => {
      const result = {};
      const factions = [];
      const ships = [];
      const sizes = [];
      const actions = [];
      r.forEach(res => {
        if (res.type === "FACTION") {
          factions.push(ffg2xwsids.factions[res.kwargs.pk]);
        } else if (res.type === "SHIP_TYPE") {
          ships.push(ffg2xwsids.ships[res.kwargs.pk]);
        } else if (res.type === "SHIP_SIZE") {
          sizes.push(Keywords.fixExactMatch(res.kwargs.ship_size_name));
        } else if (res.type === "ACTION") {
          actions.push(parseAction(res.kwargs.pk, res.kwargs.side_effect_name));
        } else {
          // throw new Error(`Unhandled restrictions ${res.type}`);
        }
      });
      if (factions.length) {
        result.factions = factions;
      }
      if (ships.length) {
        result.ships = ships;
      }
      if (sizes.length) {
        result.sizes = sizes;
      }
      if (actions.length) {
        result.actions = actions;
      }
      return result;
    });
  }

  const upgradeType = upgradeIdToName(upgrade_types[0]);

  if (upgrade.grants.length === 0) {
    delete upgrade.grants;
  }

  if (!upgrades[upgradeType]) {
    upgrades[upgradeType] = [];
  }
  upgrades[upgradeType].push(upgrade);
};

run();
