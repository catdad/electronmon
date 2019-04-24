/* eslint-disable */
if (process.env.TEST_ERROR) {
  throw new Error(process.env.TEST_ERROR);
}

module.exports = 'no error';
