const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceRoot = path.join(__dirname, "..", "src");

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

function sourceImports(file) {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/^import\s+([^;]*);/gm)].map((match) => {
    const declaration = match[1];
    const specifier = declaration.match(/\bfrom\s+["']([^"']+)["']/) || declaration.match(/^["']([^"']+)["']/);
    assert.ok(specifier, `importación sin ruta reconocible en ${file}`);
    return specifier[1];
  });
}

function layer(file) {
  return path.relative(sourceRoot, file).split(path.sep).slice(0, 2).join("/");
}

test("los módulos TypeScript mantienen rutas, fronteras y dependencias sin ciclos", () => {
  const files = sourceFiles(sourceRoot);
  const graph = new Map();
  for (const file of files) {
    const dependencies = [];
    for (const specifier of sourceImports(file)) {
      const from = layer(file);
      if (from.startsWith("desktop/renderer") || from.startsWith("extension/")) {
        assert.ok(!specifier.startsWith("node:") && specifier !== "electron" && specifier !== "ws",
          `${from} no debe importar ${specifier}`);
      }
      if (!specifier.startsWith(".")) continue;
      const target = path.resolve(path.dirname(file), specifier.replace(/\.js$/, ".ts"));
      assert.ok(fs.existsSync(target), `${file} importa una ruta inexistente: ${specifier}`);
      dependencies.push(target);
      const to = layer(target);
      if (from.startsWith("shared/")) assert.ok(to.startsWith("shared/"), `${from} importa ${to}`);
      if (from.startsWith("extension/")) {
        assert.ok(to.startsWith("extension/") || to.startsWith("shared/"), `${from} importa ${to}`);
      }
      if (from.startsWith("desktop/renderer")) {
        assert.ok(to.startsWith("desktop/renderer") || to.startsWith("shared/"), `${from} importa ${to}`);
      }
      if (from.startsWith("desktop/lyrics")) {
        assert.ok(to.startsWith("desktop/lyrics") || to.startsWith("shared/"), `${from} importa ${to}`);
      }
    }
    graph.set(file, dependencies);
  }

  const visited = new Set();
  const visiting = new Set();
  function visit(file) {
    assert.ok(!visiting.has(file), `ciclo de importaciones en ${path.relative(sourceRoot, file)}`);
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file)) visit(dependency);
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of files) visit(file);
});
