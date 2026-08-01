const { checkKeywordsInString } = require("./helpers/keywords");
const { validateConditionXWSId } = require("./helpers/data");
const { matchers } = require("jest-json-schema");
expect.extend(matchers);

const { pilots: pilotFiles } = require("../data/manifest.json");

const pilotSchema = require("./schemas/pilot.schema.json");
const shipSchema = require("./schemas/ship.schema.json");

pilotFiles.forEach(({ faction, ships }) => {
  describe(`${faction}`, () => {
    ships.forEach(filename => {
      const ship = require(`../${filename}`);
      const { pilots } = ship;
      describe(`${ship.name}`, () => {
        test(`Ship`, () => {
          expect(ship).toMatchSchema(shipSchema);
        });

        describe(`Pilots`, () => {
          pilots.forEach(p => {
            test(`${p.name || `(unknown pilot)`}`, () => {
              if (!global.skipDebug) {
                const Ajv = require("ajv");
                const ajv = new Ajv({ allErrors: true, strict: false, verbose: true });

                const validate = ajv.compile(pilotSchema);
                const valid = validate(p);
              
                if (!valid) {
                  console.log(`❌ Validation errors for: ${p.name}`);
                  console.log(validate.errors);
                }
              }             

              expect(p).toMatchSchema(pilotSchema);
              if (p.text) {
                checkKeywordsInString(p.text);
              }
              if (p.ability) {
                checkKeywordsInString(p.ability);
              }
              if (p.shipAbility) {
                checkKeywordsInString(p.shipAbility.text);
              }
              if (p.conditions) {
                p.conditions.forEach(c => validateConditionXWSId(c));
              }
            });
          });
        });
      });
    });
  });
});
