/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Localized, useLocalization } from '@fluent/react';
import React, { useState } from 'react';
import LogoLockup from 'fxa-react/components/LogoLockup';
import Header from 'fxa-react/components/Header';
import LinkExternal from 'fxa-react/components/LinkExternal';
import BentoMenu from '../BentoMenu';
import DropDownAvatarMenu from '../DropDownAvatarMenu';
import { ReactComponent as Help } from './help.svg';
import { ReactComponent as Menu } from './menu.svg';
import { ReactComponent as Close } from './close.svg';
import Nav from '../Nav';

export const HeaderLockup = () => {
  const [navRevealedState, setNavState] = useState(false);
  const { l10n } = useLocalization();
  const localizedHelpText = l10n.getString('header-help', null, 'Help');
  const localizedMenuText = navRevealedState
    ? l10n.getString('header-menu-open', null, 'Close menu')
    : l10n.getString('header-menu-closed', null, 'Site navigation menu');

  const left = (
    <>
      <button
        className="desktop:hidden ltr:mr-6 rtl:ml-6 w-8 h-6 self-center"
        data-testid="header-menu"
        aria-label={localizedMenuText}
        title={localizedMenuText}
        aria-haspopup={true}
        aria-expanded={navRevealedState}
        onClick={() => setNavState(!navRevealedState)}
      >
        {navRevealedState ? <Close /> : <Menu />}
        {navRevealedState && <Nav />}
      </button>
      <Localized id="header-back-to-top-link" attrs={{ title: true }}>
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a
          href="#"
          title="Back to top"
          className="flex"
          data-testid="back-to-top"
        >
          <LogoLockup>
            <>
              <Localized id="header-title">
                <span className="font-bold ltr:mr-2 rtl:ml-2">
                  Firefox Account
                </span>
              </Localized>
            </>
          </LogoLockup>
        </a>
      </Localized>
    </>
  );
  const right = (
    <>
      <div className="rounded border-transparent hover:bg-grey-200 p-1">
        <LinkExternal
          href="https://support.mozilla.org"
          title={localizedHelpText}
          data-testid="header-sumo-link"
        >
          <Help
            aria-label={localizedHelpText}
            title={localizedHelpText}
            role="img"
            className="w-5"
            data-testid="header-help"
          />
        </LinkExternal>
      </div>
      <BentoMenu />
      <DropDownAvatarMenu />
    </>
  );

  return <Header {...{ left, right }} />;
};

export default HeaderLockup;
