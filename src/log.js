const chalk = require('chalk');
const color = new chalk.constructor({ level: 1 });

const levels = {
  verbose: 0,
  info: 1,
  error: 2
};
const logLevel = levels[process.env.ELECTRONMON_LOGLEVEL] || 1;

const logger = (level) => {
  const thisLevel = levels[level];

  return (...args) => {
    if (thisLevel < logLevel) {
      return;
    }

    /* eslint-disable-next-line no-console */
    console.log(color.grey('[electronmon]'), ...args.map(a => color.yellow(a)));
  };
};

module.exports = {
  error: logger('error'),
  info: logger('info'),
  verbose: logger('verbose')
};
