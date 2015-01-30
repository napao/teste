var _ = require('lodash'),
    availableTabs = [];

var TabsManager = {

	set: function (uiName, providerName) {
		availableTabs.push({
			ui: uiName,
			provider: providerName
		});
	},

	first: function () {
		return _.first(availableTabs);
	},

	get: function () {
		return availableTabs;
	}
};


module.exports = TabsManager;
