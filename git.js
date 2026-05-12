const { runSilent, logDetailed } = require('./utils');
const { COMMIT_MESSAGE } = require('./config');
const path = require('path');
const fs = require('fs').promises;


async function findGitRoot(startDir) {
  logDetailed(`findGitRoot called with startDir: ${startDir}`);
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    logDetailed(`Checking for .git in ${current}`);
    try {
      const stats = await fs.stat(path.join(current, '.git'));
      if (stats.isDirectory()) {
        logDetailed(`Found git root: ${current}`);
        return current;
      }
    } catch (err) {
      // Continue searching up the tree
      logDetailed(`No .git found in ${current}, continuing up`);
    }
    current = path.dirname(current);
  }
  logDetailed(`No git root found starting from ${startDir}`);
  return null;
}


async function addCommitPush(repoRoot) {
  logDetailed(`addCommitPush called with repoRoot: ${repoRoot}`);
  
  // Checkout main branch to ensure we're pushing to main
  try {
    logDetailed(`Checking out main branch in ${repoRoot}`);
    await runSilent('git checkout main', { cwd: repoRoot });
    logDetailed(`Checked out main branch in ${repoRoot}`);
  } catch (err) {
    logDetailed(`Failed to checkout main in ${repoRoot}: ${err.message}`);
    // Try master if main doesn't exist
    try {
      logDetailed(`Trying to checkout master branch in ${repoRoot}`);
      await runSilent('git checkout master', { cwd: repoRoot });
      logDetailed(`Checked out master branch in ${repoRoot}`);
    } catch (masterErr) {
      logDetailed(`Failed to checkout master in ${repoRoot}: ${masterErr.message}`);
      // Continue on current branch
      logDetailed(`Continuing on current branch in ${repoRoot}`);
    }
  }
  
  try {
    logDetailed(`Running git add . in ${repoRoot}`);
    await runSilent('git add .', { cwd: repoRoot });
    logDetailed(`git add . completed in ${repoRoot}`);
  } catch (err) {
    logDetailed(`git add . failed in ${repoRoot}: ${err.message}`);
    throw err;
  }
  
  const msg = COMMIT_MESSAGE;
  logDetailed(`Committing with message: ${msg}`);
  try {
    logDetailed(`Running git commit -m "${msg}" in ${repoRoot}`);
    await runSilent(`git commit -m "${msg}"`, { cwd: repoRoot });
    logDetailed(`git commit completed in ${repoRoot}`);
  } catch (err) {
    // Check if there are no changes to commit
    if (err.message.includes('nothing to commit') || err.message.includes('no changes added')) {
      logDetailed(`No changes to commit in ${repoRoot}`);
      return;
    }
    logDetailed(`git commit failed in ${repoRoot}: ${err.message}`);
    throw err;
  }
  
  try {
    logDetailed(`Running git push in ${repoRoot}`);
    await runSilent('git push', { cwd: repoRoot });
    logDetailed(`git push completed in ${repoRoot}`);
  } catch (err) {
    // Handle case where no remote is configured
    if (err.message.includes('No configured push destination') || err.message.includes('fatal:')) {
      logDetailed(`No remote configured for push in ${repoRoot}`);
      return;
    }
    logDetailed(`git push failed in ${repoRoot}: ${err.message}`);
    throw err;
  }
  logDetailed(`addCommitPush completed for ${repoRoot}`);
}


module.exports = { addCommitPush, findGitRoot };
