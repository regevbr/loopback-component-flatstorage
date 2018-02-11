'use strict';

const factory = require('./factory');
const handler = require('./storage-handler');
const storage = require('pkgcloud').storage;
const Connector = require('loopback-connector').Connector;

module.exports = StorageService;

function StorageService(options) {
    if (!(this instanceof StorageService)) {
        return new StorageService(options);
    }
    this.provider = options.provider;
    this.client = factory.createClient(options);
    this.container = options.container;
    if ('function' === typeof options.getFilename) {
        this.getFilename = options.getFilename;
    }
    if (options.acl) {
        this.acl = options.acl;
    }
    if (options.allowedContentTypes) {
        this.allowedContentTypes = options.allowedContentTypes;
    }
    if (options.maxFileSize) {
        this.maxFileSize = options.maxFileSize;
    }
    if (options.nameConflict) {
        this.nameConflict = options.nameConflict;
    }
    if (options.maxFieldsSize) {
        this.maxFieldsSize = options.maxFieldsSize;
    }
    this.constructor.super_.call(this, 'flatstorage', options);
}

util.inherits(StorageService, Connector);

StorageService.prototype.getTypes = function () {
    return ['db', 'nosql', 'flatstorage'];
};

StorageService.prototype.create =
    StorageService.prototype.updateOrCreate =
        StorageService.prototype.patchOrCreateWithWhere =
            StorageService.prototype.upsertWithWhere =
                StorageService.prototype.findOrCreate =
                    StorageService.prototype.save =
                        StorageService.prototype.destroy =
                            StorageService.prototype.destroyAll =
                                StorageService.prototype.all =
                                    StorageService.prototype.count =
                                        StorageService.prototype.update =
                                            StorageService.prototype.updateAll =
                                                StorageService.prototype.updateAttributes =
                                                    StorageService.prototype.replaceById =
                                                        StorageService.prototype.replaceOrCreate =
                                                            function create(model, data, options, callback) {
                                                                return process.nextTick(function () {
                                                                    callback(new Error("Operation not permitted"));
                                                                });
                                                            };

function buildId(id) {
    return '/' + id + '/';
}

StorageService.prototype.exists = function exists(model, id, options, cb) {
    if (typeof options === 'function' && !cb) {
        cb = options;
        options = {};
    }
    options.prefix = buildId(id);
    return this.client.getFiles(this.container, options, function (err, files) {
        if (err) {
            cb(err, files);
        } else {
            //TODO check if files really exists
            cb(err, true);
        }
    });
};

StorageService.prototype.find = function exists(model, id, options, cb) {
    if (typeof options === 'function' && !cb) {
        cb = options;
        options = {};
    }
    options.prefix = buildId(id);
    return this.client.getFiles(this.container, options, function (err, files) {
        if (err) {
            cb(err, files);
        } else {
            //TODO fix format of return type
            cb(err, true);
        }
    });
};

StorageService.prototype.buildNearFilter = function (filter) {
    // noop
};

StorageService.prototype.automigrate = function (models, callback) {
    process.nextTick(callback);
};

StorageService.prototype.transaction = function () {
    return this;
};

StorageService.prototype.exec = function (callback) {
    process.nextTick(callback);
};

StorageService.prototype._buildFileName = function (file) {
    const scope = this;
    const model = scope.constructor;
    //TODO check if this really works
    const pkName = model.definition.idName() || 'id';
    if (file.indexOf('/') !== 0) {
        file = '/' + file;
    }
    const id = buildId(scope[pkName]);
    if (file.indexOf(id) !== 0) {
        file = id + file;
    }
    return file;
};

StorageService.prototype.file = function (file, cb) {
    return this.client.getFile(this.container, this._buildFileName(file), cb);
};

StorageService.prototype.file.shared = true;
StorageService.prototype.file.accepts = [
    {arg: 'file', type: 'string', required: true, 'http': {source: 'path'}}
];
StorageService.prototype.file.returns = {arg: 'file', type: 'object', root: true};
StorageService.prototype.file.http =
    {verb: 'get', path: '/files/:file'};


StorageService.prototype.removeFile = function (file, cb) {
    return this.client.removeFile(this.container, this._buildFileName(file), cb);
};

StorageService.prototype.removeFile.shared = true;
StorageService.prototype.removeFile.accepts = [
    {arg: 'file', type: 'string', required: true, 'http': {source: 'path'}}
];
StorageService.prototype.removeFile.returns = {};
StorageService.prototype.removeFile.http =
    {verb: 'delete', path: '/files/:file'};

StorageService.prototype.upload = function (req, res, options, cb) {
    // Test if container is req for backward compatibility
    const scope = this;
    if (typeof container === 'object' && container.url && container.method) {
        // First argument is req, shift all args
        cb = options;
        options = res;
        res = req;
        req = container;
    }
    if (!cb && 'function' === typeof options) {
        cb = options;
        options = {};
    }
    options.container = this.container;
    options.getFilename = file => {
        return scope._buildFileName(file);
    };
    if (this.acl && !options.acl) {
        options.acl = this.acl;
    }
    if (this.allowedContentTypes && !options.allowedContentTypes) {
        options.allowedContentTypes = this.allowedContentTypes;
    }
    if (this.maxFileSize && !options.maxFileSize) {
        options.maxFileSize = this.maxFileSize;
    }
    if (this.nameConflict && !options.nameConflict) {
        options.nameConflict = this.nameConflict;
    }
    if (this.maxFieldsSize && !options.maxFieldsSize) {
        options.maxFieldsSize = this.maxFieldsSize;
    }
    return handler.upload(this.client, req, res, options, cb);
};

StorageService.prototype.upload.shared = true;
StorageService.prototype.upload.accepts = [
    {arg: 'req', type: 'object', 'http': {source: 'req'}},
    {arg: 'res', type: 'object', 'http': {source: 'res'}}
];
StorageService.prototype.upload.returns = {arg: 'result', type: 'object'};
StorageService.prototype.upload.http =
    {verb: 'post', path: '/files/upload'};

StorageService.prototype.download = function (file, req, res, cb) {
    return handler.download(this.client, req, res, this.container, this._buildFileName(file), cb);
};

StorageService.prototype.download.shared = true;
StorageService.prototype.download.accepts = [
    {arg: 'file', type: 'string', required: true, 'http': {source: 'path'}},
    {arg: 'req', type: 'object', 'http': {source: 'req'}},
    {arg: 'res', type: 'object', 'http': {source: 'res'}}
];
StorageService.prototype.download.http =
    {verb: 'get', path: '/files/:file/download'};
