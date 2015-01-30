var
	SettingsManager,
	defaultSettings = require('./default'),
	Database = require('../database'),
	_ = require('lodash'),
	// Cached Settings
	cachedSettings = {},
	init = false;

var SettingsManager = {

	initialize: function() {

		// save db path in the DB
		SettingsManager.set('databaseLocation', Database.path + '/data', false)

		// load default settings
		_.merge(cachedSettings, defaultSettings);

		// populate with DB
		Database.find('settings')
			.then(function (settings) {
				if (settings !== null) {
					_.each(settings, function (setting) {
						SettingsManager.set(setting.key, setting.value, false);
					});
				}
			})
	},

	set: function (key, value, updateDatabase) {
		cachedSettings[key] = value;

		if (updateDatabase !== false) {
			Database.update('settings', {
				key: key
			}, {
				value: value
			});
		}
	},

	get: function (variable) {
		if (typeof cachedSettings[variable] !== 'undefined') {
			return cachedSettings[variable];
		}
		return false;
	},

	propagate: function (key, value) {
		if (!SettingsManager.get(key)) {
			SettingsManager.set(key, value, true);
		}
	}
};

if (!init) {
	SettingsManager.initialize();
	init = true;
}

module.exports = SettingsManager;
