const path = require("path");
const { checkKeywordsInString } = require("./helpers/keywords");
const { validateConditionXWSId } = require("./helpers/data");
const { matchers } = require("jest-json-schema");
expect.extend(matchers);

const { upgrades: upgradeFiles } = require("../data/manifest.json");

const upgradeSchema = require("./schemas/upgrade.schema.json");

describe("Upgrades", () => {
  upgradeFiles.forEach(file => {
    const upgrades = require(`../${file}`);
    const filename = path.basename(file, path.extname(file));
    describe(`${filename}`, () => {
      upgrades.forEach(u => {
        const testName = u.name
          ? `${u.name} (${u.xws || `unknown xws`})`
          : `(unknown upgrade)`;
        test(testName, () => {
          expect(u).toMatchSchema(upgradeSchema);
          u.sides.forEach(side => {
            if (side.ability) {
              checkKeywordsInString(side.ability);
            }
            if (side.conditions) {
              side.conditions.forEach(c => validateConditionXWSId(c));
            }
          });
        });
      });
    });
  });
});
