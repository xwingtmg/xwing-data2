const keywordsMap = {
  ASTROMECH: "Astromech",
  ASTRO: "Astromech",
  BARRELLROLL: "Barrell Roll",
  BARRELROLL: "Barrel Roll",
  BOOST: "Boost",
  BOMB: "Bomb",
  MOD: "Modification",
  Bullseye: "Bullseye Arc",
  BULLSEYE: "Bullseye Arc",
  BULLSEYEARC: "Bullseye Arc",
  CALCULATE: "Calculate",
  CANNON: "Cannon",
  CHARGE: "Charge",
  STANDARDCHARGE: "Charge",
  CLOAK: "Cloak",
  CONFIG: "Configuration",
  COORDINATE: "Coordinate",
  CREW: "Crew",
  CRIT: "Critical Hit",
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  DEVICE: "Device",
  DoubleTurret: "Double Turret Arc",
  DUALMOBILEARC: "Double Turret Arc",
  EVADE: "Evade",
  FOCUS: "Focus",
  FORCE: "Force",
  FORCECHARGE: "Force",
  Front: "Front Arc",
  FRONTARC: "Front Arc",
  FullFront: "Full Front Arc",
  FULLFRONT: "Full Front Arc",
  FRONT180ARC: "Full Front Arc",
  FULLFRONTARC: "Full Front Arc",
  FULLREARARC: "Full Rear Arc",
  FULLREAR: "Full Rear Arc",
  GUNNER: "Gunner",
  HIT: "Hit",
  ILLICIT: "Illicit",
  JAM: "Jam",
  KTURN: "Koiogran Turn",
  LBANK: "Bank Left",
  LEFTBANK: "Bank Left",
  LEFTTURN: "Turn Left",
  LOCK: "Lock",
  TARGETLOCK: "Lock",
  LEFTTALON: "Tallon Roll Left",
  LSLOOP: "Segnor's Loop Left",
  LEFTSLOOP: "Segnor's Loop Left",
  LTURN: "Turn Left",
  MISSILE: "Missile",
  MODIFICATION: "Modification",
  RBANK: "Bank Right",
  RIGHTBANK: "Bank Right",
  Rear: "Rear Arc",
  REARARC: "Rear Arc",
  REINFORCE: "Reinforce",
  RELOAD: "Reload",
  ROTATEARC: "Rotate Arc",
  ROTATE: "Rotate Arc",
  RSLOOP: "Segnor's Loop Right",
  RIGHTSLOOP: "Segnor's Loop Right",
  RIGHTTALON: "Tallon Roll Right",
  RTURN: "Turn Right",
  RIGHTTURN: "Turn Right",
  MOBILEARC: "Single Turret Arc",
  SingleTurret: "Single Turret Arc",
  SINGLETURRETARC: "Single Turret Arc",
  SLAM: "SLAM",
  STOP: "Stop",
  STATIONARY: "Stop",
  STRAIGHT: "Straight",
  TALENT: "Talent",
  TORPEDO: "Torpedo",
  TURRET: "Turret",
  TURRETARC: "Single Turret Arc",
  SENSOR: "Sensor",
  LEFTARC: "Left Arc",
  RIGHTARC: "Right Arc",
  BREAK: " ",

  // These are all in ffg card text and should be removed
  NONBREAK: "",
  RETURN: "",
  SMALLBODY: "",
  "/SMALLBODY": "",
  SHIPABILITY: "",
  "/SHIPABILITY": "",
  SABOLD: "",
  "/SABOLD": "",
  BOLD: "",
  "/BOLD": "",
  FLAVOR: "",
  "/FLAVOR": "",
  SMALLCAPS: "",
  "/SMALLCAPS": "",
  ITALIC: "",
  "/ITALIC": "",
  UNTALIC: "",
  "/UNTALIC": "",
  BITALIC: "",
  "/BITALIC": ""
};

module.exports = {
  replace: str => {
    return str
      .replace(/\<nonbreak\>/g, " ")
      .replace(new RegExp(/\<[\/a-zA-Z]+\>/, "g"), matches => {
        const keyword = matches.substr(1, matches.length - 2).toUpperCase();
        if (!(keyword in keywordsMap)) {
          throw new Error(`Unknown keyword "${keyword}"`);
        }
        if (keywordsMap[keyword].length === 0) {
          return "";
        }
        return `[${keywordsMap[keyword]}]`;
      })
      .replace(/[–—]/g, "-")
      .replace(/\’/g, "'")
      .replace(/\“/g, '"')
      .replace(/\”/g, '"')
      .replace(/  /g, " ")
      .trim();
  },
  fixExactMatch: keyword => {
    const str = keyword.toUpperCase();
    if (!(str in keywordsMap)) {
      throw new Error(`Unknown keyword "${str}"`);
    }
    return keywordsMap[str];
  }
};
