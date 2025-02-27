/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const RECOVERY_KEY_DOCS =
  require('../../docs/swagger/recovery-key-api').default;
const DESCRIPTION = require('../../docs/swagger/shared/descriptions').default;

const errors = require('../error');
const { recordSecurityEvent } = require('./utils/security-event');
const validators = require('./validators');
const isA = require('joi');

module.exports = (log, db, Password, verifierVersion, customs, mailer) => {
  return [
    {
      method: 'POST',
      path: '/recoveryKey',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_POST,
        auth: {
          strategy: 'sessionToken',
          payload: 'required',
        },
        validate: {
          payload: isA.object({
            recoveryKeyId: validators.recoveryKeyId.description(
              DESCRIPTION.recoveryKeyId
            ),
            recoveryData: validators.recoveryData.description(
              DESCRIPTION.recoveryData
            ),
            enabled: isA.boolean().default(true),
          }),
        },
      },
      handler: async function (request) {
        log.begin('createRecoveryKey', request);

        const sessionToken = request.auth.credentials;

        if (sessionToken.tokenVerificationId) {
          throw errors.unverifiedSession();
        }

        const { uid } = sessionToken;
        const { recoveryKeyId, recoveryData, enabled } = request.payload;

        // Users that already have an enabled account recovery key can not
        // create a second account recovery key
        try {
          await db.createRecoveryKey(uid, recoveryKeyId, recoveryData, enabled);
        } catch (err) {
          if (err.errno !== errors.ERRNO.RECOVERY_KEY_EXISTS) {
            throw err;
          }

          // `recoveryKeyExists` will return true if and only if there is an enabled recovery
          // key. In other scenarios a user started creating one but never completed the enable
          // process.
          const result = await db.recoveryKeyExists(uid);
          if (result.exists) {
            throw err;
          }

          await db.deleteRecoveryKey(uid);
          await db.createRecoveryKey(uid, recoveryKeyId, recoveryData, enabled);
        }

        log.info('account.recoveryKey.created', { uid });

        if (enabled) {
          await request.emitMetricsEvent('recoveryKey.created', { uid });

          const account = await db.account(uid);

          const { acceptLanguage, clientAddress: ip, geo, ua } = request.app;
          const emailOptions = {
            acceptLanguage,
            ip,
            location: geo.location,
            timeZone: geo.timeZone,
            uaBrowser: ua.browser,
            uaBrowserVersion: ua.browserVersion,
            uaOS: ua.os,
            uaOSVersion: ua.osVersion,
            uaDeviceType: ua.deviceType,
            uid,
          };

          await mailer.sendPostAddAccountRecoveryEmail(
            account.emails,
            account,
            emailOptions
          );
        }

        recordSecurityEvent('account.recovery_key_added', {
          db,
          request,
          account: { uid },
        });

        return {};
      },
    },
    {
      method: 'POST',
      path: '/recoveryKey/verify',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_VERIFY_POST,
        auth: {
          strategy: 'sessionToken',
          payload: 'required',
        },
        validate: {
          payload: {
            recoveryKeyId: validators.recoveryKeyId,
          },
        },
      },
      handler: async function (request) {
        log.begin('verifyRecoveryKey', request);

        const sessionToken = request.auth.credentials;
        const { uid } = sessionToken;

        try {
          if (sessionToken.tokenVerificationId) {
            throw errors.unverifiedSession();
          }

          // This route can let you check if a key is valid therefore we
          // rate limit it.
          await customs.checkAuthenticated(request, uid, 'getRecoveryKey');

          const { recoveryKeyId } = request.payload;

          // Attempt to retrieve an account recovery key, if it exists and is not already enabled,
          // then we enable it.
          const recoveryKeyData = await db.getRecoveryKey(uid, recoveryKeyId);

          if (!recoveryKeyData.enabled) {
            await db.updateRecoveryKey(uid, recoveryKeyId, true);

            await request.emitMetricsEvent('recoveryKey.created', { uid });

            const account = await db.account(uid);
            const { acceptLanguage, clientAddress: ip, geo, ua } = request.app;
            const emailOptions = {
              acceptLanguage,
              ip,
              location: geo.location,
              timeZone: geo.timeZone,
              uaBrowser: ua.browser,
              uaBrowserVersion: ua.browserVersion,
              uaOS: ua.os,
              uaOSVersion: ua.osVersion,
              uaDeviceType: ua.deviceType,
              uid,
            };

            await mailer.sendPostAddAccountRecoveryEmail(
              account.emails,
              account,
              emailOptions
            );
          }
          recordSecurityEvent('account.recovery_key_challenge_success', {
            db,
            request,
            account: { uid },
          });
        } catch (err) {
          recordSecurityEvent('account.recovery_key_challenge_failure', {
            db,
            request,
            account: { uid },
          });
          throw err;
        }

        return {};
      },
    },
    {
      method: 'GET',
      path: '/recoveryKey/{recoveryKeyId}',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_RECOVERYKEYID_GET,
        auth: {
          strategy: 'accountResetToken',
        },
        validate: {
          params: isA.object({
            recoveryKeyId: validators.recoveryKeyId,
          }),
        },
      },
      handler: async function (request) {
        log.begin('getRecoveryKey', request);

        const { uid } = request.auth.credentials;
        const { recoveryKeyId } = request.params;

        await customs.checkAuthenticated(request, uid, 'getRecoveryKey');

        const { recoveryData } = await db.getRecoveryKey(uid, recoveryKeyId);

        return { recoveryData };
      },
    },
    {
      method: 'POST',
      path: '/recoveryKey/exists',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_EXISTS_POST,
        auth: {
          mode: 'optional',
          strategy: 'sessionToken',
        },
        validate: {
          payload: isA.object({
            email: validators.email().optional(),
          }),
        },
        response: {
          schema: isA.object({
            exists: isA.boolean().required(),
          }),
        },
      },
      async handler(request) {
        log.begin('recoveryKeyExists', request);

        const { email } = request.payload;

        let uid;
        if (request.auth.credentials) {
          uid = request.auth.credentials.uid;
        }

        if (!uid) {
          // If not using a sessionToken, an email is required to check
          // for an account recovery key. This occurs when checking from the
          // password reset page and allows us to redirect the user to either
          // the regular password reset or account recovery password reset.
          if (!email) {
            throw errors.missingRequestParameter('email');
          }

          await customs.check(request, email, 'recoveryKeyExists');
          ({ uid } = await db.accountRecord(email));
        }

        // When checking from `/settings` a sessionToken is required and the
        // request is not rate limited.
        return db.recoveryKeyExists(uid);
      },
    },
    // TODO : Refactor API method to use POST and pass email as payload instead of query param in FXA-7400
    {
      method: 'GET',
      path: '/recoveryKey/hint',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_HINT_GET,
        auth: {
          mode: 'optional',
          strategy: 'sessionToken',
        },
        validate: {
          query: {
            email: validators.email().optional(),
          },
        },
      },
      handler: async function (request) {
        log.begin('getRecoveryKeyHint', request);

        const { email } = request.query;

        let uid;
        if (request.auth.credentials) {
          uid = request.auth.credentials.uid;
        }

        if (!uid) {
          // If not using a sessionToken, an email is required to check
          // for an account recovery key.
          if (!email) {
            throw errors.missingRequestParameter('email');
          }

          // When this request is unauthenticated, we rate-limit
          await customs.check(request, email, 'recoveryKeyExists');
          try {
            const result = await db.accountRecord(email);
            uid = result.uid;
          } catch (err) {
            throw errors.unknownAccount();
          }
        }

        const result = await db.recoveryKeyExists(uid);
        if (!result.exists) {
          throw errors.recoveryKeyNotFound();
        }

        const hint = await db.getRecoveryKeyHint(uid);

        return hint;
      },
    },
    {
      method: 'POST',
      path: '/recoveryKey/hint',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_HINT_POST,
        auth: {
          // hint update is only possible when authenticated
          // from /settings or (eventually) after signup, signin or successful password reset
          strategy: 'sessionToken',
        },
        validate: {
          payload: isA.object({
            hint: validators.recoveryKeyHint.description(
              DESCRIPTION.recoveryKeyHint
            ),
          }),
        },
      },
      handler: async function (request) {
        log.begin('updateRecoveryKeyHint', request);

        const { uid, tokenVerificationId } = request.auth.credentials;

        const { hint } = request.payload;

        if (tokenVerificationId) {
          throw errors.unverifiedSession();
        }

        const keyForUid = await db.recoveryKeyExists(uid);

        if (!keyForUid.exists) {
          throw errors.recoveryKeyNotFound();
        }

        await db.updateRecoveryKeyHint(uid, hint);

        return {};
      },
    },
    {
      method: 'DELETE',
      path: '/recoveryKey',
      options: {
        ...RECOVERY_KEY_DOCS.RECOVERYKEY_DELETE,
        auth: {
          strategy: 'sessionToken',
        },
      },
      async handler(request) {
        log.begin('recoveryKeyDelete', request);

        const { tokenVerificationId, uid } = request.auth.credentials;

        if (tokenVerificationId) {
          throw errors.unverifiedSession();
        }

        await db.deleteRecoveryKey(uid);
        recordSecurityEvent('account.recovery_key_removed', { db, request });

        const account = await db.account(uid);

        const { acceptLanguage, clientAddress: ip, geo, ua } = request.app;
        const emailOptions = {
          acceptLanguage,
          ip,
          location: geo.location,
          timeZone: geo.timeZone,
          uaBrowser: ua.browser,
          uaBrowserVersion: ua.browserVersion,
          uaOS: ua.os,
          uaOSVersion: ua.osVersion,
          uaDeviceType: ua.deviceType,
          uid,
        };

        await mailer.sendPostRemoveAccountRecoveryEmail(
          account.emails,
          account,
          emailOptions
        );

        return {};
      },
    },
  ];
};
