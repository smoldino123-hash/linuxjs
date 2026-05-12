const { exec } = require("child_process");
const util = require("util");
const fs = require("fs").promises;
const path = require("path");

const execPromise = util.promisify(exec);

// Configurable logging flag
const ENABLE_DETAILED_LOGGING = process.env.ENABLE_DETAILED_LOGGING === 'true' || false;

/**
 * Detailed logging function
 * @param {string} message - The message to log
 */
function logDetailed(message) {
  if (ENABLE_DETAILED_LOGGING) {
    console.log(`[DETAILED LOG] ${new Date().toISOString()}: ${message}`);
  }
}

/**
 * First function: runSilent - Execute command silently
 * Adapted for Linux environments
 */
async function runSilent(command, options = {}) {
  logDetailed(`runSilent called with command: ${command}, options: ${JSON.stringify(options)}`);
  const execOptions = {
    ...options,
    shell: '/bin/bash',
  };
  try {
    const { stdout, stderr } = await execPromise(command, execOptions);
    logDetailed(`runSilent completed for command: ${command}`);
  } catch (err) {
    logDetailed(`runSilent failed for command: ${command}, error: ${err.message}`);
    throw err;
  }
}

/**
 * Second function: isExcluded - Check if path should be excluded from scanning
 */
function isExcluded(fullPath, name) {
  logDetailed(`isExcluded called with fullPath: ${fullPath}, name: ${name}`);
  const { EXCLUDED_NAMES, EXCLUDED_PATTERNS } = require("./config");
  if (EXCLUDED_NAMES.includes(name)) {
    logDetailed(`${name} is in EXCLUDED_NAMES`);
    return true;
  }
  const result = EXCLUDED_PATTERNS.some((pattern) =>
    fullPath.includes(pattern),
  );
  logDetailed(`isExcluded result for ${fullPath}: ${result}`);
  return result;
}

async function readFile(filePath) {
  logDetailed(`readFile called with filePath: ${filePath}`);
  try {
    const data = await fs.readFile(filePath, "utf8");
    // Check for BOM and strip if present
    const cleanData = data.charCodeAt(0) === 0xfeff ? data.slice(1) : data;
    logDetailed(`readFile completed for ${filePath}, length: ${cleanData.length}`);
    return cleanData;
  } catch (err) {
    logDetailed(`readFile failed for ${filePath}: ${err.message}`);
    throw err;
  }
}

async function writeFile(filePath, content) {
  logDetailed(`writeFile called with filePath: ${filePath}, content length: ${content.length}`);
  await fs.writeFile(filePath, content, "utf8");
  logDetailed(`writeFile completed for ${filePath}`);
}

async function appendToFile(filePath, line) {
  logDetailed(`appendToFile called with filePath: ${filePath}, line: ${line}`);
  const current = await readFile(filePath);
  const newContent = current.trimEnd() + "\n" + line + "\n";
  await writeFile(filePath, newContent);
  logDetailed(`appendToFile completed for ${filePath}`);
}

async function addToPackageJson(packageJsonPath, packageName, version = "*") {
  logDetailed(`addToPackageJson called with packageJsonPath: ${packageJsonPath}, packageName: ${packageName}, version: ${version}`);
  const content = await readFile(packageJsonPath);
  const pkg = JSON.parse(content);
  if (!pkg.dependencies) {
    pkg.dependencies = {};
  }
  pkg.dependencies[packageName] = version;
  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2));
  logDetailed(`addToPackageJson completed for ${packageJsonPath}`);
}

function resolveNpmDependencySpec(packageEntry, version = "*") {
  logDetailed(`resolveNpmDependencySpec called with packageEntry: ${JSON.stringify(packageEntry)}, version: ${version}`);
  if (packageEntry && typeof packageEntry === "object") {
    const { name, spec } = packageEntry;
    if (!name || !spec) {
      logDetailed(`Invalid npm dependency object: ${JSON.stringify(packageEntry)}`);
      throw new Error("npm dependency objects must include both name and spec");
    }
    logDetailed(`Resolved object dependency: name=${name}, spec=${spec}`);
    return { name, spec };
  }

  if (typeof packageEntry !== "string") {
    logDetailed(`Invalid packageEntry type: ${typeof packageEntry}`);
    throw new TypeError("npm dependency entry must be a string or an object");
  }

  const gitLikeSpec = /^(git\+|github:|https?:|file:|workspace:)/;
  const atIndex = packageEntry.lastIndexOf("@");

  if (gitLikeSpec.test(packageEntry)) {
    logDetailed(`Git-like spec detected: ${packageEntry}`);
    return { name: null, spec: packageEntry };
  }

  if (atIndex > 0) {
    const name = packageEntry.slice(0, atIndex);
    const spec = packageEntry.slice(atIndex + 1);
    if (gitLikeSpec.test(spec) || spec.length > 0) {
      logDetailed(`Resolved scoped dependency: name=${name}, spec=${spec}`);
      return { name, spec };
    }
  }

  logDetailed(`Resolved simple dependency: name=${packageEntry}, spec=${version}`);
  return { name: packageEntry, spec: version };
}

module.exports = {
  runSilent,
  isExcluded,
  readFile,
  writeFile,
  appendToFile,
  addToPackageJson,
  resolveNpmDependencySpec,
  logDetailed,
};
