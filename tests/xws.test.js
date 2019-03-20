const { getPilotXWSIds, getUpgradesXWSIds } = require("./helpers/data");

const checkForDuplicates = ids => {
  ids.reduce((acc, id) => {
    if (acc.indexOf(id) > -1) {
      throw new Error(`Duplicate XWS id: "${id}"`);
    }
    acc.push(id);
    return acc;
  }, []);
};

describe("XWS", () => {
  test("no duplicate pilot XWS ids", () => {
    checkForDuplicates(getPilotXWSIds());
  });
  test("no duplicate upgrade XWS ids", () => {
    checkForDuplicates(getUpgradesXWSIds());
  });
});
