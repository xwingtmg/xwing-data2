/**
 * Downloads card JSON data from https://squadbuilder.fantasyflightgames.com/api/cards/{id}/ and
 * stores them in ffgcards.json
 */

var https = require('https');
var fs = require('fs');

let url = "https://squadbuilder.fantasyflightgames.com/api/cards/";

let start = 1;
let end = 491;

let urls = [ ];
let data = { };

function getCards() {
    console.log("Retrieving " + url);
    return new Promise((resolve, reject) => {
        const request = https.get(url, (res) => {
            let data = "";
            if (res.status >= 400) {
                reject(res);
            } else {
                res.on('data', (chunk) => {
                    data += chunk.toString();
                });
                res.on('end', () => {
                    resolve(JSON.parse(data));
                });
            }
        });
        request.on('error', reject);
        request.end();
    });
}

getCards().then(
    (data) => {
        console.log("Writing to ffgcards.json");
        fs.writeFileSync('ffgcards.json', JSON.stringify(data, null, 2));
    }
)