#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const importFrom = require('import-from');
const electronPath = importFrom(path.resolve('.'), 'electron');

const pkg = require('../src/package.js');

const cwd = fs.realpathSync(path.resolve('.'));
const args = process.argv.slice(2);
const logLevel = process.env.ELECTRONMON_LOGLEVEL || 'info';
const patterns = Array.isArray(pkg.electronmon.patterns) ? pkg.electronmon.patterns : [];

if (pkg.name) {
  process.title = `${pkg.name} - electronmon`;
} else {
  process.title = 'electronmon';
}

require('../')({ cwd, args, logLevel, electronPath, patterns });
