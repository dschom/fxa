/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useState } from 'react';
import { RouteComponentProps, useNavigate } from '@reach/router';
import { FtlMsg } from 'fxa-react/lib/utils';
import { logViewEvent } from '../../../lib/metrics';
import Ready from '../../../components/Ready';
import { REACT_ENTRYPOINT } from '../../../constants';
import AppLayout from '../../../components/AppLayout';
import { CreateRelier, useFtlMsgResolver } from '../../../models';

type ResetPasswordWithRecoveryKeyVerifiedProps = {
  isSignedIn: boolean;
};

export const viewName = 'reset-password-with-recovery-key-verified';

// TODO: FXA-6805
// This page does not currently perform a check to verify that the password has indeed been reset.
// It is possible to directly hit this route when no password reset has been initiated/completed,
// even when the user is not signed in.

const ResetPasswordWithRecoveryKeyVerified = ({
  isSignedIn,
}: ResetPasswordWithRecoveryKeyVerifiedProps & RouteComponentProps) => {
  const navigate = useNavigate();
  const relier = CreateRelier();
  const serviceName = relier.getServiceName();

  const ftlMsgResolver = useFtlMsgResolver();

  const localizedPageTitle = ftlMsgResolver.getMsg(
    'reset-password-with-recovery-key-verified-page-title',
    'Password reset successful'
  );

  const goToGenerateNewKey = () => {
    const eventName = `generate-new-key`;
    logViewEvent(`flow.${viewName}`, eventName, REACT_ENTRYPOINT);
    navigate('/settings/account_recovery', { replace: true });
  };

  const goToAccountSettings = () => {
    const eventName = `continue-to-account`;
    logViewEvent(`flow.${viewName}`, eventName, REACT_ENTRYPOINT);
    navigate('/settings', { replace: true });
  };

  const [isSync, setIsSync] = useState<boolean>();
  useEffect(() => {
    (async () => {
      setIsSync(await relier.isSync());
    })();
  });

  return (
    <AppLayout title={localizedPageTitle}>
      <Ready {...{ viewName, serviceName, isSync, isSignedIn }} />
      <div className="flex justify-center mx-auto m-6">
        <button className="cta-primary cta-xl" onClick={goToGenerateNewKey}>
          <FtlMsg id="reset-password-with-recovery-key-verified-generate-new-key">
            Generate a new account recovery key
          </FtlMsg>
        </button>
      </div>
      <button className="link-blue text-sm" onClick={goToAccountSettings}>
        <FtlMsg id="reset-password-with-recovery-key-verified-continue-to-account">
          Continue to my account
        </FtlMsg>
      </button>
    </AppLayout>
  );
};

export default ResetPasswordWithRecoveryKeyVerified;
