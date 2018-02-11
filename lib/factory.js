'use strict';

var pkgcloud = require('pkgcloud');

function patchBaseClass(cls) {
    var proto = cls.prototype;
    var found = false;
    while (proto &&
    proto.constructor !== pkgcloud.storage.Container &&
    proto.constructor !== pkgcloud.storage.File) {
        if (proto.hasOwnProperty('_setProperties')) {
            found = true;
            break;
        } else {
            proto = Object.getPrototypeOf(proto);
        }
    }
    if (!found) {
        proto = cls.prototype;
    }
    var m1 = proto._setProperties;
    proto._setProperties = function (details) {
        var receiver = {};
        Object.defineProperties(receiver, {
            client: {value: this.client},
            files: {value: this.files},
        });
        m1.call(receiver, details);
        for (var p in receiver) {
            this[p] = receiver[p];
        }
        this._rawMetadata = details;
        this._metadata = receiver;
    };

    proto.toJSON = function () {
        return this._metadata;
    };

    proto.getMetadata = function () {
        return this._metadata;
    };

    proto.getRawMetadata = function () {
        return this._rawMetadata;
    };
}

function patchContainerAndFileClass(provider) {
    var storageProvider = getProvider(provider).storage;
    patchBaseClass(storageProvider.Container);
    patchBaseClass(storageProvider.File);
}

function createClient(options) {
    options = options || {};
    var provider = options.provider || 'filesystem';
    var handler;

    try {
        handler = require(provider);
        if (!handler || !handler.createClient) {
            handler = require('pkgcloud').storage;
        }
    } catch (err) {
        handler = require('pkgcloud').storage;
    }
    patchContainerAndFileClass(provider);
    return handler.createClient(options);
}

function getProvider(provider) {
    try {
        return require(provider);
    } catch (err) {
        return require('pkgcloud').providers[provider];
    }
}

module.exports.createClient = createClient;
module.exports.getProvider = getProvider;
