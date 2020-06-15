const path = require('path');
const { spawn } = require('child_process');

const logger = require('./log.js');
const watch = require('./watch.js');

const SIGNAL = require('./signal.js');
const ERRORED = -1;

const isStdReadable = stream => stream === process.stdin;
const isStdWritable = stream => stream === process.stdout || stream === process.stderr;

module.exports = ({
  cwd = process.cwd(),
  args = ['.'],
  env = {},
  logLevel = 'info',
  electronPath,
  stdio = [process.stdin, process.stdout, process.stderr],
  patterns = []
} = {}) => {
  const executable = electronPath || require('electron');

  const isTTY = stdio[1].isTTY;
  const getEnv = (env) => Object.assign(
    isTTY ? { FORCE_COLOR: '1' } : {},
    process.env,
    { ELECTRONMON_LOGLEVEL: logLevel },
    env
  );
  const log = logger(stdio[1], logLevel);

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

      const stdioArg = [
        isStdReadable(stdio[0]) ? 'inherit' : 'pipe',
        isStdWritable(stdio[1]) ? 'inherit' : 'pipe',
        isStdWritable(stdio[2]) ? 'inherit' : 'pipe',
        'ipc'
      ];

      const app = spawn(executable, argv, {
        stdio: stdioArg,
        env: getEnv(env),
        cwd,
        windowsHide: false,
      });

      stdioArg.forEach((val, idx) => {
        if (val !== 'pipe') {
          return;
        }

        if (idx === 0) {
          stdio[0].pipe(app.stdin);
        } else if (idx === 1) {
          app.stdout.pipe(stdio[1], { end: false });
        } else if (idx === 2) {
          app.stderr.pipe(stdio[2], { end: false });
        }
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

      const send = app.send.bind(app);
      globalApp.send = (signal) => {
        send(signal);

        if (signal === 'reset') {
          // app is being killed, ignore all future messages
          globalApp.send = () => {};
        }
      };

      resolve(app);
    });
  }

  function closeApp() {
    return new Promise((resolve) => {
      if (!globalApp) {
        return resolve();
      }

      globalApp.once('exit', () => {
        globalApp = null;
        resolve();
      });

      globalApp.kill('SIGINT');
    });
  }

  function restartApp() {
    return closeApp().then(() => init());
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
      const watcher = watch({ root: cwd, patterns });
      globalWatcher = watcher;

      watcher.on('change', ({ path: fullpath }) => {
        const relpath = path.relative(cwd, fullpath);
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

      watcher.on('add', ({ path: fullpath }) => {
        const relpath = path.relative(cwd, fullpath);
        log.verbose('watching new file:', relpath);
      });

      watcher.once('ready', () => {
        log.info('waiting for a change to restart it');
        resolve();
      });
    });
  }

  function destroyApp() {
    return Promise.all([
      closeApp(),
      globalWatcher.close()
    ]).then(() => {
      globalApp = globalWatcher = null;
    });
  }

  function init() {
    return Promise.all([
      globalWatcher ? Promise.resolve() : startWatcher(),
      globalApp ? Promise.resolve() : startApp()
    ]).then(() => undefined);
  }

  return init().then(() => ({
    close: closeApp,
    destroy: destroyApp,
    reload: reloadApp,
    restart: restartApp
  }));
};
