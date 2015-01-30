var
	Launcher,
	Q = require('q'),
	Events,
	gui,
	i18n = require('i18n'),
	_ = require('lodash'),
	api = require('../api'),
	ips = require('../utils/ips'),
	fs = require('fs');

function Launcher(App) {
	this.app = App;
}

Launcher.prototype.init = function () {
	var that = this;

	api.vent.trigger('initHttpApi');

	return this.compareVersion()
		.then(function () {
			console.info('Launcher: Loading UserInfo..');
			return that.loadUserInfo();
		})
		.then(function () {
			console.info('Launcher: Setting User Language..');
			// maybe we should set user language? :D
			i18n.setLocale(api.settings.get('language'));
		})
		.then(function () {
			console.info('Launcher: Loading Packages..');
			return api.packages.manager.loadPackages();
		})
		.then(function () {
			console.info('Launcher: Loading Misc Settings..');
			that.loadMiscSettings();
		})
		.then(function () {
			// Create the System Temp Folder. This is used to store temporary data like movie files.
			if (!fs.existsSync(api.settings.get('tmpLocation'))) {
				console.info('Launcher: Creating temp folder: '+ api.settings.get('tmpLocation'));
				fs.mkdir(api.settings.get('tmpLocation'));
			}
		});
};

Launcher.prototype.compareVersion = function () {
	var that = this;
	return Q.Promise(function (resolve, reject) {
		var currentVersion = that.app.gui.App.manifest.version;

		api.settings.set('version', currentVersion);
		api.settings.set('releaseName', that.app.gui.App.manifest.releaseName);

		return resolve();
	});
};

Launcher.prototype.loadUserInfo = function () {
	var that = this;
	return Q.Promise(function (resolve, reject) {

		that.loadBookmarks()
			.then(function (bookmarks) {
				that.app.userBookmarks = bookmarks;
				return that.loadWatchedMovies();
			})
			.then(function (watchedMovies) {
				that.app.watchedMovies = watchedMovies;
				return that.loadWatchedEpisodes();
			})
			.then(function (watchedShows) {
				that.app.watchedShows = watchedShows;

				// we have everything what we need
				// we return it as a promise
				return resolve();
			});
	});
};

Launcher.prototype.loadBookmarks = function () {
	var that = this;
	return Q.Promise(function (resolve, reject) {
		return api.database.find('bookmarks', {})
			.then(function (data) {
				var bookmarks = [];
				if (data) {
					bookmarks = _.pluck(data, 'imdb_id');
				}
				return resolve(bookmarks);
			});
	});
};


Launcher.prototype.loadWatchedMovies = function () {
	var that = this;
	return Q.Promise(function (resolve, reject) {
		return api.database.find('watched', {
				type: 'movie'
			})
			.then(function (data) {
				var watchedMovies = [];
				if (data) {
					watchedMovies = _.pluck(data, 'movie_id');
				}
				return resolve(watchedMovies);
			});
	});
};

Launcher.prototype.loadWatchedEpisodes = function () {
	var that = this;
	return Q.Promise(function (resolve, reject) {
		return api.database.find('watched', {
				type: 'episode'
			})
			.then(function (data) {
				var watchedEpisodes = [];
				if (data) {
					watchedEpisodes = _.pluck(data, 'imdb_id');
				}
				return resolve(watchedEpisodes);
			});
	});
};

Launcher.prototype.loadMiscSettings = function() {
	// Set ipAddress. used in QR-code generation.
	var localIPs = ips.getPrivateAddresses();
	console.info('Found private IPs: '+ localIPs);
	api.settings.set('ipAddress', localIPs[0]);
}

module.exports = function (App) {
	return new Launcher(App);
};
