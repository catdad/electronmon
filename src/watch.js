const watchboy = require('watchboy');

module.exports = ({ root }) => {
  const watcher = watchboy(['**/*', '!node_modules', '!node_modules/**/*', '!.*', '!**/*.map'], {
    cwd: root
  });

  return watcher;
};
