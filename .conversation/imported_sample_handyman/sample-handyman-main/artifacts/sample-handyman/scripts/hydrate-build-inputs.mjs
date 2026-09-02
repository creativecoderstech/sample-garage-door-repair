#!/usr/bin/env node
/**
 * Force-read build inputs so iCloud Desktop / File Provider has hydrated
 * file contents before Vite's fs.copyFile runs (cold copyFile can hang forever).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dirs = [
  path.join(root, 'public'),
  path.join(root, 'src', 'assets'),
  path.join(root, '..', '..', 'attached_assets', 'generated_images'),
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__MACOSX' || entry.name === '.DS_Store') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const files = dirs.flatMap((d) => walk(d));
for (const file of files) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(Math.min(65536, fs.fstatSync(fd).size || 1));
    fs.readSync(fd, buf, 0, buf.length, 0);
  } finally {
    fs.closeSync(fd);
  }
}

console.log(`hydrated ${files.length} build input files`);
