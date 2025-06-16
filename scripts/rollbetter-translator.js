// run this script with `node .\scripts\rollbetter-translator.js`

const prettier = require ("prettier")
const fs = require("fs");

function addToReverse(name, xws, dict) {
    if (dict[name]) {
        dict[name] = dict[name].concat(xws)
    } else {
        dict[name] = [xws]
    }
}

const pilotFactions = fs.readdirSync("./data/pilots");
const upgrades = fs.readdirSync("./data/upgrades");
let pilotValidity = {}
let upgradeValidity = {}
let translation = {}
let reverseTranslation = {}
pilotFactions.forEach(f => {
    fs.readdirSync(`./data/pilots/${f}`)
        .forEach(j => {
        const path = `./data/pilots/${f}/${j}`;
        const file = fs.readFileSync(path).toString();
        const ship = JSON.parse(file);
        const pilots = ship.pilots;
        pilots.forEach(p => {
            translation[p.xws] = p.name
            if (p.xws.includes('battleofyavin')) translation[p.xws] += " (BoY)"
            if (p.xws.includes('siegeofcoruscant')) translation[p.xws] += " (SoC)"
            if (p.xws.includes('battleoverendor')) translation[p.xws] += " (BoE)"
            // reverseTranslation[translation[p.xws]] = p.xws
            addToReverse(translation[p.xws], p.xws, reverseTranslation)
            pilotValidity[p.xws] = {
                standard: p.standard,
                epic: p.epic,
                extended: p.extended
            }
        })
        translation[ship.xws] = ship.name
        addToReverse(translation[ship.xws], ship.xws, reverseTranslation)
    })
})

const file = fs.readFileSync(`./data/factions/factions.json`).toString()
const jsonFactions = JSON.parse(file) // this is an array
jsonFactions.forEach(jsf => {
    translation[jsf.xws] = jsf.name
    // reverseTranslation[translation[jsf.xws]] = jsf.xws
    addToReverse(translation[jsf.xws], jsf.xws, reverseTranslation)
})

upgrades.forEach(u => {
    const file = fs.readFileSync(`./data/upgrades/${u}`).toString()
    const upgrade = JSON.parse(file)
    upgrade.forEach(uu => {
        translation[uu.xws] = uu.name
        if (uu.xws.includes('battleofyavin')) translation[uu.xws] += " (BoY)"
        if (uu.xws.includes('siegeofcoruscant')) translation[uu.xws] += " (SoC)"
        if (uu.xws.includes('battleoverendor')) translation[uu.xws] += " (BoE)"
        
        // reverseTranslation[translation[uu.xws]] = uu.xws
        addToReverse(translation[uu.xws], uu.xws, reverseTranslation)
        upgradeValidity[uu.xws] = {
            standard: uu.standard,
            epic: uu.epic,
            extended: uu.extended
        }
    })
})


let translationOutput = {}
let sortedKeys = Object.keys(translation).sort()
sortedKeys.forEach(k => {
    translationOutput[k] = translation[k]
})

sortedKeys = Object.keys(pilotValidity).sort()
let pilotValidityOutput = {}
sortedKeys.forEach(k => {
    pilotValidityOutput[k] = pilotValidity[k]
})

sortedKeys = Object.keys(upgradeValidity).sort()
let upgradeValidityOutput = {}
sortedKeys.forEach(k => {
    upgradeValidityOutput[k] = upgradeValidity[k]
})

let reverseTranslationOutput = {}
const sortedReverseKeys = Object.keys(reverseTranslation).sort()
sortedReverseKeys.forEach(k => {
    if (/[()\/\-\.'’“” ]/.test(k)) {
        reverseTranslationOutput[k.toLowerCase()] = reverseTranslation[k].reduce(function(a, b) {
            return a.length <= b.length ? a : b;
        })
    }
})

const formatted = prettier.format(JSON.stringify(translationOutput), {
    trailingComma: "none",
    parser: "json"
});

fs.writeFileSync(`./xwing-translation.json`, formatted, "utf8");

const formattedPilotValid = prettier.format(JSON.stringify(pilotValidityOutput), {
    trailingComma: "none",
    parser: "json"
});

const formattedUpgradeValid = prettier.format(JSON.stringify(upgradeValidityOutput), {
    trailingComma: "none",
    parser: "json"
});

fs.writeFileSync(`./xwing-pilot-validity.json`, formattedPilotValid, "utf8");
fs.writeFileSync(`./xwing-upgrade-validity.json`, formattedUpgradeValid, "utf8");

const formattedReverse = prettier.format(JSON.stringify(reverseTranslationOutput), {
    trailingComma: "none",
    parser: "json"
});

fs.writeFileSync(`./xwing-reverse-translation.json`, formattedReverse, "utf8");
