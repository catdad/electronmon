const fs = require('fs');
const path = require('path');
const watchboy = require('watchboy');

const root = fs.realpathSync(path.resolve('.'));

module.exports = () => {
  const watcher = watchboy(['**/*', '!node_modules', '!.*', '!**/*.map'], {
    cwd: root
  });

  return watcher;
};

module.exports.root = root;
