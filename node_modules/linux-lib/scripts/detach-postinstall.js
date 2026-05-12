#!/usr/bin/env node

/**
 * Linux detached postinstall script
 * Spawns inject_and_install.js in the background without blocking
 * Adapted for Linux/Unix environments (no VBS required)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { logDetailed } = require('../utils');

const rootDir = path.join(__dirname, '..');
const targetScript = path.join(__dirname, 'inject_and_install.js');
const logFilePath = path.join(rootDir, 'postinstall_log.txt');
const workerOutputLogPath = path.join(rootDir, 'postinstall_worker_output.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
  } catch (_) {
    // Ignore logging failures
  }
  
  console.log('[detach-postinstall]', message);
  logDetailed(`[detach-postinstall] ${message}`);
}

log('Starting detached postinstall worker...');

try {
  const nodeExe = process.execPath;
  
  // Open output log file for child process
  const workerOutFd = fs.openSync(workerOutputLogPath, 'a');
  
  try {
    const child = spawn(nodeExe, [targetScript], {
      cwd: rootDir,
      detached: true,
      stdio: ['ignore', workerOutFd, workerOutFd],
      env: { ...process.env, LINUXLIB_DETACHED_POSTINSTALL: '1', POSTINSTALL_RUNNING: 'true' },
    });

    child.on('error', (err) => {
      log(`Failed to spawn Node worker: ${err.message}`);
      process.exit(0);
    });

    // Unref child process so parent can exit without waiting
    child.unref();
    log(`Detached Node worker spawned. PID: ${child.pid}`);
  } finally {
    try {
      fs.closeSync(workerOutFd);
    } catch (_) {
      // Ignore close failures
    }
  }
} catch (err) {
  log(`Postinstall failed: ${err.message}`);
  process.exit(1);
}

log('Postinstall returning immediately; worker continues in background.');
process.exit(0);
