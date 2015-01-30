var _ = require('lodash'),
    Settings = require('../settings'),
    providers = [],
    cachedProviders = [];

var ProvidersManager = {

    active: false,

	get: function (name) {
		if (!name) {
			console.error('dumping provider cache');
			return cachedProviders;
		}

		if (cachedProviders[name]) {
			console.log('Returning cached provider', name);
			return cachedProviders[name];
		}

		var provider = providers[name];
		if (!provider) {
			console.error('couldn\'t find provider', name);
			return null;
		}

		console.log('Spawning new provider', name);

        // expand from generic
        cachedProviders[name] = providers[name];
        cachedProviders[name].name = name;
		return cachedProviders[name];
	},

    set: function (name, type, fn) {
		// we get our available providers
		var availableProviders = Settings.get('availableProviders');

		if (availableProviders[type]) {
			availableProviders[type].push(name);
		} else {
			availableProviders[type] = [];
			availableProviders[type].push(name);
		}

		Settings.set('availableProviders', availableProviders);
		providers[name] = fn;
		return;
	},

    setActive: function (provider) {
		ProvidersManager.active = ProvidersManager.get(provider);
		return;
	},

    getActive: function () {
		return ProvidersManager.active;
	},

    getByType: function (type) {

		var myProviders = Settings.get('providers');
		var provider = myProviders[type];

		if (typeof (provider) === 'object') {
			return _.map(provider, function (t) {
				return ProvidersManager.get(t);
			});
		}
		return ProvidersManager.get(provider);
	},

    enable: function (type, provider) {

		var myProviders = Settings.get('providers');

		if (typeof (myProviders[type]) === 'object') {
			// actually we'll overwrite till we have a better
			// way to manage it
			myProviders[type] = [provider];
		} else {
			myProviders[type] = provider;
		}

		Settings.set('providers', providers);
		return;
	},

    disable: function (type, provider) {

		var myProviders = Settings.get('providers');

		if (typeof (myProviders[type]) === 'object' && myProviders[type].length > 0) {
			// ok looks like we can disable it
			myProviders[type] = _.without(myProviders[type], provider);
		} else {
			// we cant disable the last provider...
			return false;
		}

		Settings.set('providers', providers);
		return true;
	}
};

module.exports = ProvidersManager;
