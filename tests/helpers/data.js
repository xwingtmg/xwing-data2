const manifest = require("../../data/manifest.json");

const loadedData = {};
const mapSlotXWSToName = {
  astromech: "Astromech",
  cannon: "Cannon",
  cargo: "Cargo",
  command: "Command",
  configuration: "Configuration",
  crew: "Crew",
  device: "Device",
  "force-power": "Force Power",
  gunner: "Gunner",
  hardpoint: "Hardpoint",
  hyperdrive: "Hyperdrive",
  illicit: "Illicit",
  missile: "Missile",
  modification: "Modification",
  sensor: "Sensor",
  "tactical-relay": "Tactical Relay",
  talent: "Talent",
  team: "Team",
  tech: "Tech",
  title: "Title",
  torpedo: "Torpedo",
  turret: "Turret"
};

const loadPilotsAndShips = () => {
  const allPilots = [];
  const allShips = [];

  manifest.pilots.forEach(({ ships }) => {
    ships.forEach(filename => {
      const { pilots = [], ship } = require(`../../${filename}`);
      allPilots.push(...pilots);
      allShips.push(ship);
    });
  });

  return { ships: allShips, pilots: allPilots };
};

const getPilots = () => {
  if (!loadedData.pilots) {
    const { pilots } = loadPilotsAndShips();
    loadedData.pilots = pilots;
  }
  return loadedData.pilots;
};

const getPilotXWSIds = () => {
  const pilots = getPilots();
  return pilots.map(p => p.xws).filter(Boolean);
};

const validatePilotXWSId = id => {
  const ids = getPilotXWSIds();
  if (ids.indexOf(id) === -1) {
    throw new Error(`Pilot xws id "${id}" does not exist`);
  }
};

const loadConditions = () => {
  return require(`../../${manifest.conditions}`);
};

const getConditions = () => {
  if (!loadedData.conditions) {
    loadedData.conditions = loadConditions();
  }
  return loadedData.conditions;
};

const getConditionXWSIds = () => {
  const conditions = getConditions();
  return conditions.map(c => c.xws).filter(Boolean);
};

const validateConditionXWSId = id => {
  const ids = getConditionXWSIds();
  if (ids.indexOf(id) === -1) {
    throw new Error(`Condition with xws id "${id}" does not exist`);
  }
};

const loadUpgrades = () => {
  const allUpgrades = [];

  manifest.upgrades.forEach(filename => {
    const upgrades = require(`../../${filename}`);
    allUpgrades.push(...upgrades);
  });

  return { upgrades: allUpgrades };
};

const getUpgrades = () => {
  if (!loadedData.upgrades) {
    const { upgrades } = loadUpgrades();
    loadedData.upgrades = upgrades;
  }
  return loadedData.upgrades;
};

const getUpgradesXWSIds = () => {
  const upgrades = getUpgrades();
  return upgrades.map(u => u.xws).filter(Boolean);
};

const getUpgradesXWSIdsForSlot = slotName => {
  const slotId = mapSlotXWSToName[slotName] || slotName;
  const upgrades = getUpgrades();
  return upgrades
    .filter(u => u.sides.some(s => s.type === slotId))
    .map(u => u.xws)
    .filter(Boolean);
};

const validateUpgradeXWSIdForSlot = (id, slotName) => {
  const ids = getUpgradesXWSIdsForSlot(slotName);
  if (ids.indexOf(id) === -1) {
    throw new Error(
      `Upgrade xws id "${id}" does not exist for slot "${slotName}"`
    );
  }
};

module.exports = {
  getPilotXWSIds,
  validatePilotXWSId,
  getUpgradesXWSIds,
  validateUpgradeXWSIdForSlot,
  validateConditionXWSId
};
