const path = require('path');
const watchboy = require('watchboy');

const root = path.resolve('.');

module.exports = () => {
  const watcher = watchboy(['**/*', '!node_modules', '!.*', '!**/*.map'], {
    cwd: root
  });

  return watcher;
};
