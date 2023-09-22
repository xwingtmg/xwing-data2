import * as ExcelJS from "exceljs";
import fs, { promises } from "fs";
import prettier from "prettier";

declare global {
  interface String {
    // @ts-ignore
    replaceAll: (search: string, replacement: string) => string;
    trimName: () => string;
  }
}
// @ts-ignore
String.prototype.replaceAll = function(search: string, replacement: string) {
  const target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};
// @ts-ignore
String.prototype.replaceAll = function(search: string, replacement: string) {
  const target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};
String.prototype.trimName = function() {
  return this.toLowerCase()
    .replaceAll("•", "")
    .replaceAll("“", "")
    .replaceAll("”", "")
    .replaceAll("’", "")
    .replaceAll("'", "")
    .replaceAll('"', "")
    .replaceAll("–", "-")
    .replaceAll("(cyborg)", "")
    .replaceAll("(open)", "")
    .replaceAll("(perfected)", "")
    .replaceAll("(open)", "")
    .replaceAll("(closed)", "")
    .replaceAll("(erratic)", "")
    .replaceAll("(active)", "")
    .replaceAll("(inactive)", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .replaceAll("é", "e")
    .trim();
};

export const getName = (f: string) =>
  f
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("/", "-");

const findShipAndPilot = (shipName: string, name: string, subtitle: string) => {
  const factions = fs.readdirSync("./data/pilots");
  const shipsAndPilots = factions
    .map(f => {
      const ships = fs
        .readdirSync(`./data/pilots/${f}`)
        .map(j => {
          const path = `./data/pilots/${f}/${j}`;
          const file = fs.readFileSync(path).toString();
          const ship = JSON.parse(file);

          if (ship.name.trimName() !== shipName.trimName()) {
            return;
          }
          const pilots = ship.pilots;
          if (subtitle?.length > 0) {
            const pilot = pilots.find(
              (p: any) =>
                p.name.trimName() === name.trimName() &&
                p.caption?.trimName() === subtitle.trimName()
            );
            if (pilot) {
              return { ship, pilot, path };
            }
          }
          const pilot = pilots.find(
            (p: any) => p.name.trimName() === name.trimName()
          );
          if (pilot) {
            return { ship, pilot, path };
          }
        })
        .filter(x => x);
      return ships;
    })
    .reduce((a, c) => [...a, ...c], [])
    .filter(x => x);

  if (shipsAndPilots.length > 1 && subtitle?.length > 0) {
    return shipsAndPilots.find(
      p => p?.pilot?.caption?.trimName() === subtitle.trimName()
    );
  }
  return shipsAndPilots[0];
};

const blacklist = [
  "IMPERIAL",
  "REBEL",
  "REPUBLIC",
  "Ship Points Document",
  "Effective Date: 03/01/2022"
];

const runShips = async () => {
  const wbLoader = new ExcelJS.Workbook();
  const file = await promises.readFile("./scripts/amg/ship_points.xlsx");
  const wb = await wbLoader.xlsx.load(file);

  let shipName = "";

  wb.worksheets.forEach(ws => {
    ws.eachRow(row => {
      if (row.getCell(1).toString() === "Pilot Name") {
        return;
      }

      let pilotName = row.getCell(1).text.replaceAll("•", "");
      const subtitle = row.getCell(2).text;
      const cost = row.getCell(3).text;
      const loadout = row.getCell(4).text;
      // const upgrades = row.getCell(5).text;
      const keywords = row
        .getCell(6)
        .text.split(",")
        .map(s => s.trim());
      const std = row.getCell(7).text;
      const ext = row.getCell(8).text;

      for (const bl of blacklist) {
        if (pilotName.indexOf(bl) >= 0) {
          return;
        }
      }

      if (subtitle === "[object Object]") {
        shipName = pilotName.replace(" (continued)", "");

        if (shipName === "Scavenged YT-1300 Light Freighter") {
          shipName = "Scavenged YT-1300";
        } else if (shipName === "Xi-class shuttle") {
          shipName = "Xi-class Light Shuttle";
        } else if (shipName === "Upsilon-class shuttle") {
          shipName = "Upsilon-class Command Shuttle";
        }
        return;
      }
      if (pilotName === "Nimi Chereen") {
        pilotName = "Nimi Chireen";
      } else if (pilotName === "Shadow Collective Operative") {
        pilotName = "Shadow Collective Operator";
      }

      const shipAndPilot = findShipAndPilot(shipName, pilotName, subtitle);
      if (!shipAndPilot || !cost) {
        console.log(
          `Not found: '${shipName}' '${pilotName}' '${subtitle}' ${cost} ${loadout} ${keywords} ${std} ${ext}`
        );
        return;
      }

      const { ship, pilot, path } = shipAndPilot;

      pilot.name = pilotName;
      pilot.caption = subtitle?.length > 0 ? subtitle : undefined;

      pilot.cost = parseInt(cost, 10);
      pilot.loadout = parseInt(loadout, 10);
      pilot.keywords =
        keywords.length > 0 && keywords[0] !== "" ? keywords : undefined;
      pilot.standard = std === "Yes" ? true : false;
      pilot.extended = ext === "Yes" ? true : false;
      pilot.epic = true;

      try {
        const formatted = prettier.format(JSON.stringify(ship), {
          trailingComma: "all",
          singleQuote: true,
          parser: "json"
        });
        fs.writeFileSync(path, formatted, "utf8");
      } catch (error) {
        console.error(`Could not save ${pilot.xws}`, error);
        // console.error(`Could not save ${pilot.xws}`, JSON.stringify(ship));
      }
    });
  });
};

const matchUpgrade = (name: string, faction: string, upgrade: any) => {
  if (upgrade.sides[0].title.trimName() === name.trimName()) {
    if (faction === 'Generic' || !('restrictions' in upgrade)) {
      return true;
    } else {
      for (const r of upgrade.restrictions) {
        if ('factions' in r) {
          for (const f of r.factions) {
            if (f === faction) {
              return true;
            }
          }
          return false;
        }
      }
    return true;
    }
  }
  return false;
}

const findUpgrade = (name: string, type: string, faction: string) => {
  const path = `./data/upgrades/${type.toLowerCase()}.json`;
  const file = fs.readFileSync(path).toString();
  const upgrades = JSON.parse(file);

  const upgrade = upgrades.find(
    (u: any) => matchUpgrade(name, faction, u)
  );
  if (upgrade) {
    return { upgrade, path, file: upgrades };
  }
};

const runUpgrades = async () => {
  const wbLoader = new ExcelJS.Workbook();
  const file = await promises.readFile("./scripts/amg/upgrade_points.xlsx");
  const wb = await wbLoader.xlsx.load(file);
  // Read lists

  wb.worksheets.forEach(ws => {
    let faction = ws.getCell('A2').text.toLowerCase();
    if (faction === "separatist") {
      faction = "separatistalliance";
    } else if (faction === "republic") {
      faction = "galacticrepublic";
    } else if (faction === "imperial" || faction.startsWith("upgrade points document")) {
      faction = "galacticempire";
    } else if (faction === "rebel") {
      faction = "rebelalliance";
    } else if (faction === "scum and villainy") {
      faction = "scumandvillainy";
    } else if (faction === "first order") {
      faction = "firstorder";
    } else if (faction === "resistance") {
      faction = "resistance";
    }
    ws.eachRow(row => {
      if (row.cellCount === 6 && row.getCell(1).text !== "Upgrade Name") {
        const name = row
          .getCell(1)
          .text.replaceAll("•", "")
          .split("/")[0];
        const upgradeType = row.getCell(2).text;
        const cost = parseInt(row.getCell(3).text);
        const std = row.getCell(5).toString();
        const ext = row.getCell(6).toString();

        let type = upgradeType
          .substring(0, upgradeType.indexOf("("))
          .split(",")
          .map(s => s.trim())[0];
        if (type === "Payload") {
          type = "Device";
        } else if (type === "Force Power") {
          type = "force-power";
        } else if (type === "Tactical Relay") {
          type = "tactical-relay";
        }

        const item = findUpgrade(name, type, faction);
        if (!item || name === "Delta-7B") {
          console.log(`Not found ${name} ${type} ${cost} ${std} ${ext}`);
          return;
        }

        const { upgrade, path, file } = item;

        upgrade.cost = cost === null ? { value: 0 } : { value: cost };
        upgrade.standard = std === "Yes" ? true : false;
        upgrade.extended = ext === "Yes" ? true : false;
        upgrade.epic = true;
        delete upgrade.hyperspace;

        const formatted = prettier.format(JSON.stringify(file), {
          trailingComma: "all",
          singleQuote: true,
          parser: "json"
        });
        fs.writeFileSync(path, formatted, "utf8");
      }
    });
  });
};

const runner = async () => {
  await runShips();
  await runUpgrades();
};

runner();
