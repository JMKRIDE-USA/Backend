const UserModel = require('../users/model.js');
const crypto = require('crypto');

const PERMISSION_LEVELS = require('../config.js').permissionLevels;

exports.findOrInsert = (req, res) => {
  if( !(req.body.email && req.body.password)) {
    return res.status(400).send({error: "Missing email or password"});
  }

  // Check if user exists, check correct pw and return ID
  UserModel.findByEmail(req.body.email).then(
    (result) => {
      if(result) {  // User Exists
        user = result[0] 
        let [salt, hash] = result[0].password.split('$');
        let provided_hash = crypto.createHmac('sha512', salt).update(req.body.password).digest("base64");
        if (hash === provided_hash) {
          res.status(200).send({id: result[0]._id});
        } else {
          res.status(401).send();
        }
      }
    }
  ).catch((error) => {   // Else, create user
    let salt = crypto.randomBytes(16).toString('base64');
    let hash = crypto.createHmac('sha512', salt).update(req.body.password).digest("base64");
    req.body.password = salt + "$" + hash;
    req.body.permissionLevel = PERMISSION_LEVELS.USER;

    UserModel.createUser(req.body)
      .then((result) => {
        res.status(201).send({id: result._id});
      });
    }
  );
};



exports.list = (req, res) => {
  let limit = req.query.limit && req.query.limit <= 100 ? parseInt(req.query.limit) : 10;
  let page = 0;
  if (req.query) {
    if (req.query.page) {
      req.query.page = parseInt(req.query.page);
      page = Number.isInteger(req.query.page) ? req.query.page : 0;
    }
  }
  UserModel.list(limit, page)
    .then((result) => {
      res.status(200).send(result);
    })
};

exports.getSelf = (req, res) => {
  UserModel.findById(req.jwt.userId)
    .then((result) => {
      delete(result.password);
      res.status(200).send(result);
    });
};

exports.getById = (req, res) => {
  UserModel.findById(req.params.userId)
    .then((result) => {
      res.status(200).send(result);
    });
};
exports.patchById = (req, res) => {
  if (req.body.password) {
    let salt = crypto.randomBytes(16).toString('base64');
    let hash = crypto.createHmac('sha512', salt).update(req.body.password).digest("base64");
    req.body.password = salt + "$" + hash;
  }

  UserModel.patchUser(req.params.userId, req.body)
    .then((result) => {
      res.status(204).send({});
    });

};

exports.removeById = (req, res) => {
  UserModel.removeById(req.params.userId)
    .then((result)=>{
      res.status(204).send({});
    });
};