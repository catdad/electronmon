const chalk = require('chalk');
const color = new chalk.constructor({ level: 1 });

const levels = {
  verbose: 1,
  info: 2,
  error: 3,
  quiet: 4
};
const logLevel = levels[process.env.ELECTRONMON_LOGLEVEL] || levels.info;

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
