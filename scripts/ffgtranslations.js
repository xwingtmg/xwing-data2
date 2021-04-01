/**
 * Processes ffgcards-*.json downloaded data and updates translated values in ../data/translations.json
 */

const fs = require("fs");
const stringify = require("json-stable-stringify");

const languages = ["en", "fr", "de", "es"];

const readFile = pathFromRoot =>
  fs.readFileSync(`${__dirname}/../${pathFromRoot}`, "utf8");

let dataStrings = {};

languages.forEach(language => {
  const fileName = `scripts/ffgcards-${language}.json`;
  console.log(`Reading ./${fileName}`);
  try {
    dataStrings[language] = readFile(fileName);
  } catch (err) {
    console.log(`Could not read ${fileName}. Use ffgscrape.js first!`);
    process.exit(1);
  }
});

let translations = JSON.parse(readFile("data/translation.json"));
let ffg2xws = JSON.parse(readFile("data/ffg-xws.json"));

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

function sanitize(text) {
  // Return sanitized text
  // If text is falsy, just return it back
  if (!text) {
    return text;
  }
  let sanitized = text;
  sanitized = sanitized.replace(/\n/g, "");
  sanitized = sanitized.replace(/–/g, "-");
  sanitized = sanitized.replace(/’/g, "'");
  sanitized = sanitized.replace(/“/g, '"');
  sanitized = sanitized.replace(/”/g, '"');
  sanitized = sanitized.replace(/„/g, '"');
  sanitized = sanitized.replace(/[˚º]/g, "°");
  return sanitized;
}

Object.entries(dataStrings).forEach(([language, dataString]) => {
  let data = JSON.parse(dataString);

  data.cards.forEach(card => {
    let xwsId;
    switch (card.card_type_id) {
      case 1:
        xwsId = ffg2xws.pilots[card.id];
        break;
      case 2:
        xwsId = ffg2xws.upgrades[card.id];
        break;
      default:
        return;
    }

    let name = stripAllTags(sanitize(card.name).replace(/•/g, "")).trim();

    // console.debug(`translations[${xwsId}][${language}] = ${name}`)

    if (typeof xwdId === "undefined") return;

    if (!translations.hasOwnProperty(xwsId)) {
      translations[xwsId] = {};
    }

    translations[xwsId][language] = name;
  });
});

fs.writeFileSync(
  `${__dirname}/../data/translation.json`,
  stringify(translations, { space: 2 })
);
