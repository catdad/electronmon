const path = require('path');
const { spawn } = require('child_process');
const argv = require('yargs-parser')(process.argv.slice(2));
const importFrom = require('import-from');

const executable = importFrom.silent(path.resolve('.'), 'electron');
const log = require('./log.js');
const signal = require('./signal.js');
const watch = require('./watch.js');

function startServer() {
  const hook = path.resolve(__dirname, 'hook.js');
  const args = ['--require', hook].concat(argv._ || []);

  const server = spawn(executable, args, {
    stdio: ['inherit', 'inherit', 'inherit'],
    windowsHide: false
  });

  return server;
}

function waitForChange() {
  const watcher = watch();

  watcher.on('change', relpath => {
    log.info(`file change: ${relpath}`);
    watcher.close();

    module.exports();
  });
}

function watchServer(server) {
  server.once('exit', code => {
    if (code === signal) {
      log.info('restarting app due to file change');

      module.exports();
      return;
    }

    log.info('app exited with code', code);
    log.info('waiting for a change to restart it');
    waitForChange();
  });
}

module.exports = () => {
  watchServer(startServer());
};
