/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { assert } from 'chai';
import AuthBroker from 'models/auth_brokers/base';
import Backbone from 'backbone';
import BaseView from 'views/base';
import Constants from 'lib/constants';
import Metrics from 'lib/metrics';
import Notifier from 'lib/channels/notifier';
import Relier from 'models/reliers/relier';
import Router from 'lib/router';
import SignInPasswordView from 'views/sign_in_password';
import sinon from 'sinon';
import User from 'models/user';
import WindowMock from '../../mocks/window';
import CannotCreateAccountView from '../../../scripts/views/cannot_create_account';

describe('lib/router', () => {
  let broker;
  var metrics;
  var navigateOptions;
  var navigateUrl;
  var notifier;
  var relier;
  var router;
  var user;
  var windowMock;
  var config;

  const showReactAppAll = {
    simpleRoutes: true,
    resetPasswordRoutes: true,
    oauthRoutes: true,
    signInRoutes: true,
    signUpRoutes: true,
    pairRoutes: true,
    postVerifyOtherRoutes: true,
    postVerifyCADViaQRRoutes: true,
    webChannelExampleRoutes: true,
  };

  beforeEach(() => {
    navigateUrl = navigateOptions = null;

    notifier = new Notifier();
    metrics = new Metrics({ notifier });
    user = new User();
    windowMock = new WindowMock();

    broker = new AuthBroker();

    relier = new Relier({
      window: windowMock,
    });

    config = { showReactApp: showReactAppAll };

    router = new Router({
      broker,
      metrics: metrics,
      notifier: notifier,
      relier: relier,
      user: user,
      window: windowMock,
      config,
    });

    sinon
      .stub(Backbone.Router.prototype, 'navigate')
      .callsFake(function (url, options) {
        navigateUrl = url;
        navigateOptions = options;
      });
  });

  afterEach(() => {
    metrics.destroy();
    windowMock = router = navigateUrl = navigateOptions = metrics = null;
    Backbone.Router.prototype.navigate.restore();
  });

  describe('navigate', () => {
    it('tells the router to navigate to a page', () => {
      sinon.stub(broker, 'transformLink').callsFake((url) => `/oauth/${url}`);
      windowMock.location.search = '';
      router.navigate('signin');

      assert.isTrue(broker.transformLink.calledOnceWith('signin'));
      assert.equal(navigateUrl, '/oauth/signin');
      assert.deepEqual(navigateOptions, { trigger: true });
    });

    it('strips the origin from the url', () => {
      windowMock.location.origin = 'http://accounts.firefox.com';
      router.navigate('http://accounts.firefox.com/signin');

      assert.equal(navigateUrl, '/signin');
      assert.deepEqual(navigateOptions, { trigger: true });
    });
  });

  describe('`navigate` notifier message', () => {
    beforeEach(() => {
      sinon.spy(router, 'navigate');

      notifier.trigger('navigate', {
        nextViewData: {
          key: 'value',
        },
        routerOptions: {
          clearQueryParams: true,
          trigger: true,
        },
        url: 'signin',
      });
    });

    it('calls `navigate` correctly', () => {
      assert.isTrue(
        router.navigate.calledWith(
          'signin',
          {
            key: 'value',
          },
          {
            clearQueryParams: true,
            trigger: true,
          }
        )
      );
    });
  });

  describe('`navigate` notifier message with `server: true`', () => {
    beforeEach(() => {
      sinon.spy(router, 'navigate');
      sinon.spy(router, 'navigateAway');

      notifier.trigger('navigate', {
        server: true,
        url: 'wibble',
      });
    });

    it('navigated correctly', () => {
      assert.equal(router.navigate.callCount, 0);
      assert.equal(router.navigateAway.callCount, 1);
      const args = router.navigateAway.args[0];
      assert.lengthOf(args, 1);
      assert.equal(args[0], 'wibble');
    });
  });

  describe('navigateAway', () => {
    beforeEach(() => {
      sinon.spy(metrics, 'flush');
      sinon.spy(router, 'navigate');
      sinon.stub(broker, 'transformLink').callsFake((url) => `/oauth/${url}`);
    });

    describe('with external link', () => {
      beforeEach(() => {
        return router.navigateAway('https://example.com/');
      });

      it('called metrics.flush correctly', () => {
        assert.equal(metrics.flush.callCount, 1);
        assert.lengthOf(metrics.flush.args[0], 0);
      });

      it('does not transform external links', () => {
        assert.isFalse(broker.transformLink.called);
        assert.equal(router.navigate.callCount, 0);
        assert.equal(windowMock.location.href, 'https://example.com/');
      });
    });

    describe('with internal link', () => {
      beforeEach(() => {
        return router.navigateAway('blee');
      });

      it('called metrics.flush correctly', () => {
        assert.equal(metrics.flush.callCount, 1);
        assert.lengthOf(metrics.flush.args[0], 0);
      });

      it('navigated correctly', () => {
        assert.isTrue(broker.transformLink.calledOnceWith('blee'));
        assert.equal(router.navigate.callCount, 0);
        assert.equal(windowMock.location.href, '/oauth/blee');
      });
    });
  });

  describe('`navigate-back` notifier message', () => {
    beforeEach(() => {
      sinon.spy(router, 'navigateBack');

      notifier.trigger('navigate-back', {
        nextViewData: {
          key: 'value',
        },
      });
    });

    it('calls `navigateBack` correctly', () => {
      assert.isTrue(router.navigateBack.called);
    });
  });

  describe('set query params', () => {
    beforeEach(() => {
      windowMock.location.search =
        '?context=' + Constants.FX_DESKTOP_V3_CONTEXT;
    });

    describe('navigate with default options', () => {
      beforeEach(() => {
        router.navigate('/forgot');
      });

      it('preserves query params', () => {
        assert.equal(
          navigateUrl,
          '/forgot?context=' + Constants.FX_DESKTOP_V3_CONTEXT
        );
        assert.deepEqual(navigateOptions, { trigger: true });
      });
    });

    describe('navigate with clearQueryParams option set', () => {
      beforeEach(() => {
        router.navigate(
          '/forgot?context=' + Constants.FX_DESKTOP_V3_CONTEXT,
          {},
          { clearQueryParams: true }
        );
      });

      it('clears the query params if clearQueryString option is set', () => {
        assert.equal(navigateUrl, '/forgot');
        assert.deepEqual(navigateOptions, {
          clearQueryParams: true,
          trigger: true,
        });
      });
    });
  });

  describe('navigateBack', () => {
    beforeEach(() => {
      sinon.spy(windowMock.history, 'back');
      sinon.stub(router, 'canGoBack').callsFake(() => true);

      router.navigateBack();
    });

    it('calls `window.history.back`', () => {
      assert.isTrue(windowMock.history.back.called);
    });
  });

  describe('navigate/navigateBack', () => {
    beforeEach(() => {
      sinon.stub(router, 'canGoBack').callsFake(() => true);
    });

    it('passes the correct model to the correct view', () => {
      // url1 -> url2 -> url3 -> back (url2) -> back (url1) -> url4 ->
      // back (url1) -> url5 -> replace (url6) -> back (url1)
      router.navigate('url1', { key1: 'value1' });
      const view1Model = router.getCurrentViewModel();
      assert.deepEqual(view1Model.toJSON(), { key1: 'value1' });
      view1Model.set({ key2: 'value2' });

      router.navigate('url2', { key3: 'value3' });
      const view2Model = router.getCurrentViewModel();
      assert.deepEqual(view2Model.toJSON(), { key3: 'value3' });

      router.navigate('url3', { key4: 'value4' });
      const view3Model = router.getCurrentViewModel();
      assert.deepEqual(view3Model.toJSON(), { key4: 'value4' });

      router.navigateBack({ key5: 'value5' });
      const back1Model = router.getCurrentViewModel();
      assert.strictEqual(back1Model, view2Model);
      assert.deepEqual(back1Model.toJSON(), {
        key3: 'value3',
        key5: 'value5',
      });

      router.navigateBack({ key6: 'value6' });
      const back2Model = router.getCurrentViewModel();
      assert.strictEqual(back2Model, view1Model);
      assert.deepEqual(back2Model.toJSON(), {
        key1: 'value1',
        key2: 'value2',
        key6: 'value6',
      });

      router.navigate('url4', { key7: 'value7' });
      const view4Model = router.getCurrentViewModel();
      assert.deepEqual(view4Model.toJSON(), { key7: 'value7' });

      router.navigateBack({ key8: 'value8' });
      const back3Model = router.getCurrentViewModel();
      assert.strictEqual(back3Model, view1Model);
      assert.deepEqual(back3Model.toJSON(), {
        key1: 'value1',
        key2: 'value2',
        key6: 'value6',
        key8: 'value8',
      });

      router.navigate('url5', { key9: 'value9' });
      const view5Model = router.getCurrentViewModel();
      assert.deepEqual(view5Model.toJSON(), { key9: 'value9' });

      router.navigate('url6', { key10: 'value10' }, { replace: true });
      const view6Model = router.getCurrentViewModel();
      assert.deepEqual(view6Model.toJSON(), { key10: 'value10' });

      router.navigateBack();
      const back4Model = router.getCurrentViewModel();
      assert.strictEqual(back4Model, view1Model);
      assert.deepEqual(back4Model.toJSON(), {
        key1: 'value1',
        key2: 'value2',
        key6: 'value6',
        key8: 'value8',
      });
    });
  });

  describe('_afterFirstViewHasRendered', () => {
    it('sets `canGoBack`', () => {
      router._afterFirstViewHasRendered();

      assert.isTrue(router.storage.get('canGoBack'));
    });
  });

  describe('pathToViewName', () => {
    it('strips leading /', () => {
      assert.equal(router.fragmentToViewName('/signin'), 'signin');
    });

    it('strips trailing /', () => {
      assert.equal(router.fragmentToViewName('signup/'), 'signup');
    });

    it('converts middle / to .', () => {
      assert.equal(router.fragmentToViewName('/legal/tos/'), 'legal.tos');
    });

    it('converts _ to -', () => {
      assert.equal(
        router.fragmentToViewName('complete_sign_up'),
        'complete-sign-up'
      );
    });

    it('strips search parameters', () => {
      assert.equal(
        router.fragmentToViewName(
          'complete_sign_up?email=testuser@testuser.com'
        ),
        'complete-sign-up'
      );
    });
  });

  describe('showView', () => {
    it('triggers a `show-view` notification', () => {
      sinon.spy(notifier, 'trigger');

      var options = { key: 'value' };

      router.showView(BaseView, options);
      assert.isTrue(notifier.trigger.calledWith('show-view', BaseView));
    });
  });

  describe('canGoBack initial value', () => {
    it('is `false` if sessionStorage.canGoBack is not set', () => {
      assert.isUndefined(router.storage._backend.getItem('canGoBack'));
    });

    it('is `true` if sessionStorage.canGoBack is set', () => {
      windowMock.sessionStorage.setItem('canGoBack', true);
      router = new Router({
        broker,
        metrics: metrics,
        notifier: notifier,
        relier: relier,
        user: user,
        window: windowMock,
        config,
      });
      assert.isTrue(router.storage._backend.getItem('canGoBack'));
    });
  });

  describe('getCurrentPage', () => {
    it('returns the current screen URL based on Backbone.history.fragment', () => {
      Backbone.history.fragment = 'settings';
      assert.equal(router.getCurrentPage(), 'settings');
    });

    it('strips any query parameters from the fragment', () => {
      Backbone.history.fragment = 'force_auth?email=testuser@testuser.com';
      assert.equal(router.getCurrentPage(), 'force_auth');
    });

    it('strips leading `/` from the fragment', () => {
      Backbone.history.fragment = '/force_auth';
      assert.equal(router.getCurrentPage(), 'force_auth');
    });

    it('strips trailing `/` from the fragment', () => {
      Backbone.history.fragment = 'force_auth/';
      assert.equal(router.getCurrentPage(), 'force_auth');
    });
  });

  describe('createViewHandler', () => {
    function View() {}
    var viewConstructorOptions = {};

    beforeEach(() => {
      sinon.spy(router, 'showView');
    });

    it('returns a function that can be used by the router to show a View', () => {
      var routeHandler = router.createViewHandler(View, viewConstructorOptions);
      assert.isFunction(routeHandler);
      assert.isFalse(router.showView.called);

      return routeHandler.call(router).then(() => {
        assert.isTrue(router.showView.calledWith(View, viewConstructorOptions));
      });
    });

    it('handles module names for the view', () => {
      var routeHandler = router.createViewHandler(
        'sign_in_password',
        viewConstructorOptions
      );
      assert.isFunction(routeHandler);
      assert.isFalse(router.showView.called);

      return routeHandler.call(router).then(() => {
        assert.isTrue(
          router.showView.calledWith(SignInPasswordView, viewConstructorOptions)
        );
      });
    });
  });

  describe('createChildViewHandler', () => {
    function ParentView() {}
    function ChildView() {}

    var viewConstructorOptions = {};

    beforeEach(() => {
      sinon.spy(router, 'showChildView');
    });

    it('returns a function that can be used by the router to show a ChildView within a ParentView', () => {
      var routeHandler = router.createChildViewHandler(
        ChildView,
        ParentView,
        viewConstructorOptions
      );

      assert.isFunction(routeHandler);
      assert.isFalse(router.showChildView.called);

      return routeHandler.call(router).then(() => {
        assert.isTrue(
          router.showChildView.calledWith(
            ChildView,
            ParentView,
            viewConstructorOptions
          )
        );
      });
    });

    it('handles module names for the view', () => {
      var routeHandler = router.createChildViewHandler(
        'sign_in_password',
        ParentView,
        viewConstructorOptions
      );
      assert.isFunction(routeHandler);
      assert.isFalse(router.showChildView.called);

      return routeHandler.call(router).then(() => {
        assert.isTrue(
          router.showChildView.calledWith(
            SignInPasswordView,
            ParentView,
            viewConstructorOptions
          )
        );
      });
    });
  });

  describe('React-related methods', () => {
    beforeEach(() => {
      const mockAlwaysShownReactGroups = ['simpleRoutes'];
      sinon
        .stub(router, 'ALWAYS_SHOWN_REACT_GROUPS')
        .value(mockAlwaysShownReactGroups);
    });
    describe('showReactApp', () => {
      beforeEach(() => {
        sinon.spy(router, 'showReactApp');
      });

      describe('returns true', () => {
        it('when routeName is included in react group route and user is in experiment', () => {
          sinon.stub(router, 'isInReactExperiment').callsFake(() => true);
          assert.isTrue(router.showReactApp('cannot_create_account'));
        });

        it('when routeName is in ALWAYS_SHOWN_REACT_GROUPS and user is not in experiment', () => {
          assert.isTrue(router.showReactApp('legal'));
        });

        it('when routeName is a simpleRoute, relier is OAuth, and user is in experiment', () => {
          sinon.stub(router, 'isInReactExperiment').callsFake(() => true);
          const modifiedRelier = relier;
          modifiedRelier.isOAuth = () => true;
          router = new Router({
            broker,
            metrics,
            notifier,
            relier: modifiedRelier,
            user,
            window: windowMock,
            config,
          });

          assert.isTrue(router.showReactApp('legal'));
        });
      });

      describe('returns false', () => {
        it('when routeName is not included in react group route and user is in experiment', () => {
          sinon.stub(router, 'isInReactExperiment').callsFake(() => true);
          assert.isFalse(router.showReactApp('whatever'));
        });

        it('when user is not in experiment', () => {
          assert.isFalse(router.showReactApp('reset_password'));
        });

        it('when routeName is not a simpleRoute, relier is OAuth, and user is in experiment', () => {
          sinon.stub(router, 'isInReactExperiment').callsFake(() => true);
          const modifiedRelier = relier;
          modifiedRelier.isOAuth = () => true;
          router = new Router({
            broker,
            metrics,
            notifier,
            relier: modifiedRelier,
            user,
            window: windowMock,
            config,
          });

          assert.isFalse(router.showReactApp('reset_password'));
        });
      });
    });
    describe('createReactOrBackboneViewHandler', () => {
      const viewConstructorOptions = {};
      const additionalParams = {};
      let routeHandler;

      beforeEach(() => {
        sinon.spy(router, 'navigateAway');
        sinon.spy(router, 'navigate');
        sinon.spy(router, 'createReactOrBackboneViewHandler');
        sinon.spy(router, 'showView');
      });

      it('navigates away with param when React conditions are met', () => {
        sinon.stub(router, 'isInReactExperiment').callsFake(() => true);
        routeHandler = router.createReactOrBackboneViewHandler(
          'cannot_create_account',
          CannotCreateAccountView
        );

        assert.equal(router.navigate.callCount, 0);
        assert.equal(router.navigateAway.callCount, 1);
        const args = router.navigateAway.args[0];
        assert.lengthOf(args, 1);
        assert.equal(args[0], '/cannot_create_account?showReactApp=true');
      });
      it('renders Backbone view when React conditions are not met', () => {
        routeHandler = router.createReactOrBackboneViewHandler(
          'reset_password',
          CannotCreateAccountView,
          additionalParams,
          viewConstructorOptions
        );
        assert.equal(router.navigateAway.callCount, 0);
        return routeHandler.then(() => {
          assert.isTrue(
            router.showView.calledWith(
              CannotCreateAccountView,
              viewConstructorOptions
            )
          );
        });
      });
    });
  });
});
