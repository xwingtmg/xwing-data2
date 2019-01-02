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

const addHyperspaceLegality = hyperspaceLegalIds => item =>
  Object.assign({}, item, {
    hyperspace: hyperspaceLegalIds.indexOf(item.ffg) > -1
  });

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
    `/cards/?game_format=${hyperspaceFormat.id}`
  );
  const {
    upgrades: hyperspaceUpgradeIds,
    pilots: hyperspacePilotIds
  } = hyperspaceCards.reduce(
    (acc, card) => {
      if (card.card_type_id === 1) acc.pilots.push(card.id);
      if (card.card_type_id === 2) acc.upgrades.push(card.id);
      return acc;
    },
    { upgrades: [], pilots: [] }
  );

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
            pilots: result.pilots.map(addHyperspaceLegality(hyperspacePilotIds))
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
            sides: upgrade.sides.map(
              addHyperspaceLegality(hyperspaceUpgradeIds)
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
