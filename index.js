/* eslint-disable no-console */

const path = require('path');
const { spawn } = require('child_process');
const argv = require('yargs-parser')(process.argv.slice(2));
const importFrom = require('import-from');

let executable = importFrom.silent(path.resolve('.'), 'electron');

module.exports = () => {
  let server;

  const hook = path.resolve(__dirname, 'src/hook.js');
  const args = ['--require', hook ].concat(argv._ || []);

  server = spawn(executable, args, {
    stdio: ['ignore', 'inherit', 'inherit'],
    windowsHide: false
  });

  server.on('exit', (code) => {
    if (server) {
      console.log('server exited with code', code);
      console.log('waiting for a change to restart it');
    }

    server = null;
  });
};
