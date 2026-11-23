import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

/** A raw entry of `contributes.menus["editor/title"]`. */
interface RawMenuItem {
  command: string;
  group: string;
}

/** A menu item once VS Code has parsed its group. */
interface ParsedMenuItem {
  command: string;
  group: string;
  order?: number;
  title: string;
}

/** The four nagular actions, in the order they must be displayed. */
const NAGULAR_COMMANDS = ["nagular.goToTs", "nagular.goToHtml", "nagular.goToStyle", "nagular.goToTest"];

/**
 * Replays the group parsing of VS Code (`src/vs/workbench/services/actions/common/menusExtensionPoint.ts`).
 *
 * @param {string} group - The raw group of the menu item, such as `navigation@-4`.
 * @return {{ group: string; order?: number }} The group name and the optional order.
 */
const parseGroup = (group: string): { group: string; order?: number } => {
  const idx = group.lastIndexOf("@");
  if (idx > 0) {
    return { group: group.substr(0, idx), order: Number(group.substr(idx + 1)) || undefined };
  }
  return { group };
};

/**
 * Replays the sorting of VS Code (`src/vs/platform/actions/common/menuService.ts`):
 * group name first, then order, then title.
 *
 * @param {ParsedMenuItem} first - The first item to compare.
 * @param {ParsedMenuItem} second - The second item to compare.
 * @return {number} A negative number, zero or a positive number.
 */
const compareItems = (first: ParsedMenuItem, second: ParsedMenuItem): number => {
  if (first.group !== second.group) {
    return first.group < second.group ? -1 : 1;
  }
  const firstPriority = first.order || 0;
  const secondPriority = second.order || 0;
  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }
  if (first.title === second.title) {
    return 0;
  }
  return first.title < second.title ? -1 : 1;
};

/**
 * Reads the manifest of the extension.
 *
 * @return {{ menus: RawMenuItem[]; titles: Map<string, string> }} The editor/title entries and the command titles.
 */
const readManifest = (): { menus: RawMenuItem[]; titles: Map<string, string> } => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")) as {
    contributes: {
      commands: { command: string; title: string }[];
      menus: { "editor/title": RawMenuItem[] };
    };
  };
  const titles = new Map<string, string>();
  manifest.contributes.commands.forEach((entry) => titles.set(entry.command, entry.title));
  return { menus: manifest.contributes.menus["editor/title"], titles };
};

suite("Nagular icon order unit test suite", () => {
  test("should keep the four navigation actions grouped first in the editor title", () => {
    const { menus, titles } = readManifest();

    const items: ParsedMenuItem[] = menus.map((entry) => {
      const parsed = parseGroup(entry.group);
      return {
        command: entry.command,
        group: parsed.group,
        order: parsed.order,
        title: titles.get(entry.command) || entry.command,
      };
    });

    // A third-party extension contributes to the very same group, with a positive order.
    items.push({
      command: "third.party.action",
      group: "navigation",
      order: 1,
      title: "Third Party Action",
    });
    items.sort(compareItems);

    const nagularItems = items.filter((item) => NAGULAR_COMMANDS.includes(item.command));

    assert.strictEqual(nagularItems.length, 4, "the four navigation actions must be contributed to the editor title");
    assert.deepStrictEqual(
      nagularItems.map((item) => item.command),
      NAGULAR_COMMANDS,
      "the four navigation actions must be displayed in the TS, HTML, Style, Test order",
    );
    assert.deepStrictEqual(
      nagularItems.map((item) => item.group),
      ["navigation", "navigation", "navigation", "navigation"],
      "the four navigation actions must stay in the navigation group to be displayed in the title bar",
    );
    assert.deepStrictEqual(
      nagularItems.map((item) => item.order),
      [-4, -3, -2, -1],
      "the four navigation actions must use decreasing negative orders",
    );

    const firstOther = items.findIndex((item) => !NAGULAR_COMMANDS.includes(item.command));
    assert.strictEqual(
      firstOther,
      4,
      "the four navigation actions must be contiguous and placed before any other navigation contribution",
    );
  });

  test("should place the navigation actions before a third-party action of the same group", () => {
    const { menus, titles } = readManifest();

    const items: ParsedMenuItem[] = menus.map((entry) => {
      const parsed = parseGroup(entry.group);
      return {
        command: entry.command,
        group: parsed.group,
        order: parsed.order,
        title: titles.get(entry.command) || entry.command,
      };
    });
    items.push({
      command: "third.party.action",
      group: "navigation",
      order: 1,
      title: "Third Party Action",
    });
    items.sort(compareItems);

    const thirdPartyIndex = items.findIndex((item) => item.command === "third.party.action");
    const lastNagularIndex = items.map((item) => item.command).lastIndexOf("nagular.goToTest");

    assert.ok(thirdPartyIndex > lastNagularIndex, "the nagular actions must be sorted before the third-party action");
  });
});
