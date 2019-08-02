const queue = (() => {
  const pending = [];
  let inFlight = false;

  const send = msg => {
    if (inFlight) {
      pending.push(msg);
      return;
    }

    inFlight = true;

    process.send(msg, () => {
      inFlight = false;

      if (pending.length) {
        send(pending.shift());
      }
    });
  };

  return send;
})();

module.exports = queue;
