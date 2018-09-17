// Quick script that maps ffg's `id` field to `xws` values

const fs = require('fs');
const jsonfile = require('jsonfile');

const dataRoot = __dirname + '/../data';
const ffg2xws = { pilots: {}, upgrades: {} };

// Upgrades
const files = fs.readdirSync(`${dataRoot}/upgrades`);
files.forEach(file => {
  const contents = jsonfile.readFileSync(`${dataRoot}/upgrades/${file}`);
  contents.forEach(upg => {
    if (upg.xws) {
      upg.sides.forEach(side => {
        if (side.ffg) {
          ffg2xws.upgrades[side.ffg] = upg.xws;
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
      if (pilot.xws && pilot.ffg) {
        ffg2xws.pilots[pilot.ffg] = pilot.xws;
      }
    });
  });
});

// const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
// const ordered = Object.keys(ffg2xws)
//   .sort(collator.compare)
//   .reduce((aq, key) => {
//     aq[key] = ffg2xws[key];
//     return aq;
//   }, {});
const ordered = ffg2xws;

jsonfile.writeFileSync(`${dataRoot}/ffg-xws.json`, ordered);
