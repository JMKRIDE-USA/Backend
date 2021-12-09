const mongoose = require('../modules/mongoose.js');
const User = require('./schema.js');
const { processMode } = require('../environment.js');


/* ------------------------- Generics ------------------------------- */

class BaseUserModel {

  static findByEmail(email) {
    return User.find({email: email});
  }

  static findById(id) {
    return User.findById(id);
  }

  static getAllUsers(){
    return User.find()
  }

  static createUser(userData) {
    const user = new User(userData);
    return user.save();
  }

  static list(perPage, page) {
    return User.find()
      .limit(perPage)
      .skip(perPage * page)
  }

  static setUserSettings(userId, settingsData) {
    return User.findById(userId).then(user => {
      user.settings = Object.assign({}, user.settings, settingsData);
      user.markModified('settings');
      return user.save()
    })
  }

  static patchUser(id, userData) {
    return User.findOneAndUpdate({_id: id}, userData);
  }

  static removeById(userId) {
    return User.deleteMany({_id: userId});
  }
}


/* ------------------------ AmbassadorSite -------------------------- */

class AmbassadorsiteUserModel extends BaseUserModel {
  static findById(
    id, 
    {
      populateSubmissionCount = false,
      populateReferralCode = false
    } = {}) {
      let user = User.findById(id);
      if(populateSubmissionCount) {
        user.populate('submissionCount');
      }
      if(populateReferralCode) {
        user.populate('referralCode');
      }
      return user;
  }

  static list(perPage, page) {
    return new Promise((resolve, reject) => {
      User.find()
        .populate('submissionCount')
        .limit(perPage)
        .skip(perPage * page)
        .exec(function (err, users) {
          if (err) {
            reject(err);
          } else {
            resolve(users);
          }
        })
    });
  }

  static getAllUserLocations() {
    return User.aggregate([
      {$match: {location: {$exists: true}}},
      {$group: {_id: '$location', count: {$count: {}}}}
    ])
  }
}


/* ------------------------ StockTracker -------------------------- */

class StocktrackerUserModel extends BaseUserModel {
  static handleDeletedDefault({propName, id, replacement}) {
    return User.updateMany(
      {[propName]: mongoose.Types.ObjectId(id)},
      {$set: {[propName]: mongoose.Types.ObjectId(replacement)}},
    );
  }
}


/* ------------------------ Exports -------------------------- */

module.exports = {
  ambassadorsite: AmbassadorsiteUserModel,
  stocktracker: StocktrackerUserModel,
}[processMode];
