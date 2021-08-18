const constantModel = require('../constants/model.js');
const adminSecret = require('../environment.js').adminSecret;

exports.defaultStocktrackerUserSettings = {
  partTypeCategories: {},
  auxiliaryParts: [],
  withdrawAuxiliaryParts: true,
  debug: false,
};

exports.getAdminUser = () => {
  return constantModel.getByName('adminUser');
};

exports.adminUserData = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@admin.com',
  password: adminSecret,
}

exports.testNobodyData = {
  firstName: 'Test',
  lastName: 'None',
  email: 'none@test.com',
  password: adminSecret,
}

exports.testUserData = {
  firstName: 'Test',
  lastName: 'User',
  email: 'user@test.com',
  password: adminSecret,
}

exports.testAmbassadorData = {
  firstName: 'Test',
  lastName: 'Ambassador',
  email: 'ambassador@test.com',
  password: adminSecret,
}
