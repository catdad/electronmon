const watchboy = require('watchboy');

const PATTERNS = ['**/*', '!node_modules', '!node_modules/**/*', '!.*', '!**/*.map'];

module.exports = ({ root, patterns }) => {
  const watcher = watchboy([...PATTERNS, ...patterns.map(s => `${s}`)], {
    cwd: root
  });

  return watcher;
};
