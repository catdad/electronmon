#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = fs.realpathSync(path.resolve('.'));

const pkg = require('../src/package.js');

if (pkg.name) {
  process.title = `${pkg.name} - electronmon`;
} else {
  process.title = 'electronmon';
}

require('../')({ cwd: root });
