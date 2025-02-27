/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { EmailHeader, EmailType } from '../lib/email';
import { BaseLayout } from './layout';
import { getCode } from 'fxa-settings/src/lib/totp';
import AuthClient from 'fxa-auth-client';

export const selectors = {
  AGE: '#age',
  FIREFOX_HEADER: '[data-testid=logo]',
  EMAIL: 'input[type=email]',
  EMAIL_PREFILLED: '#prefillEmail',
  EMAIL_HEADER: '#fxa-enter-email-header',
  ERROR: '.error',
  LINK_LOST_RECOVERY_KEY: 'a.lost-recovery-key',
  LINK_RESET_PASSWORD: 'a[href^="/reset_password"]',
  LINK_USE_DIFFERENT: '#use-different',
  LINK_USE_RECOVERY_CODE: '#use-recovery-code-link',
  NUMBER_INPUT: 'input[type=number]',
  PASSWORD: '#password',
  PASSWORD_HEADER: '#fxa-signin-password-header',
  PERMISSIONS_HEADER: '#fxa-permissions-header',
  PASSWORD_MASK_INPUT: '#password[type=password]',
  PASSWORD_TEXT_INPUT: '#password[type=text]',
  SHOW_PASSWORD: '#password ~ [for="show-password"]',
  RESET_PASSWORD_EXPIRED_HEADER: '#fxa-reset-link-expired-header',
  RESET_PASSWORD_HEADER: '#fxa-reset-password-header',
  SIGN_UP_CODE_HEADER: '#fxa-confirm-signup-code-header',
  SIGN_IN_CODE_HEADER: '#fxa-signin-code-header',
  CONFIRM_EMAIL: '.email',
  SIGNIN_HEADER: '#fxa-signin-header',
  SIGNIN_UNBLOCK_HEADER: '#fxa-signin-unblock-header',
  SIGNIN_UNBLOCK_VERIFICATION: '.verification-email-message',
  COPPA_HEADER: '#fxa-cannot-create-account-header',
  SUBMIT: 'button[type=submit]',
  SUBMIT_USER_SIGNED_IN: '#use-logged-in',
  RECOVERY_KEY_TEXT_INPUT: 'input[type=text]',
  TOOLTIP: '.tooltip',
  VPASSWORD: '#vpassword',
  SYNC_CONNECTED_HEADER: '#fxa-connected-heading',
  NOTES_HEADER: '#notes-by-firefox',
  MIN_LENGTH_MET: '#password-too-short.password-strength-met',
  MIN_LENGTH_FAIL: '#password-too-short.password-strength-fail',
  NOT_COMMON_FAIL: '#password-too-common.password-strength-fail',
  NOT_COMMON_UNMET: '#password-too-common.password-strength-unmet',
  NOT_COMMON_MET: '#password-too-common.password-strength-met',
  NOT_EMAIL_UNMET: '#password-same-as-email.password-strength-unmet',
  NOT_EMAIL_MET: '#password-same-as-email.password-strength-met',
  NOT_EMAIL_FAIL: '#password-same-as-email.password-strength-fail',
  PERMISSION_ACCEPT: '#accept',
  CWTS_HEADER: 'text="Choose what to sync"',
  CWTS_ENGINE_BOOKMARKS: '#sync-engine-bookmarks',
  CWTS_ENGINE_HISTORY: '#sync-engine-history',
};

type FirstSignUpOptions = {
  verify?: boolean;
  enterEmail?: boolean;
  waitForNavOnSubmit?: boolean;
};

export class LoginPage extends BaseLayout {
  readonly path = '';

  get emailHeader() {
    return this.page.locator(selectors.EMAIL_HEADER);
  }

  async getFxaClient(target) {
    const AUTH_SERVER_ROOT = target.authServerUrl;
    return new AuthClient(AUTH_SERVER_ROOT);
  }

  get passwordHeader() {
    return this.page.locator(selectors.PASSWORD_HEADER);
  }

  get tooltip() {
    return this.page.locator(selectors.TOOLTIP);
  }

  get submitButton() {
    return this.page.locator(selectors.SUBMIT);
  }

  async getUnblockEmail() {
    return this.page.locator(selectors.SIGNIN_UNBLOCK_VERIFICATION).innerText();
  }

  async fillOutEmailFirstSignIn(email, password) {
    await this.setEmail(email);
    await this.submit();
    await this.setPassword(password);
    await this.submit();
  }

