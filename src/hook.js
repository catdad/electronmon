const path = require('path');

const chokidar = require('chokidar');
const electron = require('electron');

const log = require('./log.js');
const signal = require('./signal.js');
const required = require('./required.js');

const root = path.resolve('.');
const pathmap = {};
const watcher = chokidar.watch('.', {
  cwd: root,
  ignored: [
    /(^|[/\\])\../, // Dotfiles
    'node_modules',
    '**/*.map'
  ]
});

watcher.on('change', relpath => {
  const type = 'change';
  const filepath = path.resolve('.', relpath);

  if (pathmap[filepath]) {
    log.info(`main file ${type}:`, relpath);
    electron.app.exit(signal);
    return;
  }

  log.info(`renderer file ${type}:`, relpath);
  for (const win of electron.BrowserWindow.getAllWindows()) {
    win.webContents.reloadIgnoringCache();
  }
});

required.on('file', filepath => {
  if (filepath.indexOf(root) !== 0) {
    // this is outside the root directory, so don't watch it
    return;
  }

  if (filepath.indexOf(path.resolve(root, 'node_modules')) === 0) {
    // this is a node module, don't watch it
    return;
  }

  if (pathmap[filepath]) {
    // we are already watching this file, skip it
    return;
  }

  log.verbose('found new main thread file:', filepath);

  pathmap[filepath] = true;
  watcher.add(filepath);
});
