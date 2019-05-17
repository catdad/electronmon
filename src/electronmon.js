const path = require('path');
const { spawn } = require('child_process');
const importFrom = require('import-from');
const argv = process.argv.slice(2);

const executable = importFrom.silent(path.resolve('.'), 'electron');
const log = require('./log.js');
const watch = require('./watch.js');
const signal = require('./signal.js');
const ignore = -1;
const isTTY = process.stdout.isTTY && process.stderr.isTTY;
const env = Object.assign(isTTY ? { FORCE_COLOR: '1' } : {}, process.env);

function startApp() {
  const hook = path.resolve(__dirname, 'hook.js');
  const args = ['--require', hook].concat(argv);

  const app = spawn(executable, args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env,
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
      overrideSignal = ignore;

      const watcher = watch();

      watcher.once('change', relpath => {
        log.info(`file change: ${relpath}`);

        if (app.connected) {
          // if the app is still running, set the signal override to the
          // regular restart signal and kill the app
          overrideSignal = signal;
          app.kill('SIGINT');
        } else {
          // the app is no longer running, so do a clean start
          module.exports();
        }
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

    if (overrideSignal === ignore) {
      return;
    }

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
