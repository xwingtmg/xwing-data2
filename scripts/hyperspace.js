const jsonfile = require("jsonfile");
const fetch = require("node-fetch");

const dataRoot = __dirname + "/../data";
const manifest = require(`${dataRoot}/manifest.json`);

const log = (...args) => console.log(...args);

const getApiResponse = async endpoint => {
  log(`Fetching API endpoint ${endpoint}`);
  const response = await fetch(
    `https://x-wing-api.fantasyflightgames.com/${endpoint}`
  );
  return await response.json();
};

const getXWDFile = async path => await jsonfile.readFile(path);

const run = async () => {
  const { game_formats: gameformats } = await getApiResponse("/gameformats/");

  const hyperspaceFormat = gameformats.find(
    format => format.name === "Hyperspace"
  );
  if (!hyperspaceFormat) {
    throw new Error("Could not find Hyperspace format");
  }
  log(`Found Hyperspace format:\n`, hyperspaceFormat);

  const {
    allowed_upgrades: hyperspaceUpgradeIds,
    allowed_pilots: hyperspacePilotIds
  } = hyperspaceFormat;

  log(`Found ${hyperspacePilotIds.length} Hyperspace pilots`);
  log(`Found ${hyperspaceUpgradeIds.length} Hyperspace upgrades`);

  const updatesInProgress = [];

  manifest.pilots.forEach(({ faction, ships }) => {
    log(`Loading ${faction} ships`);
    ships.forEach(path => {
      const promise = getXWDFile(path)
        .then(result => {
          log(`Updating ${path}`);
          return Object.assign({}, result, {
            pilots: result.pilots.map(pilot =>
              Object.assign({}, pilot, {
                hyperspace: hyperspacePilotIds.indexOf(pilot.ffg) > -1
              })
            )
          });
        })
        .then(newResult => jsonfile.writeFile(path, newResult));
      updatesInProgress.push(promise);
    });
  });

  manifest.upgrades.forEach(path => {
    const promise = getXWDFile(path)
      .then(result => {
        log(`Updating ${path}`);
        return result.map(upgrade =>
          Object.assign({}, upgrade, {
            hyperspace: upgrade.sides.some(
              side => hyperspaceUpgradeIds.indexOf(side.ffg) > -1
            )
          })
        );
      })
      .then(newResult => jsonfile.writeFile(path, newResult));
    updatesInProgress.push(promise);
  });

  await Promise.all(updatesInProgress);
  log(`All done!`);
};

run();
