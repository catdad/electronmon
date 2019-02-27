const path = require('path');
const Module = require('module');
const EventEmitter = require('events');

const resolve = require('resolve-from');

const events = new EventEmitter();

// this is a hack and I don't like it
// if you know a better way to collect all required modules
// please file an issue, I'd appreciate it very much
// https://github.com/catdad/electronmon/issues/new
const originalLoad = Module._load;
Module._load = function (request, parent) {
  if (parent) {
    const idpath = resolve.silent(path.dirname(parent.filename), request);

    if (idpath) {
      events.emit('file', idpath);
    }
  }

  return originalLoad.apply(this, arguments);
};

module.exports = events;
