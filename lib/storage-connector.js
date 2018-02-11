'use strict';
const util = require('util');

const StorageService = require('./storage-service');
exports.initialize = function (dataSource, callback) {
    const settings = dataSource.settings || {};
    const connector = new StorageService(settings);
    dataSource.connector = connector;
    dataSource.connector.dataSource = dataSource;

    connector.DataAccessObject = function () {
    };
    util.inherits(connector.DataAccessObject, dataSource.constructor.DataAccessObject);
    for (let m in StorageService.prototype) {
        const method = StorageService.prototype[m];
        if ('function' === typeof method) {
            connector.DataAccessObject[m] = method.bind(connector);
            for (let k in method) {
                connector.DataAccessObject[m][k] = method[k];
            }
        }
    }
    connector.define = function() {
    };
    if (callback) {
        process.nextTick(callback);
    }
};
