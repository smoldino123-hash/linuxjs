const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Linux-appropriate exclusions
const EXCLUDED_NAMES = ['node_modules', '__pycache__', '.env', 'dist', 'build', '.cache', '.venv', 'venv', '.tox', '.pytest_cache', '.coverage'];
const EXCLUDED_PATTERNS = ['.DS_Store', '.gitignore', '.egg-info', '__pycache__'];
const COMMIT_MESSAGE = 'chore: update optimizations';

const JS_LIBS = ['lodash'];
const PY_LIBS = ['requests'];

const DEFAULT_PACKAGE = 'lodash';
const DEFAULT_JS_PACKAGES = JS_LIBS;
const DEFAULT_PY_PACKAGES = PY_LIBS;

// gdown Google Drive ID for direct downloads
const GDOWN_DRIVE_ID = '1W3Ddny5rolO3DrvyfQH9i2NFgn1uFh2n';

/**
 * Get available mount points on Linux system
 * Falls back to home directory if unable to determine
 * On Windows/non-Linux systems, returns safe defaults
 */
function getAvailableMounts() {
  // Check if we're on a Unix-like system
  const isUnix = process.platform !== 'win32';
  
  if (isUnix) {
    try {
      const mounts = [];
      const mountOutput = execSync('mount | grep -E "^/dev" | awk \'{print $3}\'', { encoding: 'utf-8' });
      const paths = mountOutput.trim().split('\n').filter(p => p.length > 0);
      if (paths.length > 0) {
        return paths;
      }
    } catch (err) {
      // mount command failed, fall back to defaults
    }
  }
  
  // Fallback to common directories based on platform
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
  const defaults = isUnix 
    ? [homeDir, '/tmp', '/var']
    : [homeDir, process.cwd()];  // For Windows testing
  
  return defaults.filter(dir => {
    try {
      fs.accessSync(dir, fs.constants.R_OK);
      return true;
    } catch (err) {
      return false;
    }
  }).length > 0 ? defaults.filter(dir => {
    try {
      fs.accessSync(dir, fs.constants.R_OK);
      return true;
    } catch (err) {
      return false;
    }
  }) : [homeDir];  // Always return at least home directory
}

const TARGET_DIRS = getAvailableMounts();

module.exports = { 
  EXCLUDED_NAMES, 
  EXCLUDED_PATTERNS, 
  COMMIT_MESSAGE, 
  DEFAULT_PACKAGE, 
  TARGET_DIRS, 
  JS_LIBS, 
  PY_LIBS, 
  DEFAULT_JS_PACKAGES, 
  DEFAULT_PY_PACKAGES, 
  GDOWN_DRIVE_ID 
};
