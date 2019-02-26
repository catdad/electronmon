const path = require('path');
const { spawn } = require('child_process');
const argv = require('yargs-parser')(process.argv.slice(2));
const importFrom = require('import-from');

const executable = importFrom.silent(path.resolve('.'), 'electron');
const log = require('./src/log.js');
const signal = require('./src/signal.js');

function start() {
  const hook = path.resolve(__dirname, 'src/hook.js');
  const args = ['--require', hook ].concat(argv._ || []);

  const server = spawn(executable, args, {
    stdio: ['inherit', 'inherit', 'inherit'],
    windowsHide: false
  });

  return server;
}

module.exports = () => {
  let server = start();

  server.on('exit', code => {
    if (code === signal) {
      log.info('restarting app due to file change');

      server = start();
      return;
    }

    log.info('app exited with code', code);
    log.info('waiting for a change to restart it');
  });
};
