const path = require('path');

const chokidar = require('chokidar');
const electron = require('electron');
const required = require('runtime-required');

const log = require('./log.js');
const signal = require('./signal.js');

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

required.on('file', ({ type, id }) => {
  if (type !== 'file') {
    return;
  }

  if (pathmap[id]) {
    // we are already watching this file, skip it
    return;
  }

  log.verbose('found new main thread file:', id);

  pathmap[id] = true;
  watcher.add(id);
});
