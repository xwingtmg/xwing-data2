/**
 * Downloads card JSON data from https://squadbuilder.fantasyflightgames.com/api/cards/{id}/ and
 * stores them in ffgcards.json
 */

var https = require("https");
var fs = require("fs");

let cards = "https://x-wing-api.fantasyflightgames.com/cards/";
let metadata = "https://x-wing-api.fantasyflightgames.com/app-metadata/";

function getData(url) {
  console.log("Retrieving " + url);
  return new Promise((resolve, reject) => {
    const request = https.get(url, res => {
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

getData(cards).then(data => {
  console.log("Writing to ffgcards.json");
  fs.writeFileSync(`${__dirname}/ffgcards.json`, JSON.stringify(data, null, 2));
});

getData(metadata).then(data => {
  console.log("Writing to ffgmetadata.json");
  fs.writeFileSync(
    `${__dirname}/ffgmetadata.json`,
    JSON.stringify(data, null, 2)
  );
});
