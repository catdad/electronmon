const path = require('path');
const { spawn } = require('child_process');
const importFrom = require('import-from');

const executable = importFrom(path.resolve('.'), 'electron');
const log = require('./log.js');
const watch = require('./watch.js');

const SIGNAL = require('./signal.js');
const ERRORED = -1;

const isTTY = process.stdout.isTTY && process.stderr.isTTY;
const getEnv = (env) => Object.assign(isTTY ? { FORCE_COLOR: '1' } : {}, process.env, env);

module.exports = ({ cwd, args = ['.'], env = {} } = {}) => {
  const appfiles = {};
  let globalWatcher;
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
      overrideSignal = ERRORED;
    }
  }

  function startApp() {
    return new Promise((resolve) => {
      overrideSignal = null;

      const hook = path.resolve(__dirname, 'hook.js');
      const argv = ['--require', hook].concat(args);

      const app = spawn(executable, argv, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: getEnv(env),
        cwd,
        windowsHide: false,
      });

      app.on('message', onMessage);

      app.once('exit', code => {
        process.removeListener('SIGTERM', onTerm);
        process.removeListener('SIGHUP', onTerm);
        globalApp = null;

        if (overrideSignal === ERRORED) {
          log.info(`ignoring exit with code ${code}`);
          return;
        }

        if (overrideSignal === SIGNAL || code === SIGNAL) {
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

  function closeApp() {
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
    return closeApp().then(() => startApp());
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
      globalWatcher = watcher;

      watcher.on('change', relpath => {
        const filepath = path.resolve(cwd, relpath);
        const type = 'change';

        if (overrideSignal === ERRORED) {
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

  function stopApp() {
    return Promise.all([
      closeApp(),
      globalWatcher.close()
    ]).then(() => undefined);
  }

  return Promise.all([
    startWatcher(),
    startApp()
  ]).then(() => {
    return {
      stop: stopApp,
      close: closeApp,
      restart: restartApp,
      reload: reloadApp
    };
  });
};
