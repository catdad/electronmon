const fs = require('fs');
const path = require('path');

const chokidar = require('chokidar');

const root = fs.realpathSync(path.resolve('.'));

module.exports = () => {
  const watcher = chokidar.watch('.', {
    cwd: root,
    ignored: [
      /(^|[/\\])\../, // Dotfiles
      'node_modules',
      '**/*.map'
    ]
  });

  return watcher;
};

module.exports.root = root;
