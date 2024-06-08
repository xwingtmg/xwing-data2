// run this script with `node .\scripts\rollbetter-translator.js`

const prettier = require ("prettier")
const fs = require("fs");

const file = fs.readFileSync("./data/legion.json").toString();
const legion = JSON.parse(file);
let translation = {}
Object.keys(legion).forEach((c) => {
    const card = legion[c]
    if (card.cardType == "unit") {
        let name = card.cardName
        if (card.title) name += " " + card.title
        translation[name] = card.rank
    }
})

let translationOutput = {}
let sortedKeys = Object.keys(translation).sort()
sortedKeys.forEach(k => {
    translationOutput[k] = translation[k]
})
const formatted = prettier.format(JSON.stringify(translationOutput), {
    trailingComma: "none",
    parser: "json"
});

fs.writeFileSync(`./legion-translation.json`, formatted, "utf8");
