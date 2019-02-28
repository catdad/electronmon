const path = require('path');

const chokidar = require('chokidar');

const root = path.resolve('.');

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
