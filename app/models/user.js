var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',

  initialize: function({username, password}) {
    this.username = username;
    this.password = password;
  }
});

module.exports = User;