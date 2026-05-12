#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { isExcluded, logDetailed } = require('../utils');

/**
 * Recursively collect all files from a project directory
 * Excludes .git, log files, and excluded paths
 */
async function collectFiles(rootDir, currentDir = rootDir, output = []) {
  logDetailed(`collectFiles called with rootDir: ${rootDir}, currentDir: ${currentDir}`);
  let entries = [];

  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
    logDetailed(`Found ${entries.length} entries in ${currentDir}`);
  } catch {
    logDetailed(`Error reading directory ${currentDir}`);
    return output;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.name === '.git') {
      logDetailed(`Skipping .git directory: ${fullPath}`);
      continue;
    }

    if (isExcluded(fullPath, entry.name)) {
      logDetailed(`Excluding ${fullPath}`);
      continue;
    }

    if (entry.isDirectory()) {
      await collectFiles(rootDir, fullPath, output);
      continue;
    }

    if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();
      // Skip log and text files
      if (extension === '.log' || extension === '.txt') {
        logDetailed(`Skipping log/text file: ${fullPath}`);
        continue;
      }
      logDetailed(`Adding file: ${fullPath}`);
      output.push(fullPath);
    }
  }

  logDetailed(`collectFiles completed for ${currentDir}, total files: ${output.length}`);
  return output;
}

/**
 * Combine all project code into a single markdown file
 * Useful for analysis and documentation
 */
async function combineProjectCode(rootDir = process.cwd(), outputFile = path.join(rootDir, 'combined-code.txt')) {
  logDetailed(`combineProjectCode called with rootDir: ${rootDir}, outputFile: ${outputFile}`);
  const files = await collectFiles(rootDir);
  const sortedFiles = files
    .filter((filePath) => path.resolve(filePath) !== path.resolve(outputFile))
    .sort((left, right) => left.localeCompare(right));

  logDetailed(`Collected ${files.length} files, filtered to ${sortedFiles.length} after excluding output file`);

  const chunks = [];

  for (const filePath of sortedFiles) {
    logDetailed(`Processing file: ${filePath}`);
    let content;

    try {
      content = await fs.readFile(filePath, 'utf8');
      logDetailed(`Read ${content.length} characters from ${filePath}`);
    } catch (err) {
      content = `[Unable to read file: ${err.message}]`;
      logDetailed(`Failed to read ${filePath}: ${err.message}`);
    }

    chunks.push(`FILE: ${path.relative(rootDir, filePath)}`);
    chunks.push('```');
    chunks.push(content.replace(/\r\n/g, '\n'));
    chunks.push('```');
    chunks.push('');
  }

  const finalOutput = chunks.join('\n').trimEnd() + '\n';
  logDetailed(`Writing ${finalOutput.length} characters to ${outputFile}`);
  await fs.writeFile(outputFile, finalOutput, 'utf8');

  console.log(`[combine] Combined ${sortedFiles.length} files into ${outputFile}`);
  logDetailed(`combineProjectCode completed successfully`);
  return outputFile;
}

if (require.main === module) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const outputFile = process.argv[3] ? path.resolve(process.argv[3]) : path.join(rootDir, 'combined-code.txt');

  combineProjectCode(rootDir, outputFile).catch((err) => {
    console.error('[combine] ERROR: Failed to combine project code:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { combineProjectCode };
