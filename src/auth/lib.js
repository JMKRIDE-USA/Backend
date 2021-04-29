const crypto = require('crypto');

const emailModule = require('../modules/email.js');
const userModel = require('../users/model.js');
const userLib = require('../users/lib.js');
const authModel = require('./model.js');

const { logError } = require('../modules/errors.js');

const tokenIsValid = (token, tokenType) => {
  if(token.expiration < Date.now()) {
    logError("[!][tokenIsValid] Token Expired");
    return false;
  }
  if(token.type !== tokenType) {
    logError(
      "[!][tokenIsValid] Token Type Invalid: "
      + token.type + " vs. " + tokenType
    );
    return false;
  }
  return true;
}

const validatePassword = (userId, password) =>
  userModel.findById(userId).then(user => {
    if(!user){
      logError("[!][validatePassword] Failed to find user.");
      return false
    } 
    let passwordFields = user.password.split('$');
    let salt = passwordFields[0];
    let hash = crypto.createHmac('sha512', salt).update(password).digest("base64");
    if (hash === passwordFields[1]) {
      return true;
    } else {
      logError(
        "[!][validatePassword] Hash and PW didn't match:",
        password,
        hash,
        "[redacted]",
      );
      return false;
    }
  })
     

/*
 * resetPasswordWithPassword - self-explanatory
 */
exports.resetPasswordWithPassword = ({userId, oldPassword, newPassword}) => 
  validatePassword(userId, oldPassword).then(
    valid => {
      if(valid && newPassword) {
        console.log("Success. Updating!");
        return userLib.updatePassword(
          userId,
          newPassword,
        ).then(authModel.deleteToken({userId: userId, type: "PASSWORD_RESET"}))
      } else {
        throw new Error("[!][resetPasswordWithPasswrd] Incorrect Password");
      }
    }
  );

const validatePasswordResetToken = (tokenKey, userId) => 
  userModel.findById(userId, {populatePasswordResetToken: true})
  .then(user => (
      user.passwordResetToken 
      && tokenIsValid(user.passwordResetToken, "PASSWORD_RESET")
      && user.passwordResetToken.key === tokenKey
    )
  );

/*
 * resetPasswordWithToken - requires valid passwordResetToken
 */
exports.resetPasswordWithToken = (tokenKey, userId, newPassword) => 
  validatePasswordResetToken(tokenKey, userId).then(
    valid => {
      if(valid && newPassword) {
        return userLib.updatePassword(
          userId,
          newPassword,
        ).then(authModel.deleteToken({userId: userId, type: "PASSWORD_RESET"}))
      } else {
        throw new Error("[!][resetPassword] Invalid Token");
      }
    })


/*
 * verifyEmail - requires valid emailVerificationToken
 */
exports.verifyEmailToken = async (tokenKey, userId) => {
  const token = await authModel.findTokenByKey(tokenKey);
  if(token && tokenIsValid(token, "EMAIL_VERIFICATION")) {
    if(token.owner.toString() === userId) {
      return userModel.patchUser(userId, {emailVerified: true})
        .then(authModel.deleteToken({id: token._id}))
    } else {
      throw new Error(
        "[!][verifyEmailToken] Token owner does not match" + 
        token.owner + " vs. " + userId
      )
    }
  } else {
    throw new Error("[!][verifyEmailToken] Token is missing or invalid")
  }
}

const createEmailVerificationToken = ({userId}) => 
  authModel.createToken({
    owner: userId,
    expiration: new Date(new Date().getTime()+(4*24*3600*1000)), // four days time
    key: crypto.randomBytes(50).toString('hex'),
    type: "EMAIL_VERIFICATION",
  })

exports.createAndSendEmailVerificationToken = async ({userId}) => {
  const user = await userModel.findById(userId, {populateEmailVerificationToken: true});
  createEmailVerificationToken({userId: userId}).then(
    token => emailModule.sendEmailVerificationEmail(
      {email: user.email, tokenKey: token.key}
    )
  );
}
