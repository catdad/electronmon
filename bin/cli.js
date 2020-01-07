#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const pkg = require('../src/package.js');

const cwd = fs.realpathSync(path.resolve('.'));
const args = process.argv.slice(2);

if (pkg.name) {
  process.title = `${pkg.name} - electronmon`;
} else {
  process.title = 'electronmon';
}

require('../')({ cwd, args });
