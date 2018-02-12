# loopback-component-flatstorage
loopback component for attaching to various cloud storage providers with ACL and relations functionality

LoopBack flatstorage component provides Node.js and REST APIs to manage binary file contents using pluggable storage providers, such as local file systems, Amazon S3, or Rackspace cloud files. It uses pkgcloud to support cloud-based storage services.

The module is only tested on amazon but potentially can work on all cloud providers - use at own risk! or better yet - contribute!

This module is based entirely on [loopback-component-storage](https://github.com/strongloop/loopback-component-storage)

The differences are:
 - container (bucket) is defined at the data source level
 - the model base should be 'PersistedModel' which enables relations and ACL
 - the id of the model is the root 'folder'
 
API
-----

| Description   | REST URI      |
| ------------- |:-------------:|
| List all files      | GET /api/mystorage |
| List all files in a specified folder      | GET /api/mystorage/myfolder     |
| Get information for specified file within a specified folder | GET /api/mystorage/myfolder/files/myfile      |
| Delete a specified file within a specified folder | DELETE /api/mystorage/myfolder/files/myfile      |
| Download a specified file within a specified folder | GET /api/mystorage/myfolder/download/myfile      |
| Upload one or more files into a specified container. The request body must use multipart/form-data which is the file input type HTML uses | POST /api/mystorage/myfolder/files/upload      |


Configuration
-----

To create a model for images storage per user: 

datasource.json:
```json
{
  "ImagesS3": {
    "name": "ImagesS3",
    "provider": "amazon",
    "connector": "loopback-component-flatstorage",
    "container": "user-images",
    "region": "eu-central-1",
    "key": "<key>",
    "keyId": "<key-id>"
  }
}
```

images.json:
```json
{
  "name": "Images",
  "plural": "Images",
  "base": "PersistedModel",
  "idInjection": false,
  "properties": {
    "userId": {
      "type": "string",
      "required": true,
      "id": true,
      "generated": false
    }
  },
  "validations": [],
  "relations": {
    "user": {
      "type": "belongsTo",
      "model": "User",
      "foreignKey": "userId",
      "required": true
    }
  },
  "acls": [
    {
      "accessType": "*",
      "principalType": "ROLE",
      "principalId": "$everyone",
      "permission": "DENY"
    },
    {
      "accessType": "*",
      "principalType": "ROLE",
      "principalId": "$owner",
      "permission": "ALLOW"
    }
  ],
  "methods": {}
}
```

user.json:
```json
...
  "relations": {
    "images": {
      "type": "hasOne",
      "model": "Images",
      "foreignKey": "userId"
    }
  }
...
```

Nested Queries
---------

The model can be used in nested queries.

To continue our example, we can enable the following nested rest api for a user to give him control over his files:
- /api/user/\<user>/images/files/\<my file>
- /api/user/\<user>/images/download/\<my file>
- /api/user/\<user>/images/files/upload

To configure: 
```javascript
  app.models.User && app.models.Images && app.models.User.nestRemoting('images', {
    filterMethod: function (method, relation) {
      var matches = method.name.indexOf('removeFile') > -1 || method.name.indexOf('file') > -1 || method.name.indexOf('download') > -1 || method.name.indexOf('upload') > -1;
      if (matches) {
        return '__' + method.name + '__' + relation.name;
      }
    }
  });
```
