var AppProxy,
	_ = require('underscore'),
    Providers = require('../providers'),
    Settings = require('../settings'),
    Database = require('../database'),
    Localization = require('../localization'),
    Tabs = require('../tabs'),
    Vent = require('../vent');

function generateProxyFunctions(name, permissions) {

	var passThruAppContextToApi = function (perm, apiMethods) {
		var appContext = {
			app: name
		};

		return _.reduce(apiMethods, function (memo, apiMethod, methodName) {
			memo[methodName] = function () {
				var args = _.toArray(arguments),
					options = args[args.length - 1];

				if (_.isObject(options)) {
					options.context = _.clone(appContext);
				}
				return apiMethod.apply({}, args);
			};

			return memo;
		}, {});
	};

	/*
	 * It's here we define the 'mapping' of available
	 * class / functions via the PDK
	 * The are accessible after an extend from one of the main class
	 *
	 * Example
	 * this.app.api.settings.set will be mapped to api.settings.set
	 */

	return {
		api: {

			settings: {
				// Settings called from a package get packagename. embed
				// at the begining of the key to prevent duplication
				get: function (key) {
					return Settings.get(name + '.' + key);
				},
				set: function (key, value) {
					return Settings.set(name + '.' + key, value);
				},
				propagate: function (key, value) {
					return Settings.propagate(key, value);
				}
			},

			providers: passThruAppContextToApi('providers',
				_.pick(Providers, 'get', 'set')
			),

			tabs: passThruAppContextToApi('tabs',
				_.pick(Tabs, 'set')
			),

			database: Database,

			localization: passThruAppContextToApi('localization',
				_.pick(Localization, 'filterSubtitle')
			),

			mousetrap: passThruAppContextToApi('mousetrap',
				_.pick(window.Mousetrap, 'trigger')
			),

			devices: {
				generic: window.App.Device.Generic,
				collection: window.App.Device.Collection
			},

            // @TODO Need something more clean here

			//player: API.player,
			//currentStack: API.currentStack,
			//currentTab: API.currentTab,
			//viewStack: API.viewStack,

			currentVersion: Settings.get('version'), // @TODO: better way to get version
			currentGit: window.App.git, // @TODO: don't expose the git to App, it should be exposed by the api
			vent: Vent
		},

		cache: {
			providers: Providers.get('cache'),
		},

	};

}

function AppProxy(options) {
	if (!options.name) {
		throw new Error('Must provide an app name for api context');
	}

	if (!options.permissions) {
		throw new Error('Must provide app permissions');
	}

	_.extend(this, generateProxyFunctions(options.name, options.permissions));
}

module.exports = AppProxy;
