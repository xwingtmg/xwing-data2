const path = require("path");
const {
  validatePilotXWSId,
  validateUpgradeXWSIdForSlot
} = require("./helpers/data");
const { matchers } = require("jest-json-schema");
expect.extend(matchers);

const { "quick-builds": quickBuildFiles } = require("../data/manifest.json");

const quickBuildsSchema = require("./schemas/quick-build.schema.json");

describe("Quick Builds", () => {
  quickBuildFiles.forEach(file => {
    const contents = require(`../${file}`);

    test("has a top-level `quick-builds` property", () => {
      expect(contents).toHaveProperty("quick-builds");
    });

    // `data/quick-builds/resistance.json` -> `resistance`
    const faction = path.basename(file, path.extname(file));

    describe(`${faction}`, () => {
      const { "quick-builds": quickBuilds } = contents;

      quickBuilds.forEach((qb, i) => {
        // Example: `#64 - threat 2 - deathrain`
        const testName = [
          `#${i}`,
          `threat ${qb.threat}`,
          qb.pilots.map(d => d.id).join(", ")
        ].join(" - ");

        describe(testName, () => {
          test("matches schema", () => {
            expect(qb).toMatchSchema(quickBuildsSchema);
          });

          test("uses valid XWS ids", () => {
            qb.pilots.forEach(pilot => {
              const { id: pilotId, upgrades = {} } = pilot;
              validatePilotXWSId(pilotId);
              Object.entries(upgrades).forEach(([slot, ids]) => {
                ids.forEach(upgradeId =>
                  validateUpgradeXWSIdForSlot(upgradeId, slot)
                );
              });
            });
          });
        });
      });
    });
  });
});
