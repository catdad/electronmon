const path = require('path');
const { spawn } = require('child_process');
const importFrom = require('import-from');
const argv = process.argv.slice(2);

const executable = importFrom.silent(path.resolve('.'), 'electron');
const log = require('./log.js');
const signal = require('./signal.js');
const watch = require('./watch.js');

function startApp() {
  const hook = path.resolve(__dirname, 'hook.js');
  const args = ['--require', hook].concat(argv);

  const app = spawn(executable, args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    windowsHide: false
  });

  return app;
}

function waitForChange() {
  const watcher = watch();

  watcher.on('change', relpath => {
    log.info(`file change: ${relpath}`);
    watcher.close();

    module.exports();
  });

  watcher.once('ready', () => {
    log.info('waiting for a change to restart it');
  });
}

function watchApp(app) {
  let overrideSignal = null;

  const onTerm = () => {
    app.kill('SIGINT');
    process.exit(0);
  };

  const onMsg = msg => {
    if (msg === 'uncaught-exception') {
      log.info('uncaught exception occured');

      const watcher = watch();

      watcher.once('change', relpath => {
        log.info(`file change: ${relpath}`);
        overrideSignal = signal;
        app.kill('SIGINT');
      });

      watcher.once('ready', () => {
        log.info('waiting for any change to restart the app');
      });
    } else {
      app.once('message', onMsg);
    }
  };

  app.once('message', onMsg);

  app.once('exit', code => {
    process.removeListener('SIGTERM', onTerm);
    process.removeListener('SIGHUP', onTerm);

    if (overrideSignal === signal || code === signal) {
      log.info('restarting app due to file change');

      module.exports();
      return;
    }

    log.info('app exited with code', code);

    waitForChange();
  });

  process.once('SIGTERM', onTerm);
  process.once('SIGHUP', onTerm);
}

module.exports = () => {
  watchApp(startApp());
};
