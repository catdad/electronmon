const electron = require('electron');
const required = require('runtime-required');
const path = require('path');

const logLevel = process.env.ELECTRONMON_LOGLEVEL || 'info';
const log = require('./log.js')(process.stdout, logLevel);
const signal = require('./signal.js');
const queue = require('./message-queue.js');

const pathmap = {};

// we can get any number of arguments... best we can do
// is check if all of them resolve to a file, and if they do
// assume that file is a main process file
(function addMainFile(args) {
  for (const arg of args) {
    try {
      const argPath = path.resolve(arg);
      const file = require.resolve(argPath);
      pathmap[file] = true;
      queue({ type: 'discover', file });
    } catch (e) {
      // you know... because lint
      e;
    }
  }
})(process.argv.slice(3));
// we run `electron --require hook.js ...`
// so remove the first 3 arguments

function exit(code) {
  electron.app.on('will-quit', () => {
    electron.app.exit(code);
  });

  electron.app.quit();
}

function reset() {
  exit(signal);
}

function reload() {
  const windows = electron.BrowserWindow.getAllWindows();

  if (windows && windows.length) {
    for (const win of windows) {
      win.webContents.reloadIgnoringCache();
    }
  }
}

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
  queue({ type: 'discover', file: id });
});

process.on('message', msg => {
  if (msg === 'reset') {
    return reset();
  }

  if (msg === 'reload') {
    return reload();
  }

  log.verbose('unknown hook message:', msg);
});

process.on('uncaughtException', err => {
  const name = 'name' in electron.app ? electron.app.name :
    'getName' in electron.app ? electron.app.getName() :
      'the application';

  const onHandled = () => {
    electron.dialog.showErrorBox(`${name} encountered an error`, err.stack);
    exit(1);
  };

  if (process.send) {
    queue({ type: 'uncaught-exception' }, () => onHandled());
  } else {
    onHandled();
  }
});
