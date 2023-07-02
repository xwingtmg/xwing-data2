# X-Wing Data 2

An easy-to-use collection of all data from [X-Wing: The Miniatures Game (Second Edition)](https://www.atomicmassgames.com/xwing-documents) by [Atomic Mass Games](https://www.atomicmassgames.com/).

If you're looking for data and images of X-Wing First Edition, you can find that here: [xwing-data](https://github.com/guidokessels/xwing-data).

## XWS ids

Every ship, pilot, upgrade, etc. has a `xws` field that contains a unique id. These ids are used in the [X-Wing Squadron Specification (or `XWS`)](https://github.com/elistevens/xws-spec/). Note that ids are only unique per card type (as explained below): a pilot can safely have the same id as an upgrade, for example.

New XWS ids are generated using the following steps:

1. Take the English-language name as printed on the card
1. Lowercase the name
1. Convert non-ASCII characters to closest ASCII equivalent (to remove umlauts, etc.)
1. Remove non-alphanumeric characters
1. If the pilot has a standardized loadout, add the expansion name as a suffix (eg wampa-battleofyavin)
1. Check for collisions with other ids of the same type, and add expansion suffixes until there is no more collision

Expansion suffixes per type:
Pilots: `pilotname-shipname-factionname-expansionname-productsku`
Upgrades: `upgradename-slotname-expansionname-productsku`
Conditions: `conditionname-expansionname-productsku`

XWS ids have to be unique per type (pilot/upgrade/condition/etc) and do not collide with ids of other types. So there can be a `hansolo` _pilot_ and a `hansolo` _upgrade_, but there cannot be two upgrades with the `hansolo` xws id (regardless of the slot of those upgrades). One of those cards would get the `-slotname` suffix (for example: `hansolo-gunner`).

## Scripts

There are a few scripts that make it easier to work on the data.

You can run these scripts using `npm` or `yarn`.

### Scripts to update data

| Script                | Description                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `yarn ts-node ./scripts/amg/parser.ts` | Scrape ship_points.xlsx and upgrade_points.xlsx for points and format legality (Excel sheets creaed from AMG PDFs using https://www.ilovepdf.com/pdf_to_excel |


### Scripts to work with the repository

| Script                          | Description                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn run format`               | Format all `.json` files in the `data` folder using [Prettier](https://prettier.io/)                                                                        |
| `yarn run changelog A...B`      | Generate a changelog between commits `A` and `B`, to be used in the release description on GitHub.<br />Example usage: `yarn run changelog 1.24.0...1.25.0` |
| `yarn run validate:json`        | Validate that all `.json` files contain valid JSON                                                                                                          |
| `yarn run validate:tests`       | Run all unit tests                                                                                                                                          |
| `yarn run validate:tests:watch` | Run all unit tests in watch mode                                                                                                                            |

## Creating a pull request

Before opening a pull request, see the following checklist:

1. Use sensible commit messages. Good: `add rebel fangs`. Bad: `create fang-fighter.json`
1. Ensure there are no merge conflicts with `master` (rebase on top of `master` or merge it into your branch)
1. Ensure tests pass: `yarn run validate:tests`
1. Use a sensible PR message, eg `add pride of mandalore rebel content`. PR messages can be the same as commit messages for single-commit PRs.

## Creating a release

Go through these steps to create a new release:

1. Bump the version number in `package.json` and `data/manifest.json` according to the [Versioning](#Versioning) rules listed below
1. Push the `package.json` and `data/manifest.json` changes to GitHub and/or merge them to the `master` branch
1. [Create a new release](https://github.com/guidokessels/xwing-data2/releases/new) on GitHub and use the following:
   - `Tag version`: The tag you just created
   - `Target`: `master` branch
   - `Release title`: The version number
   - `Describe this release`: The output of the `yarn run changelog PREVIOUS_VERSION...HEAD` command (replace `PREVIOUS_VERSION` with the [latest available tag](https://github.com/guidokessels/xwing-data2/tags))
1. All done! :tada:

## Versioning

This project uses [SemVer](http://semver.org/). Given a `MAJOR.MINOR.PATCH` version number, we will increment the:

- `MAJOR` version when existing content is changed in such a way that it can break consumers of the data
- `MINOR` version when new content is added in a backwards-compatible manner, or existing content is changed in a backwards-compatible manner
- `PATCH` version when fixing mistakes in existing content

## History

See the [Releases tab](https://github.com/guidokessels/xwing-data2/releases) in Github.

## License

[MIT](http://guidokessels.mit-license.org/)

---

Star Wars: X-Wing and all related properties, images and text are owned by Atomic Mass Games, Lucasfilm Ltd., and/or Disney.
