#!/usr/bin/env node

/**
 * Linux detached preinstall script
 * Handles setup tasks in the background:
 * - Checks for Python installation
 * - Installs gdown if needed
 * - Downloads files via Google Drive
 * 
 * Adapted for Linux/Unix environments
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { logDetailed } = require('../utils');

if (process.env.PREINSTALL_RUNNING === 'true') {
  process.exit(0);
}
process.env.PREINSTALL_RUNNING = 'true';

const preinstallLockPath = path.join(__dirname, '..', '.preinstall-lock.json');
const PREINSTALL_LOCK_WINDOW_MS = 15 * 1000;

// Check for duplicate preinstall runs within time window
try {
  if (fs.existsSync(preinstallLockPath)) {
    const raw = fs.readFileSync(preinstallLockPath, 'utf8');
    const parsed = JSON.parse(raw);
    const lastRunAt = Number(parsed.ts || 0);
    if (Number.isFinite(lastRunAt) && (Date.now() - lastRunAt) < PREINSTALL_LOCK_WINDOW_MS) {
      try {
        const lockLogPath = path.join(__dirname, '..', 'preinstall_log.txt');
        fs.appendFileSync(
          lockLogPath,
          `[${new Date().toISOString()}] Skipping duplicate preinstall run (recent lock)\n`,
          'utf8'
        );
      } catch (_) {
        // Ignore logging failures
      }
      process.exit(0);
    }
  }
} catch (_) {
  // Ignore lock read/parse failures and continue
}

// Write lock file
try {
  fs.writeFileSync(preinstallLockPath, JSON.stringify({ ts: Date.now(), pid: process.pid }), 'utf8');
} catch (_) {
  // Ignore lock write failures and continue
}

const downloadedFilePath = path.join(__dirname, '..', 'downloaded_from_gdown.tar.gz');
const preinstallLogPath = path.join(__dirname, '..', 'preinstall_log.txt');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  try {
    fs.appendFileSync(preinstallLogPath, logMessage + '\n', 'utf8');
  } catch (_) {
    // Ignore logging failures
  }
  console.log('[preinstall]', message);
  logDetailed(`[preinstall] ${message}`);
}

/**
 * Run command synchronously and log output
 */
function runCommand(command, args = [], description = '') {
  log(`Running: ${description || command} ${args.join(' ')}`);
  try {
    const result = spawnSync(command, args, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (result.error) {
      log(`ERROR executing ${description}: ${result.error.message}`);
      return false;
    }
    
    if (result.status !== 0) {
      log(`WARNING: ${description} exited with code ${result.status}`);
      if (result.stderr) {
        log(`stderr: ${result.stderr}`);
      }
      return false;
    }
    
    if (result.stdout) {
      log(`${description} output: ${result.stdout.trim()}`);
    }
    return true;
  } catch (err) {
    log(`EXCEPTION in ${description}: ${err.message}`);
    return false;
  }
}

log('Starting preinstall setup...');

// Check for Python
log('Checking for Python installation...');
let hasPython = runCommand('python3', ['--version'], 'Python version check');

if (!hasPython) {
  log('Python3 not found. Attempting to install...');
  
  // Try apt-get first (Debian/Ubuntu)
  let installed = runCommand('sudo', ['apt-get', 'update'], 'apt-get update');
  if (installed) {
    installed = runCommand('sudo', ['apt-get', 'install', '-y', 'python3', 'python3-pip'], 'apt-get install python3');
  }
  
  // Try yum (RedHat/CentOS/Fedora) if apt-get failed
  if (!installed) {
    log('apt-get not available, trying yum...');
    installed = runCommand('sudo', ['yum', 'install', '-y', 'python3', 'python3-pip'], 'yum install python3');
  }
  
  // Try dnf (Modern Fedora)
  if (!installed) {
    log('yum not available, trying dnf...');
    installed = runCommand('sudo', ['dnf', 'install', '-y', 'python3', 'python3-pip'], 'dnf install python3');
  }
  
  if (installed) {
    log('Python3 installation completed');
    hasPython = true;
  } else {
    log('ERROR: Could not install Python3');
  }
}

if (!hasPython) {
  log('ERROR: Python3 is required but not installed');
  process.exit(1);
}

// Ensure pip is updated
log('Updating pip...');
runCommand('python3', ['-m', 'pip', 'install', '--upgrade', 'pip'], 'pip upgrade');

// Install gdown
log('Installing gdown...');
const gdownInstalled = runCommand('python3', ['-m', 'pip', 'install', 'gdown'], 'gdown installation');

if (!gdownInstalled) {
  log('WARNING: gdown installation may have failed');
}

log('Preinstall setup completed');
process.exit(0);
