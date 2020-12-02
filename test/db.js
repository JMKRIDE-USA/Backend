const async = require('async');

const mongoose = require('../src/modules/mongoose.js');
const { operationMode } = require('../src/environment.js');


module.exports.clearDatabase = (callback) => {
  if (operationMode !== 'unittest') {
    throw new Error('Attempt to clear non testing database!');
  }

  const fns = [];

  function createAsyncFn(index) {
    fns.push(async () => {
      await mongoose.connection.collections[index].drop().catch(() => {})
    });
  }

  for (const i in mongoose.connection.collections) {
    if (
      Object.prototype.hasOwnProperty.call(mongoose.connection.collections, i)
    ) {
      createAsyncFn(i);
    }
  }

  async.parallel(fns, callback);
}