const { permissionLevels } = require('../constants.js');

const PermissionMiddleware = require('../middleware/permission.js');
const ValidationMiddleware = require('../middleware/validation.js');
const ShopifyMiddleware = require('../middleware/shopify.js');

const TransactionController = require('./controller.js');


exports.configRoutes = (app) => {
  /* Transactions endpoints */
  app.get('/api/v1/transactions/user/id/:userId', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    PermissionMiddleware.onlySameUserOrAdminCanDoThisAction(req => req.params.userId),
    TransactionController.getTransactions(req => ({eitherSubject: req.params.userId}))
  ]);
  app.get('/api/v1/transactions/referralCode/id/:referralCodeId', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    TransactionController.getTransactions(req => ({referralCodeId: req.params.referralCodeId}))
  ]);
  app.get('/api/v1/transactions/id/:transactionId', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    TransactionController.getTransactions(req => ({transactionId: req.params.transactionId}))
  ]);
  app.get('/api/v1/transactions/all', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    TransactionController.getTransactions(() => ({}))
  ]);
  app.post('/api/v1/transactions/admin/create', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    ValidationMiddleware.validateMandatoryBodyFields([
      'amount', 'user', 'reason'
    ]),
    TransactionController.createAdminTransaction
  ]);
  app.post('/api/v1/transactions/admin/recalculateBalance', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    ValidationMiddleware.validateMandatoryBodyFields(['userId']),
    TransactionController.recalculateUserBalance
  ]);
  app.post('/api/v1/referralCodes/create', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    ValidationMiddleware.validateMandatoryBodyFields([
      'code', 'percent', 'owner'
    ]),
    TransactionController.createReferralCode
  ]);
  app.post('/api/v1/referralCodes/usage/create', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    ValidationMiddleware.validateMandatoryBodyFields([
      'code', 'total', 'orderNumber'
    ]),
    TransactionController.createReferralCodeUsage
  ]);
  app.get('/api/v1/referralCodes/user/id/:userId', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    PermissionMiddleware.onlySameUserOrAdminCanDoThisAction(req => req.params.userId),
    TransactionController.getReferralCodes(req => ({owner: req.params.userId}))
  ]);
  app.get('/api/v1/referralCodes/id/:referralCodeId', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.AMBASSADOR),
    TransactionController.getReferralCodes(req => ({_id: req.params.referralCodeId}))
  ]);
  app.get('/api/v1/referralCodes/all', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    TransactionController.getAllReferralCodes
  ]);
  app.get('/api/v1/referralCodes/options', [
    ValidationMiddleware.validJWTNeeded,
    PermissionMiddleware.minimumPermissionLevelRequired(permissionLevels.ADMIN),
    TransactionController.getReferralCodeOptions
  ]);
  app.post('/shopifyAPI/v1/referralCodes/usage', [
    ShopifyMiddleware.validShopifyHmac,
    (req, res, next) => {
      if(!req.body.discount_codes.length) return res.status(200).send();
      next();
    },
    ShopifyMiddleware.reformatBody({
      codeName: i => i.discount_codes.length ? i.discount_codes[0].code : undefined,
      total: i => i.total_price,
      orderNumber: i => i.order_number,
      allowUnknownCode: () => true,
    }),
    ValidationMiddleware.validateMandatoryBodyFields([
      'codeName', 'total', 'orderNumber'
    ]),
    TransactionController.createReferralCodeUsage
  ])
}
