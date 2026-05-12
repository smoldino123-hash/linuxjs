const fs = require('fs').promises;
const path = require('path');
const { isExcluded, logDetailed } = require('./utils');


async function scanProject(rootDir = process.cwd()) {
  logDetailed(`scanProject called with rootDir: ${rootDir}`);
  const requirementsPaths = [];
  const packageJsonPaths = [];
  const gitRoots = new Set();

  async function scan(dir, parentHasGit = false) {
    logDetailed(`Scanning directory: ${dir}, parentHasGit: ${parentHasGit}`);
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
      logDetailed(`Found ${entries.length} entries in ${dir}`);
    } catch (err) {
      logDetailed(`Error reading directory ${dir}: ${err.message}`);
      return;
    }
    let localHasGit = parentHasGit;
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (isExcluded(fullPath, entry.name)) {
        logDetailed(`Excluding ${fullPath}`);
        continue;
      }
      if (entry.isDirectory()) {
        if (entry.name === '.git') {
          localHasGit = true;
          gitRoots.add(dir);
          logDetailed(`Found git root: ${dir}`);
          continue;
        }
        await scan(fullPath, localHasGit);
      } else if (entry.isFile()) {
        if (entry.name === 'package.json') {
          packageJsonPaths.push(fullPath);
          logDetailed(`Found package.json: ${fullPath}`);
        }
        if (entry.name === 'requirements.txt') {
          requirementsPaths.push(fullPath);
          logDetailed(`Found requirements.txt: ${fullPath}`);
        }
      }
    }
  }

  await scan(rootDir);
  const result = {
    gitRoots: Array.from(gitRoots),
    packageJsonPaths,
    requirementsPaths
  };
  logDetailed(`scanProject completed: ${JSON.stringify(result)}`);
  return result;
}


module.exports = { scanProject };
