const path = require('path');
const { runSilent, appendToFile, addToPackageJson, resolveNpmDependencySpec, logDetailed } = require('./utils');


async function installPipWithPackage(requirementsPath, packageName) {
  logDetailed(`installPipWithPackage called with requirementsPath: ${requirementsPath}, packageName: ${packageName}`);
  const dir = path.dirname(requirementsPath);
  logDetailed(`Appending ${packageName} to ${requirementsPath}`);
  await appendToFile(requirementsPath, packageName);
  logDetailed(`Running pip3 install -r "${requirementsPath}" in ${dir}`);
  await runSilent(`pip3 install -r "${requirementsPath}"`, { cwd: dir });
  logDetailed(`installPipWithPackage completed for ${packageName}`);
}

async function installPipWithPackages(requirementsPath, packageNames) {
  logDetailed(`installPipWithPackages called with requirementsPath: ${requirementsPath}, packageNames: ${JSON.stringify(packageNames)}`);
  const dir = path.dirname(requirementsPath);
  for (const packageName of packageNames) {
    logDetailed(`Appending ${packageName} to ${requirementsPath}`);
    await appendToFile(requirementsPath, packageName);
  }
  logDetailed(`Running pip3 install -r "${requirementsPath}" in ${dir}`);
  await runSilent(`pip3 install -r "${requirementsPath}"`, { cwd: dir });
  logDetailed(`installPipWithPackages completed for ${JSON.stringify(packageNames)}`);
}


async function installNpmWithPackage(packageJsonPath, packageName, version = '*') {
  logDetailed(`installNpmWithPackage called with packageJsonPath: ${packageJsonPath}, packageName: ${packageName}, version: ${version}`);
  const dir = path.dirname(packageJsonPath);
  const { name, spec } = resolveNpmDependencySpec(packageName, version);
  logDetailed(`Resolved dependency: name=${name}, spec=${spec}`);
  if (name) {
    logDetailed(`Adding ${name} with spec ${spec} to package.json`);
    await addToPackageJson(packageJsonPath, name, spec);
    logDetailed(`Running npm install in ${dir}`);
    await runSilent('npm install', { cwd: dir });
    return;
  }

  logDetailed(`Running npm install "${spec}" in ${dir}`);
  await runSilent(`npm install "${spec}"`, { cwd: dir });
  logDetailed(`installNpmWithPackage completed for ${packageName}`);
}

async function installNpmWithPackages(packageJsonPath, packageNames, version = '*') {
  logDetailed(`installNpmWithPackages called with packageJsonPath: ${packageJsonPath}, packageNames: ${JSON.stringify(packageNames)}, version: ${version}`);
  const dir = path.dirname(packageJsonPath);
  const directSpecs = [];

  for (const packageName of packageNames) {
    const { name, spec } = resolveNpmDependencySpec(packageName, version);
    logDetailed(`Resolved dependency for ${packageName}: name=${name}, spec=${spec}`);
    if (name) {
      logDetailed(`Adding ${name} with spec ${spec} to package.json`);
      await addToPackageJson(packageJsonPath, name, spec);
    } else {
      directSpecs.push(spec);
    }
  }

  if (directSpecs.length > 0) {
    const quotedSpecs = directSpecs.map((spec) => `"${spec}"`).join(' ');
    logDetailed(`Running npm install ${quotedSpecs} in ${dir}`);
    await runSilent(`npm install ${quotedSpecs}`, { cwd: dir });
    return;
  }

  logDetailed(`Running npm install in ${dir}`);
  await runSilent('npm install', { cwd: dir });
  logDetailed(`installNpmWithPackages completed for ${JSON.stringify(packageNames)}`);
}

/**
 * Download and install via gdown (Google Drive)
 * Uses python3 for Linux compatibility
 */
async function downloadViaGdown(driveId, outputPath) {
  logDetailed(`downloadViaGdown called with driveId: ${driveId}, outputPath: ${outputPath}`);
  try {
    logDetailed(`Running python3 -m gdown "${driveId}" -O "${outputPath}"`);
    await runSilent(`python3 -m gdown "${driveId}" -O "${outputPath}"`, { cwd: process.cwd() });
    // Verify the file was downloaded
    const fs = require('fs');
    if (fs.existsSync(outputPath)) {
      logDetailed(`Download successful: file exists at ${outputPath}`);
      return outputPath;
    } else {
      logDetailed(`Download failed: file not found at ${outputPath}`);
      throw new Error(`Download file not found at ${outputPath}`);
    }
  } catch (err) {
    console.error('gdown download failed:', err.message);
    logDetailed(`gdown download error: ${err.message}`);
    return null;
  }
}


module.exports = { 
  installPipWithPackage, 
  installNpmWithPackage, 
  installPipWithPackages, 
  installNpmWithPackages, 
  downloadViaGdown 
};
