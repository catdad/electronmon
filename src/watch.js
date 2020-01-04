const chokidar = require('chokidar');

module.exports = ({ root }) => {
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
