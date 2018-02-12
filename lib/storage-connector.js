'use strict';
const util = require('util');
const StorageService = require('./storage-service');
const mixin = require('loopback-datasource-juggler').ModelBaseClass.mixin;

exports.initialize = function (dataSource, callback) {
  const settings = dataSource.settings || {};
  const connector = new StorageService(settings);
  dataSource.connector = connector;
  dataSource.connector.dataSource = dataSource;
  connector.DataAccessObject = function () {
  };
  mixin.apply(connector.DataAccessObject, [dataSource.constructor.DataAccessObject]);
  for (let m in StorageService.prototype) {
    const method = StorageService.prototype[m];
    if ('function' === typeof method) {
      if (method.isStatic === false) {
        connector.DataAccessObject.prototype[m] = method.apply(connector);
        for (let k in method) {
          connector.DataAccessObject.prototype[m][k] = method[k];
        }
      } else {
        connector.DataAccessObject[m] = method.bind(connector);
        for (let k in method) {
          connector.DataAccessObject[m][k] = method[k];
        }
      }

    }
  }
  if (callback) {
    process.nextTick(callback);
  }
};
