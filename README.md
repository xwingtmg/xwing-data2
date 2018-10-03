# X-Wing Data 2

An easy-to-use collection of all data from [X-Wing: The Miniatures Game (Second Edition)](https://www.fantasyflightgames.com/en/products/x-wing-second-edition/) by [Fantasy Flight Games](http://fantasyflightgames.com/).

If you're looking for data and images of X-Wing First Edition, you can find that here: [xwing-data](https://github.com/guidokessels/xwing-data).

### XWS2 ids

XWS ids are generated using the following steps:
1. Take the English-language name as printed on the card
2. Lowercase the name
3. Convert non-ASCII characters to closest ASCII equivalent (to remove umlauts, etc.)
4. Remove non-alphanumeric characters
5. Check for collisions, and add expansion suffixes until there is no more collision

Expansion suffixes per type:
Pilots: `pilotname-shipname-factionname-productsku`
Upgrades: `upgradename-slotname-productsku`
Conditions: `conditionname-productsku`

XWS ids have to be unique per type (pilot/upgrade/condition/etc) and do not collide with ids of other types. So there can be a `hansolo` _pilot_ and a `hansolo` _upgrade_, but there cannot be two upgrades with the `hansolo` xws id (regardless of the slot of those upgrades). One of those cards would get the `-slotname` suffix (for example: `hansolo-gunner`).
