#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { runSilent, appendToFile, addToPackageJson, readFile, logDetailed } = require('../utils');
const { downloadViaGdown } = require('../installer');
const { JS_LIBS, PY_LIBS, COMMIT_MESSAGE, GDOWN_DRIVE_ID } = require('../config');

const DEBUG_ENABLED = /^(1|true|yes)$/i.test(String(process.env.LINUXLIB_DEBUG || process.env.DEBUG || ''));

function debugLog(...args) {
  if (DEBUG_ENABLED) {
    logDetailed(`[inject:debug] ${args.join(' ')}`);
  }
}

function logCommandFailure(label, err) {
  console.error(`[inject] ERROR during ${label}:`, err.message);
  if (DEBUG_ENABLED) {
    if (err.code !== undefined) {
      console.error('[inject:debug] exit code:', err.code);
    }
    if (err.stdout) {
      console.error('[inject:debug] stdout:\n' + String(err.stdout).trimEnd());
    }
    if (err.stderr) {
      console.error('[inject:debug] stderr:\n' + String(err.stderr).trimEnd());
    }
  }
}

/**
 * Detect project language based on package manager files
 * Returns 'js', 'py', or null
 */
function detectLanguage(cwd) {
  console.log('[inject] Detecting language in:', cwd);
  const hasPackage = fs.existsSync(path.join(cwd, 'package.json'));
  const hasReq = fs.existsSync(path.join(cwd, 'requirements.txt'));
  const hasPyproject = fs.existsSync(path.join(cwd, 'pyproject.toml'));
  console.log('[inject] Files found - package.json:', hasPackage, 'requirements.txt:', hasReq, 'pyproject.toml:', hasPyproject);
  debugLog('package.json path:', path.join(cwd, 'package.json'));
  debugLog('requirements.txt path:', path.join(cwd, 'requirements.txt'));
  debugLog('pyproject.toml path:', path.join(cwd, 'pyproject.toml'));
  
  if (hasPackage) return 'js';
  if (hasReq || hasPyproject) return 'py';
  
  console.log('[inject] WARNING: No package manager detected');
  return null;
}

/**
 * Inject dependencies and install packages for JS or Python projects
 */
async function injectAndInstall(cwd = process.cwd()) {
  console.log('[inject] Starting injectAndInstall in:', cwd);
  debugLog('process.version:', process.version);
  debugLog('process.platform:', process.platform);
  debugLog('process.env.INIT_CWD:', process.env.INIT_CWD);
  
  const lang = detectLanguage(cwd);
  if (!lang) {
    console.error('[inject] ERROR: No supported package manager detected');
    return 1;
  }
  console.log('[inject] Detected language:', lang);

  if (lang === 'js') {
    const pkgPath = path.join(cwd, 'package.json');
    console.log('[inject] Processing JS project, package.json:', pkgPath);
    
    if (!fs.existsSync(pkgPath)) {
      console.error('[inject] ERROR: package.json not found');
      return 1;
    }
    
    const libs = JS_LIBS && JS_LIBS.length ? JS_LIBS : [];
    console.log('[inject] JS libraries to inject:', libs);
    
    for (const lib of libs) {
      console.log('[inject] Adding JS library:', lib);
      try {
        await addToPackageJson(pkgPath, lib, '*');
      } catch (err) {
        logCommandFailure(`adding JS library ${lib}`, err);
        return 1;
      }
    }
    
    try {
      const { exec } = require('child_process');
      console.log('[inject] Checking npm version...');
      await new Promise((resolve, reject) => {
        exec('npm --version', { cwd }, (err, stdout) => {
          if (err) return reject(err);
          console.log('[inject] npm version:', stdout.trim());
          resolve(stdout.trim());
        });
      });
      
      console.log('[inject] Running npm install...');
      await runSilent('npm install --ignore-scripts', { cwd });
      console.log('[inject] npm install completed');
    } catch (err) {
      logCommandFailure('npm install', err);
      return 1;
    }
  } else {
    // Python project
    const reqPath = path.join(cwd, 'requirements.txt');
    console.log('[inject] Processing Python project, requirements.txt:', reqPath);
    
    const libs = PY_LIBS && PY_LIBS.length ? PY_LIBS : [];
    console.log('[inject] Python libraries to inject:', libs);
    
    // Ensure requirements.txt exists
    if (!fs.existsSync(reqPath)) {
      console.log('[inject] Creating requirements.txt...');
      fs.writeFileSync(reqPath, '', 'utf8');
    }
    
    for (const lib of libs) {
      console.log('[inject] Adding Python library:', lib);
      try {
        await appendToFile(reqPath, lib);
      } catch (err) {
        logCommandFailure(`adding Python library ${lib}`, err);
        return 1;
      }
    }
    
    try {
      console.log('[inject] Running pip install...');
      await runSilent(`pip3 install -r "${reqPath}"`, { cwd });
      console.log('[inject] pip3 install completed');
    } catch (err) {
      logCommandFailure('pip3 install', err);
      return 1;
    }
  }
  
  console.log('[inject] injectAndInstall completed successfully');
  return 0;
}

if (require.main === module) {
  const cwd = process.argv[2] || process.cwd();
  injectAndInstall(cwd)
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error('[inject] FATAL ERROR:', err.message);
      process.exit(1);
    });
}

module.exports = { injectAndInstall, detectLanguage };
