const SLOTS = [
  "Astromech",
  "Cannon",
  "Cargo",
  "Command",
  "Configuration",
  "Crew",
  "Device",
  "Gunner",
  "Hardpoint",
  "Illicit",
  "Missile",
  "Modification",
  "Sensor",
  "Talent",
  "Team",
  "Torpedo",
  "Turret"
];

const MANEUVERS = [
  "Bank Left",
  "Bank Right",
  "Koiogran Turn",
  "Segnor's Loop Left",
  "Segnor's Loop Right",
  "Stationary",
  "Straight",
  "Tallon Roll Left",
  "Tallon Roll Right",
  "Turn Left",
  "Turn Right"
];

const ARCS = [
  "Bullseye Arc",
  "Double Turret Arc",
  "Front Arc",
  "Full Front Arc",
  "Full Rear Arc",
  "Left Arc",
  "Rear Arc",
  "Right Arc",
  "Single Turret Arc"
];

const ACTIONS = [
  "Barrel Roll",
  "Boost",
  "Calculate",
  "Cloak",
  "Coordinate",
  "Jam",
  "Lock",
  "Reinforce",
  "Reload",
  "Rotate Arc",
  "SLAM"
];

const MISC = [
  "Charge",
  "Critical Hit",
  "Evade",
  "Focus",
  "Force",
  "Hit",
  "Shield",
  "Energy",
  "Ordnance"
];

const SIZES = ["Small", "Large", "Medium"];

const ALL = [...ACTIONS, ...ARCS, ...MANEUVERS, ...MISC, ...SIZES, ...SLOTS];

const checkKeywordsInString = str => {
  const regex = /\[([^\[\]0-9]+)\]/g; // Match anything between brackets that's not 0-9, "[" or "]"
  let match;
  while ((match = regex.exec(str))) {
    const [fullmatch, text] = match;
    if (ALL.indexOf(text) === -1) {
      throw new Error(`Unknown keyword: "${fullmatch}"`);
    }
  }

  return true;
};

module.exports = { checkKeywordsInString };
