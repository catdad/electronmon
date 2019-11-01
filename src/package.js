const fs = require('fs');

module.exports = (() => {
  try {
    const packageText = fs.readFileSync('./package.json', 'utf8');
    return JSON.parse(packageText || '{}');
  } catch (e) {
    return {};
  }
})();
