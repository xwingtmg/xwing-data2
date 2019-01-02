const jsonfile = require("jsonfile");
const fetch = require("node-fetch");

const dataRoot = __dirname + "/../data";
const manifest = require(`${dataRoot}/manifest.json`);

const log = (...args) => console.log(...args);

const getApiResponse = async endpoint => {
  log(`Fetching API endpoint ${endpoint}`);
  const response = await fetch(
    `https://squadbuilder.fantasyflightgames.com/api${endpoint}`
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

  const { cards: hyperspaceCards } = await getApiResponse(
    `/cards/pilots/?game_format=${hyperspaceFormat.id}`
  );
  log(`Found ${hyperspaceCards.length} legal Hyperspace cards`);

  const hyperspaceLegalIds = hyperspaceCards.map(cards => cards.id);

  const shipsInProgress = [];
  manifest.pilots.forEach(({ faction, ships }) => {
    log(`Loading ${faction} ships`);
    ships.forEach(path => {
      const promise = getXWDFile(path)
        .then(result => {
          log(`Processing ${path}`);
          result.pilots = result.pilots.map(pilot =>
            Object.assign({}, pilot, {
              hyperspace: hyperspaceLegalIds.indexOf(pilot.ffg) > -1
            })
          );
          return result;
        })
        .then(newResult => jsonfile.writeFile(path, newResult));
      shipsInProgress.push(promise);
    });
  });

  await Promise.all(shipsInProgress);
  log(`All done!`);
};

run();