  async login(
    email: string,
    password: string,
    recoveryCode?: string,
    waitForNavOnSubmit = true
  ) {
    // When running tests in parallel, playwright shares the storage state,
    // so we might not always be at the email first screen.
    if (await this.isCachedLogin()) {
      // User is already signed in and attempting to sign in to another service,
      // we show a `Continue` button, and they don't have to re-enter password
      return this.submit();
    } else if (await this.isSigninHeader()) {
      // The user has specified an email address in url or this service
      // requires them to set a password to login (ie Sync)
      await this.setPassword(password);
    } else {
      // The email first flow, where user enters email and we take them to
      // the signin page
      await this.setEmail(email);
      await this.submit();
      await this.setPassword(password);
    }

    await this.submit(waitForNavOnSubmit);
    if (recoveryCode) {
      await this.clickUseRecoveryCode();
      await this.setCode(recoveryCode);
      await this.submit();
    }
  }

  async minLengthFailError() {
    const error = this.page.locator(selectors.MIN_LENGTH_FAIL);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async minLengthSuccess() {
    const error = this.page.locator(selectors.MIN_LENGTH_MET);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async notEmailUnmetError() {
    const error = this.page.locator(selectors.NOT_EMAIL_UNMET);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async notEmailFailError() {
    const error = this.page.locator(selectors.NOT_EMAIL_FAIL);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async notEmailSuccess() {
    const error = this.page.locator(selectors.NOT_EMAIL_MET);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async notCommonPasswordUnmetError() {
    const error = this.page.locator(selectors.NOT_COMMON_UNMET);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async notCommonPasswordSuccess() {
    const error = this.page.locator(selectors.NOT_COMMON_MET);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async notCommonPasswordFailError() {
    const error = this.page.locator(selectors.NOT_COMMON_FAIL);
    await error.waitFor({ state: 'visible' });
    return error.isVisible();
  }

  async fillOutFirstSignUp(
    email: string,
    password: string,
    {
      verify = true,
      enterEmail = true,
      waitForNavOnSubmit = true,
    }: FirstSignUpOptions = {}
  ) {
    if (enterEmail) {
      await this.setEmail(email);
      await this.submit();
    }
    await this.page.fill(selectors.PASSWORD, password);
    await this.page.fill(selectors.VPASSWORD, password);
    await this.page.fill(selectors.AGE, '24');
    await this.submit();
    if (verify) {
      await this.fillOutSignUpCode(email, waitForNavOnSubmit);
    }
  }

  async fillOutSignUpCode(email: string, waitForNavOnSubmit = true) {
    const code = await this.target.email.waitForEmail(
      email,
      EmailType.verifyShortCode,
      EmailHeader.shortCode
    );
    await this.setCode(code);
    await this.submit(waitForNavOnSubmit);
  }

  async fillOutSignInCode(email: string) {
    const code = await this.target.email.waitForEmail(
      email,
      EmailType.verifyLoginCode,
      EmailHeader.signinCode
    );
    await this.setCode(code);
    await this.submit();
  }

  async isEmailHeader() {
    return this.page.locator(selectors.EMAIL_HEADER).isVisible();
  }

  async cannotCreateAccountHeader() {
    return this.page.locator(selectors.COPPA_HEADER).isVisible();
  }

  async isSignUpCodeHeader() {
    const header = this.page.locator(selectors.SIGN_UP_CODE_HEADER);
    await header.waitFor({ state: 'visible' });
    return header.isVisible();
  }

  async isSignInCodeHeader() {
    const header = this.page.locator(selectors.SIGN_IN_CODE_HEADER);
    await header.waitFor({ state: 'visible' });
    return header.isVisible();
  }

  async confirmEmail() {
    return this.page.innerText(selectors.CONFIRM_EMAIL);
  }

  setEmail(email: string) {
    return this.page.fill(selectors.EMAIL, email);
  }

  setPassword(password: string) {
    return this.page.fill(selectors.PASSWORD, password);
  }

  confirmPassword(password: string) {
    return this.page.fill(selectors.VPASSWORD, password);
  }

  async clickUseRecoveryCode() {
    return this.page.click(selectors.LINK_USE_RECOVERY_CODE);
  }

  async setCode(code: string) {
    return this.page.fill(selectors.RECOVERY_KEY_TEXT_INPUT, code);
  }

  async loginHeader() {
    const header = this.page.locator(selectors.FIREFOX_HEADER);
    await header.waitFor();
    return header.isVisible();
  }

  async acceptOauthPermissions() {
    return this.page.locator(selectors.PERMISSION_ACCEPT).click();
  }

  async signinUnblockHeader() {
    const header = this.page.locator(selectors.SIGNIN_UNBLOCK_HEADER);
    await header.waitFor();
    return header.isVisible();
  }

  async signInError() {
    const error = this.page.locator(selectors.ERROR);
    await error.waitFor();
    return error.textContent();
  }

  async showPasswordMouseAction() {
    await this.page.locator(selectors.PASSWORD).type('password');
    await this.page.locator(selectors.SHOW_PASSWORD).hover();
    await this.page.mouse.down();
  }

  async showPassword() {
    return this.page.locator(selectors.SHOW_PASSWORD).isVisible();
  }

  async textInputForPassword() {
    //This function is for when the password input field changes to a text field
    //after clicking the 'show password' button
    const pass = this.page.locator(selectors.PASSWORD_TEXT_INPUT);
    await pass.waitFor({
      state: 'visible',
    });
    return pass.isVisible();
  }

  async maskPasswordInputForPassword() {
    //This function is for when the password text field changes to a password field with masking
    //after clicking the 'show password' button
    const pass = this.page.locator(selectors.PASSWORD_MASK_INPUT);
    await pass.waitFor({
      state: 'visible',
    });
    return pass.isVisible();
  }

  async getUseDifferentAccountLink() {
    return this.page.locator(selectors.LINK_USE_DIFFERENT);
  }

  async useDifferentAccountLink() {
    return this.page.click(selectors.LINK_USE_DIFFERENT);
  }

  async getTooltipError() {
    return this.page.locator(selectors.TOOLTIP).innerText();
  }

  async unblock(email: string) {
    const code = await this.target.email.waitForEmail(
      email,
      EmailType.unblockCode,
      EmailHeader.unblockCode
    );
    await this.setCode(code);
    await this.submit();
  }

  async submit(waitForNav = true) {
    if (waitForNav) {
      const waitForNavigation = this.page.waitForNavigation();
      await this.page.locator(selectors.SUBMIT).click();
      return waitForNavigation;
    }
    // `waitForNavigation` is deprecated because it's "hard to make it work reliably",
    // see https://github.com/microsoft/playwright/issues/20853. It's causing at least
    // one set of test failures so give an option to opt-out here.
    await this.page.locator(selectors.SUBMIT).click();
  }

  async clickForgotPassword() {
    await this.page.locator(selectors.LINK_RESET_PASSWORD).click();
    await this.page.waitForURL(/reset_password/);
  }

  async isSigninHeader() {
    return this.page.isVisible(selectors.SIGNIN_HEADER, {
      timeout: 100,
    });
  }

  async isPasswordHeader() {
    const header = await this.page.locator(selectors.PASSWORD_HEADER);
    await header.waitFor();
    return header.isVisible();
  }

  async clickSignIn() {
    return this.page.locator(selectors.SUBMIT_USER_SIGNED_IN).click();
  }

  async enterUnblockCode(code: string) {
    await this.setCode(code);
    await this.clickSubmit();
  }

  async clickSubmit() {
    return this.page.locator(selectors.SUBMIT).click();
  }

  async waitForCWTSHeader() {
    await this.page.waitForSelector(selectors.CWTS_HEADER, {
      timeout: 100,
    });
  }

  async waitForCWTSEngineBookmarks() {
    await this.page.waitForSelector(selectors.CWTS_ENGINE_BOOKMARKS, {
      timeout: 100,
    });
  }

  async waitForCWTSEngineHistory() {
    await this.page.waitForSelector(selectors.CWTS_ENGINE_HISTORY, {
      timeout: 100,
    });
  }

  async isSyncConnectedHeader() {
    return this.page.isVisible(selectors.SYNC_CONNECTED_HEADER, {
      timeout: 100,
    });
  }

  async signInPasswordHeader() {
    const header = this.page.locator('#fxa-signin-password-header');
    await header.waitFor();
    return header.isVisible();
  }

  async signUpPasswordHeader() {
    const header = this.page.locator('#fxa-signup-password-header');
    await header.waitFor();
    return header.isVisible();
  }

  async permissionsHeader() {
    const resetPass = this.page.locator(selectors.PERMISSIONS_HEADER);
    await resetPass.waitFor();
    return resetPass.isVisible();
  }

  async notesHeader() {
    const header = this.page.locator(selectors.NOTES_HEADER);
    await header.waitFor();
    return header.isVisible();
  }

  async clickDontHaveRecoveryKey() {
    await this.page.locator(selectors.LINK_LOST_RECOVERY_KEY).click();
    await this.page.waitForURL(/complete_reset_password/);
  }

  setRecoveryKey(key: string) {
    return this.page.locator(selectors.RECOVERY_KEY_TEXT_INPUT).fill(key);
  }

  setAge(age: string) {
    return this.page.locator(selectors.AGE).fill(age);
  }

  async setNewPassword(password: string) {
    await this.page.locator(selectors.PASSWORD).fill(password);
    await this.page.locator(selectors.VPASSWORD).fill(password);
    await this.submit();
  }

  async setTotp(secret: string) {
    const code = await getCode(secret);
    await this.page.locator(selectors.NUMBER_INPUT).fill(code);
    await this.submit();
  }

  async getPrefilledEmail() {
    return this.page.locator(selectors.EMAIL_PREFILLED).innerText();
  }

  async getEmailInputElement() {
    return this.page.locator(selectors.EMAIL);
  }

  async getEmailInput() {
    return this.page.locator(selectors.EMAIL).inputValue();
  }

  async getPasswordInput() {
    return this.page.locator(selectors.PASSWORD).inputValue();
  }

  async isCachedLogin() {
    return this.page.isVisible(selectors.SUBMIT_USER_SIGNED_IN, {
      timeout: 1000,
    });
  }

  async clearCache() {
    await this.page.goto(`${this.target.contentServerUrl}/clear`, {
      waitUntil: 'load',
    });
    return this.page.waitForTimeout(1000);
  }

  async getErrorMessage() {
    return this.page.locator(selectors.ERROR).innerText();
  }

  createEmail(template?: string) {
    if (!template) {
      template = 'signin{id}';
    }
    return template.replace('{id}', Math.random() + '') + '@restmail.net';
  }

  async getStorage() {
    await this.goto();
    return this.page.evaluate((creds) => {
      console.log('getStorage', localStorage.getItem('__fxa_storage.accounts'));
    });
  }

  async clearSessionStorage() {
    await this.page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  async useCredentials(credentials: any) {
    await this.goto();
    return this.page.evaluate((creds) => {
      localStorage.setItem(
        '__fxa_storage.accounts',
        JSON.stringify({
          [creds.uid]: {
            sessionToken: creds.sessionToken,
            uid: creds.uid,
          },
        })
      );
      localStorage.setItem(
        '__fxa_storage.currentAccountUid',
        JSON.stringify(creds.uid)
      );
    }, credentials);
  }

  async getAccountFromFromLocalStorage(email: string) {
    return await this.page.evaluate((email) => {
      const accounts: Array<{
        email: string;
        sessionToken: string;
        uid: string;
      }> = JSON.parse(localStorage.getItem('__fxa_storage.accounts') || '{}');
      return Object.values(accounts).find((x) => x.email === email);
    }, email);
  }

  async destroySession(email: string) {
    const account = await this.getAccountFromFromLocalStorage(email);
    if (account?.sessionToken) {
      return await this.target.auth.sessionDestroy(account.sessionToken);
    }
  }

  async denormalizeStoredEmail(email: string) {
    const account = await this.getAccountFromFromLocalStorage(email);

    return this.page.evaluate((uid) => {
      const accounts = JSON.parse(
        localStorage.getItem('__fxa_storage.accounts') || '{}'
      );

      for (const accountId in accounts) {
        if (accountId === uid) {
          const account = accounts[accountId];

          if (account.email === email) {
            account.email = email.toUpperCase();
          }
        }
      }

      localStorage.setItem('__fxa_storage.accounts', JSON.stringify(accounts));
    }, email);
  }

  async getConfig() {
    // Content server config is stored in the `meta` tag of the html page.
    // We can check this tag to see if the content server has enabled this React feature flag.
    await this.goto();
    const metaConfig = this.page.locator(
      'meta[name="fxa-content-server/config"]'
    );
    const config = await metaConfig.getAttribute('content');
    return JSON.parse(decodeURIComponent(config));
  }

  async clearEmailTextBox() {
    return this.page.locator(selectors.EMAIL).fill('');
  }
}
