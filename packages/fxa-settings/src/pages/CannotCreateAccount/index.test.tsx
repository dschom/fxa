/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { usePageViewEvent } from '../../lib/metrics';
import CannotCreateAccount, { viewName } from '.';
import { getFtlBundle, testAllL10n } from 'fxa-react/lib/test-utils';
import { FluentBundle } from '@fluent/bundle';
import { REACT_ENTRYPOINT } from '../../constants';

jest.mock('../../lib/metrics', () => ({
  usePageViewEvent: jest.fn(),
}));

describe('CannotCreateAccount', () => {
  let bundle: FluentBundle;
  beforeAll(async () => {
    bundle = await getFtlBundle('settings');
  });

  it('renders as expected', () => {
    render(<CannotCreateAccount />);
    testAllL10n(screen, bundle);

    expect(usePageViewEvent).toHaveBeenCalledWith(viewName, REACT_ENTRYPOINT);

    screen.getByRole('heading', {
      name: 'Cannot create account',
    });
    screen.getByText(
      'You must meet certain age requirements to create a Firefox account.'
    );
    expect(screen.getByRole('link', { name: /Learn more/ })).toHaveAttribute(
      'href',
      'https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy'
    );
  });
});
