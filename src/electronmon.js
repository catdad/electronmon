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
    stdio: ['inherit', 'inherit', 'inherit'],
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
}

function watchApp(app) {
  const onTerm = () => {
    app.kill('SIGINT');
    process.exit(0);
  };

  app.once('exit', code => {
    process.removeListener('SIGTERM', onTerm);
    process.removeListener('SIGHUP', onTerm);

    if (code === signal) {
      log.info('restarting app due to file change');

      module.exports();
      return;
    }

    log.info('app exited with code', code);
    log.info('waiting for a change to restart it');

    waitForChange();
  });

  process.once('SIGTERM', onTerm);
  process.once('SIGHUP', onTerm);
}

module.exports = () => {
  watchApp(startApp());
};
