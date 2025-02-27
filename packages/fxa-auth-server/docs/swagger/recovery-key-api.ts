/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import dedent from 'dedent';
import TAGS from './swagger-tags';

const TAGS_RECOVERY_KEY = {
  tags: TAGS.RECOVERY_KEY,
};

const RECOVERYKEY_POST = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey',
  notes: [
    dedent`
      🔒 Authenticated with session token

      Creates a new account recovery key for a user. Account recovery keys are one-time-use tokens that can be used to recover the user's kB if they forget their password. For more details, see the [account recovery keys](https://github.com/mozilla/fxa/blob/main/packages/fxa-auth-server/docs/recovery_keys.md) docs.
    `,
  ],
};

const RECOVERYKEY_RECOVERYKEYID_GET = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey/{recoveryKeyId}',
  notes: [
    '🔒 Authenticated with account reset token',
    'Retrieve the account recovery data associated with the given account recovery key.',
  ],
};

const RECOVERYKEY_EXISTS_POST = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey/exists',
  notes: [
    '🔒🔓 Optionally authenticated with session token',
    'This route checks to see if given user has setup an account recovery key. When used during the password reset flow, an email can be provided (instead of a sessionToken) to check for the status. However, when using an email, the request is rate limited.',
  ],
};

const RECOVERYKEY_DELETE = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey',
  notes: [
    '🔒 Authenticated with session token',
    "This route remove an account's account recovery key. When the key is removed, it can no longer be used to restore an account's kB.",
  ],
};

const RECOVERYKEY_VERIFY_POST = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey/verify',
  notes: ['🔒 Authenticated with session token'],
};

// TODO: Update to POST in FXA-7400
const RECOVERYKEY_HINT_GET = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey/hint',
  notes: [
    '🔒🔓 Optionally authenticated with session token',
    'Retrieves the hint (if any) for a userʼs recovery key.',
  ],
};

const RECOVERYKEY_HINT_POST = {
  ...TAGS_RECOVERY_KEY,
  description: '/recoveryKey/hint',
  notes: [
    '🔒 Authenticated with session token',
    'This route updates the hint associated with a userʼs recovery key.',
  ],
};

const API_DOCS = {
  RECOVERYKEY_DELETE,
  RECOVERYKEY_EXISTS_POST,
  RECOVERYKEY_POST,
  RECOVERYKEY_RECOVERYKEYID_GET,
  RECOVERYKEY_VERIFY_POST,
  RECOVERYKEY_HINT_GET,
  RECOVERYKEY_HINT_POST,
};

export default API_DOCS;
