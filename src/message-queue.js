const queue = (() => {
  const pending = [];
  let inFlight = false;

  const send = (msg, cb) => {
    if (inFlight) {
      pending.push([msg, cb]);
      return;
    }

    inFlight = true;

    process.send(msg, (e) => {
      inFlight = false;

      if (cb) {
        cb(e);
      }

      if (pending.length) {
        send(...pending.shift());
      }
    });
  };

  return send;
})();

module.exports = queue;
