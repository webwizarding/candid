// Collect verbatim license notices from installed dependencies without executing them.
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const root = resolve(".");
const groups = new Map();
let components = 0;
function include(component, file) {
  if (!existsSync(file) || !statSync(file).isFile()) return;
  const data = readFileSync(file, "utf8").trim();
  if (!data || data.includes("\0")) return;
  const hash = createHash("sha256").update(data).digest("hex");
  const group = groups.get(hash) ?? { components: new Set(), text: data };
  group.components.add(component);
  groups.set(hash, group);
}
function notices(component, directory, depth = 0) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!/^(licen[cs]e|copying|notice|copyright)([._-]|$)/i.test(entry.name))
      continue;
    const path = join(directory, entry.name);
    if (entry.isFile()) include(component, path);
    else if (entry.isDirectory() && depth < 2) {
      for (const child of readdirSync(path, { withFileTypes: true }))
        if (child.isFile()) include(component, join(path, child.name));
    }
  }
}
include(
  "Geist fonts (SIL Open Font License 1.1)",
  join(root, "assets/og/OFL.txt"),
);
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path.startsWith("node_modules/") || info.dev) continue;
  const directory = resolve(root, path);
  if (!directory.startsWith(join(root, "node_modules") + sep)) continue;
  const manifest = join(directory, "package.json");
  if (!existsSync(manifest)) continue;
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  const component = `npm: ${pkg.name}@${pkg.version} (${pkg.license ?? "see package license"})`;
  notices(component, directory);
  components++;
}
// Next.js embeds additional third-party code under dist/compiled.
const compiled = join(root, "node_modules/next/dist/compiled");
function compiledNotices(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) compiledNotices(path);
    else if (/^(license|copying|notice)([._-]|$)/i.test(entry.name))
      include(
        `Next.js compiled: ${dirname(path).slice(compiled.length + 1)}`,
        path,
      );
  }
}
compiledNotices(compiled);
const cargoHome = process.env.CARGO_HOME || join(homedir(), ".cargo");
const registry = join(cargoHome, "registry/src");
const registries = existsSync(registry) ? readdirSync(registry) : [];
const cargoLock = readFileSync(join(root, "src-tauri/Cargo.lock"), "utf8");
for (const block of cargoLock.split("[[package]]").slice(1)) {
  const name = block.match(/^name = "([\w-]+)"/m)?.[1];
  const version = block.match(/^version = "([\w.+-]+)"/m)?.[1];
  if (!name || !version) continue;
  for (const source of registries) {
    const directory = join(registry, source, `${name}-${version}`);
    if (!existsSync(directory)) continue;
    const manifest = readFileSync(join(directory, "Cargo.toml"), "utf8");
    const license =
      manifest.match(/^license = "([^"]+)"/m)?.[1] ?? "see crate license";
    notices(`Rust: ${name}@${version} (${license})`, directory);
    components++;
    break;
  }
}
const intro = `Candid — third-party notices\n\nCandid's source is MIT-licensed; original Kargul Studio attribution is preserved in LICENSE.\n\nThe following verbatim notices were collected from installed production npm packages, bundled Next.js dependencies, Geist fonts, and locally available locked Rust crates. Not every listed component is loaded at runtime. Identical license texts are grouped. ICAL.js is unmodified and available under MPL-2.0 at https://github.com/kewisch/ical.js; its exact version is recorded in package-lock.json.\n\n`;
const blocks = [...groups.values()]
  .sort((a, b) =>
    [...a.components].sort()[0].localeCompare([...b.components].sort()[0]),
  )
  .map(
    (group) =>
      `${"=".repeat(72)}\n${[...group.components].sort().join("\n")}\n${"=".repeat(72)}\n\n${group.text}\n`,
  );
writeFileSync(join(root, "THIRD_PARTY_NOTICES.txt"), intro + blocks.join("\n"));
console.log(
  `Collected ${groups.size} distinct notice texts from ${components} dependency packages.`,
);
