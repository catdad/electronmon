const { format } = require('util');
const chalk = require('chalk');

const levels = {
  verbose: 1,
  info: 2,
  error: 3,
  quiet: 4
};
const logLevel = levels[process.env.ELECTRONMON_LOGLEVEL] || levels.info;

const logger = (level, stream) => {
  const isTTY = stream.isTTY;
  const color = new chalk.constructor({ level: isTTY ? 1 : 0 });

  const thisLevel = levels[level];

  return (...args) => {
    if (thisLevel < logLevel) {
      return;
    }

    stream.write(`${format(color.grey('[electronmon]'), ...args.map(a => color.yellow(a)))}\n`);
  };
};

module.exports = (stream) => {
  return {
    error: logger('error', stream),
    info: logger('info', stream),
    verbose: logger('verbose', stream)
  };
};
