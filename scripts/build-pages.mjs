import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const root = process.cwd();
const webDirectory = join(root, "web");
const fixtureDirectory = join(root, "fixtures");
const classDirectory = join(fixtureDirectory, "classes");
const scriptDirectory = join(fixtureDirectory, "scripts");
const outputDirectory = join(root, "dist-pages");

async function jsonFiles(directory) {
  return (await readdir(directory))
    .filter((file) => file.endsWith(".json"))
    .sort();
}

async function buildFixturePayload() {
  const fixtures = {};
  for (const file of await jsonFiles(classDirectory)) {
    const id = basename(file, ".json");
    const scriptPath = join(scriptDirectory, file);
    const [feature, script] = await Promise.all([
      readFile(join(classDirectory, file), "utf8").then(JSON.parse),
      readFile(scriptPath, "utf8").then(JSON.parse)
    ]);
    if (feature.class_id !== id) throw new Error(`Fixture class_id must match filename: ${file}`);
    fixtures[id] = { feature, script };
  }
  return fixtures;
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(webDirectory, outputDirectory, { recursive: true });
await cp(classDirectory, join(outputDirectory, "fixtures", "classes"), { recursive: true });
await cp(scriptDirectory, join(outputDirectory, "fixtures", "scripts"), { recursive: true });

const fixturePayload = JSON.stringify(await buildFixturePayload()).replace(/</g, "\\u003c");
const outputIndex = join(outputDirectory, "index.html");
const index = await readFile(outputIndex, "utf8");
const marker = "<!-- STATIC_FIXTURE_PAYLOAD -->";
if (!index.includes(marker)) throw new Error(`Missing ${marker} in web/index.html`);
await writeFile(
  outputIndex,
  index.replace(marker, `<script>window.COLDOPEN_FIXTURES=${fixturePayload};</script>`),
  "utf8"
);

// Keep static asset requests out of the Function invocation path.
await writeFile(join(outputDirectory, "_routes.json"), JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2), "utf8");
console.log(`Built Cloudflare Pages assets in ${outputDirectory}`);
