/**
 * Downloads card JSON data from https://squadbuilder.fantasyflightgames.com/api/cards/{id}/ and
 * stores them in ffgcards-en.json
 */

var https = require("https");
var fs = require("fs");

let cards = "https://x-wing-api.fantasyflightgames.com/cards/";
let metadata = "https://x-wing-api.fantasyflightgames.com/app-metadata/";

let languages = ['en', 'fr', 'de', 'es']

function getData(url, language) {
  console.log("Retrieving " + url);
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'Accept-Language': language
      }
    }, res => {
      let data = "";
      if (res.status >= 400) {
        reject(res);
      } else {
        res.on("data", chunk => {
          data += chunk.toString();
        });
        res.on("end", () => {
          resolve(JSON.parse(data));
        });
      }
    });
    request.on("error", reject);
    request.end();
  });
}

languages.forEach(language => {
  getData(cards, language).then(data => {
    console.log(`Writing to ffgcards-${language}.json`);
    fs.writeFileSync(`${__dirname}/ffgcards-${language}.json`, JSON.stringify(data, null, 2));
  });

  getData(metadata, language).then(data => {
    console.log(`Writing to ffgmetadata-${language}.json`);
    fs.writeFileSync(
        `${__dirname}/ffgmetadata-${language}.json`,
        JSON.stringify(data, null, 2)
    );
  });
});

