const { format } = require('util');
const chalk = require('chalk');

const levels = {
  verbose: 1,
  info: 2,
  error: 3,
  quiet: 4
};

const logger = (level, maxLevel, stream) => {
  const isTTY = stream.isTTY || Number(process.env.FORCE_COLOR) > 1;
  const color = new chalk.Instance({ level: isTTY ? 1 : 0 });

  const thisLevel = levels[level];

  return (...args) => {
    if (thisLevel < maxLevel) {
      return;
    }

    stream.write(`${format(color.grey('[electronmon]'), ...args.map(a => color.yellow(a)))}\n`);
  };
};

module.exports = (stream, maxLevel) => {
  return {
    error: logger('error', levels[maxLevel], stream),
    info: logger('info', levels[maxLevel], stream),
    verbose: logger('verbose', levels[maxLevel], stream)
  };
};
