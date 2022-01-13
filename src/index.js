const express = require('express');
const bodyParser = require('body-parser');

const AuthRouter = require('./auth/routes.js');
const UsersRouter = require('./users/routes.js');
const ChallengesRouter = require('./challenges/routes.js');
const TransactionsRouter = require('./transactions/routes.js');
const InventoryRouter = require('./inventory/routes.js');
const LocationsRouter = require('./location/routes.js');
const FriendsRouter = require('./friends/routes.js');

const constantsLib = require('./constants/lib.js');

const { port, processMode } = require('./environment.js');
const { logInfo } = require('./modules/errors.js');

const processModeInitializers = {
 "stocktracker": (app) => {
   AuthRouter.configRoutes(app);
   UsersRouter.configRoutes(app);
   InventoryRouter.configRoutes(app);
 },
 "ambassadorsite": (app) => {
   AuthRouter.configRoutes(app);
   UsersRouter.configRoutes(app);
   ChallengesRouter.configRoutes(app);
   TransactionsRouter.configRoutes(app);
   LocationsRouter.configRoutes(app);
   FriendsRouter.configRoutes(app);
  },
}


function makeServer() {
  const app = express();

  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header(
      'Access-Control-Allow-Headers',
      'Accept, Authorization, Content-Type, X-Requested-With, Range'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    } else {
      return next();
    }
  });

  app.use(bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));

  processModeInitializers[processMode](app);

  let setupPromise = constantsLib.initSiteState();

  app.get('/server-status', [
    (req, res) => res.status(200).send()
  ]);

  let server = app.listen(port, function () {
    logInfo('[+] Server running [', processMode, '] listening at port:', port);
  });

  return [server, setupPromise]
}

module.exports = makeServer;

if (require.main === module) {
  logInfo('[+] Server is in standalone mode.');
  makeServer();
}
