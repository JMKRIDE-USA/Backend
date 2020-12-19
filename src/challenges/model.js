const mongoose = require('../modules/mongoose.js');
const Schema = mongoose.Schema;


/* ------------------- Model Definitions ------------------  */


const FIELD_TYPES = [
  "NUMBER",                                 // Number
  "DATE",                                   // String - iso format
  "SWITCH",                                 // [String] - each selectable choice
  "LEGAL_CHECK",                            // Boolean - has been checked
  "YES_NO",                                 // Boolean - but displayed differently than check
  "EMAIL",                                  // String - with validation
  "TEXT_SHORT", "TEXT_MEDIUM", "TEXT_LONG", // String
];
const challengeFormFieldSchema = new Schema({
  title: String,
  fieldType: {type: String, enum: FIELD_TYPES},
});
const ChallengeFormField = mongoose.model(
  'challengeFormField',
  challengeFormFieldSchema,
);

const challengeSchema = new Schema({
  title: String,
  shortDescription: String,
  longDescription: String,
  award: Number,
  creator: {type: Schema.Types.ObjectId, ref: 'user'},
  structure: [challengeFormFieldSchema],
});
const Challenge = mongoose.model('challenge', challengeSchema);


const challengeSubmissionFormFieldSchema = new Schema({
  field: {type: Schema.Types.ObjectId, ref: 'challengeFormField'},
  content: {type: Schema.Types.Mixed}
});
const ChallengeSubmissionFormField = mongoose.model(
  'challengeSubmissionFormField',
  challengeSubmissionFormFieldSchema,
);

const SUBMISSION_STATUS = ["SUBMITTED", "APPROVED", "DENIED"];
const challengeSubmissionSchema = new Schema({
  author: {type: Schema.Types.ObjectId, ref: 'user'},
  challenge: {type: Schema.Types.ObjectId, ref: 'challenge'},
  content: [challengeSubmissionFormFieldSchema],
  status: {type: String, enum: SUBMISSION_STATUS},
  note: String, // If rejected, why? If accepted, a "good job" or something
})
const ChallengeSubmission = mongoose.model(
  'challengeSubmission',
  challengeSubmissionSchema,
);


/* ------------------- Model Functions ------------------  */

exports.createChallenge = (challengeData) => {
  const challenge = new Challenge(challengeData);
  return challenge.save();
}

exports.updateChallengeById = (id, challengeData) => {
  return Challenge.findOneAndUpdate(
    {
      _id: id,
    },
    challengeData,
    {new: true},
  );
}

exports.deleteChallengeById = (id) => {
  return Challenge.deleteOne({_id: id});
}

exports.getChallenge = ({ challengeId }) => {
  return Challenge.findById(challengeId);
};

exports.createSubmission = (challengeSubmissionData) => {
  const submission = new ChallengeSubmission(challengeSubmissionData);
  return submission.save();
}

exports.getSubmission = ({ challengeId, userId }) => {
  return ChallengeSubmission.find({
    author: userId,
    challenge: challengeId,
  })
}

exports.listChallenges = (perPage, page, { excludeChallenges = [] }) => {
  return new Promise((resolve, reject) => {
    Challenge.find({_id: {$nin: excludeChallenges}})
      .limit(perPage)
      .skip(perPage * page)
      .exec(function (err, challenges) {
        if (err) {
          reject(err);
        } else {
          resolve(challenges);
        }
      })
  });
}
