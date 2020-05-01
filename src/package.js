const fs = require('fs');

const read = () => {
  try {
    const packageText = fs.readFileSync('./package.json', 'utf8');
    return JSON.parse(packageText || '{}');
  } catch (e) {
    return {};
  }
};

module.exports = (() => {
  const pkg = read();

  pkg.electronmon = Object.assign({
    patterns: []
  }, pkg.electronmon);

  return pkg;
})();
