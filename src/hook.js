const path = require('path');
const Module = require('module');

const resolve = require('resolve-from');

const root = path.resolve('.');
const paths = [];

function record(id) {
  if (id.indexOf(root) !== 0) {
    // this is outside the root directory, so don't watch it
    return;
  }

  if (id.indexOf(path.resolve(root, 'node_modules')) === 0) {
    // this is a node module, don't watch it
    return;
  }

  // anything left over is a local file, so watch this
  paths.push(id);
}

const originalLoad = Module._load;
Module._load = function (request, parent) {
  if (parent) {
    const idpath = resolve.silent(path.dirname(parent.filename), request);

    if (idpath) {
      record(idpath);
    }
  }

  return originalLoad.apply(this, arguments);
};

setTimeout(() => console.log(paths), 5000);
