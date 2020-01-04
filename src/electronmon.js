const path = require('path');
const { spawn } = require('child_process');
const importFrom = require('import-from');
const argv = process.argv.slice(2);

const executable = importFrom(path.resolve('.'), 'electron');
const log = require('./log.js');
const watch = require('./watch.js');
const signal = require('./signal.js');

const errored = -1;
const isTTY = process.stdout.isTTY && process.stderr.isTTY;
const env = Object.assign(isTTY ? { FORCE_COLOR: '1' } : {}, process.env);

module.exports = ({ cwd } = {}) => {
  const appfiles = {};
  let globalApp;
  let overrideSignal;

  function onTerm() {
    if (globalApp) {
      globalApp.kill('SIGINT');
    }

    process.exit(0);
  }

  function onMessage({ type, file }) {
    if (type === 'discover') {
      appfiles[file] = true;
    } else if (type === 'uncaught-exception') {
      log.info('uncaught exception occured');
      log.info('waiting for any change to restart the app');
      overrideSignal = errored;
    }
  }

  function startApp() {
    return new Promise((resolve) => {
      overrideSignal = null;

      const hook = path.resolve(__dirname, 'hook.js');
      const args = ['--require', hook].concat(argv);

      const app = spawn(executable, args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env,
        windowsHide: false
      });

      app.on('message', onMessage);

      app.once('exit', code => {
        process.removeListener('SIGTERM', onTerm);
        process.removeListener('SIGHUP', onTerm);
        globalApp = null;

        if (overrideSignal === errored) {
          log.info(`ignoring exit with code ${code}`);
          return;
        }

        if (overrideSignal === signal || code === signal) {
          log.info('restarting app due to file change');
          startApp();
          return;
        }

        log.info(`app exited with code ${code}, waiting for change to restart it`);
      });

      process.once('SIGTERM', onTerm);
      process.once('SIGHUP', onTerm);
      globalApp = app;

      resolve(app);
    });
  }

  function stopApp() {
    return new Promise((resolve) => {
      if (!globalApp) {
        return resolve();
      }

      globalApp.once('exit', () => {
        resolve();
      });

      globalApp.kill('SIGINT');
    });
  }

  function restartApp() {
    return stopApp().then(() => startApp());
  }

  function reloadApp() {
    // this is a convenience method to reload the renderer
    // thread in the app... also, everything is a promise
    if (!globalApp) {
      return restartApp();
    }

    return new Promise((resolve) => {
      globalApp.send('reload');
      resolve();
    });
  }

  function startWatcher() {
    return new Promise((resolve) => {
      const watcher = watch({ root: cwd });

      watcher.on('change', relpath => {
        const filepath = path.resolve(cwd, relpath);
        const type = 'change';

        if (overrideSignal === errored) {
          log.info(`file ${type}: ${relpath}`);
          return restartApp();
        }

        if (!globalApp) {
          log.info(`file ${type}: ${relpath}`);
          return startApp();
        }

        if (appfiles[filepath]) {
          log.info(`main file ${type}: ${relpath}`);
          globalApp.send('reset');
        } else {
          log.info(`renderer file ${type}: ${relpath}`);
          globalApp.send('reload');
        }
      });

      watcher.on('add', relpath => {
        log.verbose('watching new file:', relpath);
      });

      watcher.once('ready', () => {
        log.info('waiting for a change to restart it');
        resolve();
      });
    });
  }

  return Promise.all([
    startWatcher(),
    startApp()
  ]).then(() => {
    return {
      stop: stopApp,
      restart: restartApp,
      reload: reloadApp
    };
  });
};
