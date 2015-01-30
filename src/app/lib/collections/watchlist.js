(function (App) {
	'use strict';

	var Q = require('q'),
		Providers = require('./lib/api').providers;

	var WatchlistCollection = App.Model.Collection.extend({
		model: App.Model.Movie,
		hasMore: false,

		getProviders: function () {
			return {
				torrents: [Providers.get('watchlist')]
			};
		}

	});

	App.Model.WatchlistCollection = WatchlistCollection;
})(window.App);
