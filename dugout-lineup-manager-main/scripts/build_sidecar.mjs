#!/usr/bin/env node
/**
 * Build the FastAPI backend into a Tauri sidecar binary.
 *
 * macOS and Linux: src-tauri/binaries/backend-sidecar-<target-triple>
 * Windows:        src-tauri/binaries/backend-sidecar-<target-triple>.exe
 *
 * The PyInstaller flags match the historical macOS shell build.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.resolve(projectDir, "..", "backend");
const targetDir = path.join(projectDir, "src-tauri", "binaries");
const cacheDir = path.join(backendDir, ".pyinstaller-cache");
const isWindows = process.platform === "win32";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findOnPath(command) {
  const locator = isWindows ? "where.exe" : "which";
  const result = spawnSync(locator, [command], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  const line = result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find(Boolean);
  return line || null;
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    fail(`Failed to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function targetTriple() {
  const result = spawnSync("rustc", ["-vV"], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(
      [
        "Failed to determine Rust host target triple.",
        "Install Rust and ensure 'rustc -vV' works.",
      ].join("\n"),
    );
  }
  const hostLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("host:"));
  const triple = hostLine?.split(/\s+/)[1];
  if (!triple) {
    fail(
      [
        "Failed to determine Rust host target triple.",
        "Install Rust and ensure 'rustc -vV' works.",
      ].join("\n"),
    );
  }
  return triple;
}

function pyinstallerCommand() {
  const executable = findOnPath("pyinstaller");
  if (executable) {
    return { command: executable, prefix: [] };
  }
  const python = findOnPath(isWindows ? "python" : "python3") || findOnPath("python");
  if (!python) {
    fail("pyinstaller was not found. Install it with: python -m pip install pyinstaller");
  }
  return { command: python, prefix: ["-m", "PyInstaller"] };
}

function moveBinary(builtPath, destPath) {
  fs.rmSync(destPath, { force: true });
  try {
    fs.renameSync(builtPath, destPath);
  } catch (error) {
    if (error && error.code === "EXDEV") {
      fs.copyFileSync(builtPath, destPath);
      fs.rmSync(builtPath, { force: true });
      return;
    }
    throw error;
  }
}

const triple = targetTriple();
fs.mkdirSync(targetDir, { recursive: true });
fs.mkdirSync(cacheDir, { recursive: true });

console.log(`Building backend from ${backendDir}...`);

const pyinstaller = pyinstallerCommand();
const env = { ...process.env, PYINSTALLER_CONFIG_DIR: cacheDir };
run(
  pyinstaller.command,
  [
    ...pyinstaller.prefix,
    "--clean",
    "--noconfirm",
    "--onefile",
    "--name",
    "backend-sidecar",
    "main.py",
  ],
  { cwd: backendDir, env },
);

const builtName = isWindows ? "backend-sidecar.exe" : "backend-sidecar";
const destName = isWindows
  ? `backend-sidecar-${triple}.exe`
  : `backend-sidecar-${triple}`;
const builtPath = path.join(backendDir, "dist", builtName);
const destPath = path.join(targetDir, destName);

if (!fs.existsSync(builtPath)) {
  const distDir = path.join(backendDir, "dist");
  const found = fs.existsSync(distDir) ? fs.readdirSync(distDir).join(", ") : "(missing)";
  fail(`PyInstaller output not found at ${builtPath}. dist contains: ${found}`);
}

console.log(`Moving binary to ${destPath}`);
moveBinary(builtPath, destPath);
if (!isWindows) {
  fs.chmodSync(destPath, 0o755);
}

fs.rmSync(path.join(backendDir, "build"), { recursive: true, force: true });
fs.rmSync(path.join(backendDir, "dist"), { recursive: true, force: true });
fs.rmSync(path.join(backendDir, "backend-sidecar.spec"), { force: true });

console.log("Build complete.");
