const mongoose = require('../modules/mongoose.js');
const Schema = mongoose.Schema;

const { permissionLevels } = require('../constants.js');
const { processMode } = require('../environment.js');


/* ------------------------- Generics ------------------------------- */

const baseSchema = {
  firstName: String,
  lastName: String,
  email: {type: String, unique: true},
  password: String,  // Salted + SHA512 hashed
  permissionLevel: { type: String, enum: Object.values(permissionLevels) },
}

const addSchemaGenerics = (schema) => {
  schema.virtual('fullName').get(function () {
    return this.firstName + " " + this.lastName;
  });
  schema.set('toJSON', {virtuals: true});
  schema.set('toObject', {virtuals: true});
}


/* ------------------------ AmbassadorSite -------------------------- */

const genAmbassadorUserSchema = () => {
  const ambassadorUserSchema = new Schema({
    ...baseSchema,
    ...{
      balance: Number,
      emailVerified: {type: Boolean, default: false},
    },
  }, {timestamps: true});
  ambassadorUserSchema.virtual('submissionCount', {
    ref: 'challengeSubmission',
    localField: '_id',
    foreignField: 'author',
    count: true,
  });
  ambassadorUserSchema.virtual('referralCode', {
    ref: 'referralCode',
    localField: '_id',
    foreignField: 'owner',
    justOne: 'true',
  });
  addSchemaGenerics(ambassadorUserSchema);

  ambassadorUserSchema.virtual('fullName').get(function () {
    return this.firstName + " " + this.lastName;
  });
  ambassadorUserSchema.set('toJSON', {virtuals: true});
  ambassadorUserSchema.set('toObject', {virtuals: true});

  return mongoose.model('user', ambassadorUserSchema);
};


/* ------------------------ StockTracker -------------------------- */

const genStocktrackerUserSchema = () => {
  const stocktrackerUserSchema = new Schema({
    ...baseSchema,
    ...{},
  }, {timestamps: true});
  addSchemaGenerics(stocktrackerUserSchema);

  return mongoose.model('user', stocktrackerUserSchema);
};


/* ------------------------ Exports -------------------------- */

module.exports = {
  ambassadorsite: genAmbassadorUserSchema,
  stocktracker: genStocktrackerUserSchema,
}[processMode]();