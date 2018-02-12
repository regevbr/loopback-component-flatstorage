'use strict';

const factory = require('./factory');
const handler = require('./storage-handler');
const Connector = require('loopback-connector').Connector;
const util = require('util');
const _ = require('underscore');

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

StorageService.prototype.getDataSource = function () {
  return this.dataSource;
};

StorageService.prototype.create =
  StorageService.prototype.updateOrCreate =
    StorageService.prototype.patchOrCreateWithWhere =
      StorageService.prototype.upsertWithWhere =
        StorageService.prototype.findOrCreate =
          StorageService.prototype.save =
            StorageService.prototype.destroy =
              StorageService.prototype.destroyAll =
                StorageService.prototype.count =
                  StorageService.prototype.update =
                    StorageService.prototype.updateAll =
                      StorageService.prototype.updateAttributes =
                        StorageService.prototype.replaceById =
                          StorageService.prototype.replaceOrCreate =
                            function create() {
                              const callback = _.filter(arguments, arg => {
                                return 'function' === typeof arg;
                              })[0];
                              return process.nextTick(function () {
                                callback && callback(new Error("Operation not permitted"));
                              });
                            };

function buildId(id) {
  return id + '/';
}

function map(files, folder, id) {
  const filtered = _.filter(files, file => {
    return file.size > 0;
  });
  return _.map(filtered, file => {
    const currFolder = folder || (file.name.split('/')[0] + '/');
    const currId = id || currFolder.split('/')[0];
    return {
      id: currId,
      folder: currFolder,
      name: file.name.replace(currFolder, ''),
      fullName: file.name
    };
  });
}

StorageService.prototype.exists = function exists(id, options, cb) {
  if (typeof options === 'function' && !cb) {
    cb = options;
    options = {};
  }
  options = options || {};
  options.prefix = buildId(id);
  return this.client.getFiles(this.container, options, function (err, files) {
    if (err) {
      cb(err, files);
    } else {
      cb(err, map(files, options.prefix, id).length > 0);
    }
  });
};

StorageService.prototype.findById = function findById(id, filter, options, cb) {
  if (typeof options === 'function' && !cb) {
    cb = options;
    options = {};
  }
  options = options || {};
  options.prefix = buildId(id);
  return this.client.getFiles(this.container, options, function (err, files) {
    if (err) {
      cb(err, files);
    } else {
      //TODO fix format of return type
      cb(err, {files: map(files, options.prefix, id), id: id, folder: options.prefix});
    }
  });
};

StorageService.prototype.all = function all(model, filter, options, cb) {
  if (typeof options === 'function' && !cb) {
    cb = options;
    options = {};
  }
  options = options || {};
  const idKey = this.idName(model);
  if (filter && filter.where && filter.where[idKey]) {
    options.prefix = buildId(filter.where[idKey]);
  }
  return this.client.getFiles(this.container, options, function (err, files) {
    if (err) {
      cb(err, files);
    } else {
      const res = {files: map(files, options.prefix, filter.where && filter.where[idKey])};
      if (options.prefix) {
        res.folder = options.prefix;
        res[idKey] = filter.where[idKey];
      }
      cb(err, [res]);
    }
  });
};

StorageService.prototype.buildNearFilter = function () {
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

function buildFileName(file, id) {
  id = buildId(id);
  if (file.indexOf(id) !== 0) {
    file = id + file;
  }
  return file;
}

StorageService.prototype.file = function () {
  const scope = this;
  return function (file, cb) {
    return scope.client.getFile(scope.container, buildFileName(file, this.id), cb);
  };
};

StorageService.prototype.file.shared = true;
StorageService.prototype.file.isStatic = false;
StorageService.prototype.file.accepts = [
  {arg: 'file', type: 'string', required: true, 'http': {source: 'path'}}
];
StorageService.prototype.file.returns = {arg: 'file', type: 'object', root: true};
StorageService.prototype.file.http =
  {verb: 'get', path: '/files/:file'};


StorageService.prototype.removeFile = function () {
  const scope = this;
  return function (file, cb) {
    return scope.client.removeFile(scope.container, buildFileName(file, this.id), (err) => {
      if (err) {
        cb(err);
      } else {
        cb(null);
      }
    });
  };
};

StorageService.prototype.removeFile.shared = true;
StorageService.prototype.removeFile.isStatic = false;
StorageService.prototype.removeFile.accepts = [
  {arg: 'file', type: 'string', required: true, 'http': {source: 'path'}}
];
StorageService.prototype.removeFile.returns = {};
StorageService.prototype.removeFile.http =
  {verb: 'delete', path: '/files/:file'};

StorageService.prototype.upload = function () {
  const connectorScope = this;
  return function (req, res, options, cb) {
    const scope = this;
    if (!cb && 'function' === typeof options) {
      cb = options;
      options = {};
    }
    options.container = connectorScope.container;
    options.getFilename = file => {
      return buildFileName(file.name, scope.id);
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
    return handler.upload(connectorScope.client, req, res, options, (err) => {
      if (err) {
        cb(err);
      } else {
        cb(null);
      }
    });
  };
};

StorageService.prototype.upload.shared = true;
StorageService.prototype.upload.isStatic = false;
StorageService.prototype.upload.accepts = [
  {arg: 'req', type: 'object', 'http': {source: 'req'}},
  {arg: 'res', type: 'object', 'http': {source: 'res'}}
];
StorageService.prototype.upload.returns = {arg: 'result', type: 'object'};
StorageService.prototype.upload.http =
  {verb: 'post', path: '/files/upload'};

StorageService.prototype.download = function () {
  const scope = this;
  return function (file, req, res, cb) {
    return handler.download(scope.client, req, res, scope.container, buildFileName(file, this.id), cb);
  };
};

StorageService.prototype.download.shared = true;
StorageService.prototype.download.isStatic = false;
StorageService.prototype.download.accepts = [
  {arg: 'file', type: 'string', required: true, 'http': {source: 'path'}},
  {arg: 'req', type: 'object', 'http': {source: 'req'}},
  {arg: 'res', type: 'object', 'http': {source: 'res'}}
];
StorageService.prototype.download.http =
  {verb: 'get', path: '/download/:file'};
