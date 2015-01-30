(function (App) {
	'use strict';
	var memoize = require('memoizee');

	var Provider = function () {
		var memopts = {
			maxAge: 10 * 60 * 1000,
			/* 10 minutes */
			preFetch: 0.5,
			/* recache every 5 minutes */
			primitive: true
		};

		this.memfetch = memoize(this.fetch.bind(this), memopts);
		this.fetch = this._fetch.bind(this);

		this.detail = memoize(this.detail.bind(this), _.extend(memopts, {
			async: true
		}));
	};

	Provider.prototype._fetch = function (filters) {
		filters.toString = this.toString;
		return this.memfetch(filters);
	};

	Provider.prototype.toString = function (arg) {
		return JSON.stringify(this);
	};

	App.Providers.Generic = Provider;

})(window.App);
