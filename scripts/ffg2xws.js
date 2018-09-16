// Quick script to create a ffg_id -> xws mapping file

const fs = require('fs');
const jsonfile = require('jsonfile');

const dataRoot = __dirname + '/../data';
const ffg2xws = {};

// Upgrades
const files = fs.readdirSync(`${dataRoot}/upgrades`);
files.forEach(file => {
  const contents = jsonfile.readFileSync(`${dataRoot}/upgrades/${file}`);
  contents.forEach(upg => {
    if (upg.xws) {
      upg.sides.forEach(side => {
        if (side.ffg_id) {
          ffg2xws[side.ffg_id] = upg.xws;
        }
      });
    }
  });
});

// Pilots
const factions = fs.readdirSync(`${dataRoot}/pilots`);
factions.forEach(faction => {
  const ships = fs.readdirSync(`${dataRoot}/pilots/${faction}`);
  ships.forEach(file => {
    const contents = jsonfile.readFileSync(`${dataRoot}/pilots/${faction}/${file}`);
    contents.pilots.forEach(pilot => {
      if (pilot.xws && pilot.ffg_id) {
        ffg2xws[pilot.ffg_id] = pilot.xws;
      }
    });
  });
});

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const ordered = Object.keys(ffg2xws)
  .sort(collator.compare)
  .reduce((aq, key) => {
    aq[key] = ffg2xws[key];
    return aq;
  }, {});

jsonfile.writeFileSync(`${dataRoot}/ffgid-xws.json`, ordered);
