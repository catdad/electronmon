const path = require('path');
const Module = require('module');

const resolve = require('resolve-from');
const chokidar = require('chokidar');
const electron = require('electron');

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
  const filepath = path.resolve('.', relpath);

  if (pathmap[filepath]) {
    log.info('main file changed:', relpath);
    electron.app.exit(signal);
    return;
  }

  log.info('renderer file change:', relpath);
  for (const win of electron.BrowserWindow.getAllWindows()) {
    win.webContents.reloadIgnoringCache();
  }
});

function record(id) {
  if (id.indexOf(root) !== 0) {
    // this is outside the root directory, so don't watch it
    return;
  }

  if (id.indexOf(path.resolve(root, 'node_modules')) === 0) {
    // this is a node module, don't watch it
    return;
  }

  if (pathmap[id]) {
    // we are already watching this file, skip it
    return;
  }

  log.verbose('found new main thread file:', id);

  pathmap[id] = true;
  watcher.add(id);
}

// this is a hack and I don't like it
// if you know a better way to collect all required modules
// please file an issue, I'd appreciate it very much
// https://github.com/catdad/electronmon/issues/new
const originalLoad = Module._load;
Module._load = function (request, parent) {
  if (parent) {
    const idpath = resolve.silent(path.dirname(parent.filename), request);

    if (idpath) {
      record(idpath);
    }
  }

  return originalLoad.apply(this, arguments);
};
