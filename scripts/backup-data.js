import { copyFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "data", "db.json");
const destinationDirectory = path.join(root, "data", "backups");
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");

await mkdir(destinationDirectory, { recursive: true });
await stat(source);
const destination = path.join(destinationDirectory, `db-${stamp}.json`);
await copyFile(source, destination);

const backups = (await readdir(destinationDirectory))
  .filter((name) => /^db-.*\.json$/.test(name))
  .sort()
  .reverse();

for (const oldBackup of backups.slice(30)) {
  await unlink(path.join(destinationDirectory, oldBackup));
}

console.log(`Backup created: ${destination}`);
