const path = require("path");
const { matchers } = require("jest-json-schema");
expect.extend(matchers);

const { "quick-builds": quickBuildFiles } = require("../data/manifest.json");

const quickBuildsSchema = require("./schemas/quick-build.schema.json");

describe("Quick Builds", () => {
  quickBuildFiles.forEach(file => {
    const contents = require(`../${file}`);
    const filename = path.basename(file, path.extname(file));
    expect(contents).toHaveProperty("quick-builds");
    const { "quick-builds": quickBuilds } = contents;
    describe(`${filename}`, () => {
      quickBuilds.forEach((qb, i) => {
        const testName = [
          `#${i}`,
          `threat ${qb.threat}`,
          qb.pilots.map(d => d.id).join(", ")
        ].join(" - ");
        test(testName, () => {
          expect(qb).toMatchSchema(quickBuildsSchema);
        });
      });
    });
  });
});
