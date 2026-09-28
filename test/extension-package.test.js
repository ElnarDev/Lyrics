const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const extension = path.join(__dirname, "..", "extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8"));

test("extension package contains its popup, content script and every declared icon", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes("storage"));
  const files = [manifest.action.default_popup, "popup.js",
    ...manifest.content_scripts.flatMap((script) => script.js),
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon)];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(extension, file)), `${file} is missing`);
  }
  const popup = fs.readFileSync(path.join(extension, manifest.action.default_popup), "utf8");
  assert.match(popup, /<script src="popup\.js"><\/script>/);
});
