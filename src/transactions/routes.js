const permissionLevels = require('../config.js').permissionLevels;

const DebugMiddleware = require('../middleware/debug.js');
const PermissionMiddleware = require('../middleware/permission.js');
const ValidationMiddleware = require('../middleware/validation.js');

const TransactionController = require('./controller.js');


exports.configRoutes = (app) => {
  /* Transactions endpoints */
  app.get('/api/v1/transactions/get', [
    DebugMiddleware.printRequest,
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    PermissionMiddleware.onlySameUserOrAdminCanDoThisAction,
    TransactionController.getTransactions
  ]);

  app.post('/api/v1/transactions/referralCodes/create', [
    DebugMiddleware.printRequest,
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    ValidationMiddleware.validateMandatoryBodyFields([
      'code', 'percent', 'owner'
    ]),
    TransactionController.createReferralCode
  ]);
  app.get('/api/v1/transactions/referralCodes/get', [
    DebugMiddleware.printRequest,
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    PermissionMiddleware.onlySameUserOrAdminCanDoThisAction,
    TransactionController.getReferralCodes
  ]);
}
