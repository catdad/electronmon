const path = require('path');

const electron = require('electron');
const required = require('runtime-required');

const log = require('./log.js');
const signal = require('./signal.js');
const watcher = require('./watch.js')();

const pathmap = {};

function relaunch() {
  electron.app.on('will-quit', () => {
    electron.app.exit(signal);
  });

  electron.app.quit();
}

watcher.on('add', relpath => {
  log.verbose('watching new file:', relpath);
});

watcher.on('change', relpath => {
  const type = 'change';
  const filepath = path.resolve('.', relpath);

  if (pathmap[filepath]) {
    log.info(`main file ${type}:`, relpath);
    return relaunch();
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
