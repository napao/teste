(function (App) {
	'use strict';

	var semver = require('semver');
	var PTStreamer = require('popcorn-streamer-server');
	var util = require('util');
	var BUFFERING_SIZE = 10 * 1024 * 1024;
	var Providers = require('./lib/api').providers;
	var Settings = require('./lib/api').settings;
	var Localization = require('./lib/api').localization;
	var Vent = require('./lib/api').vent;

	var Streamer = Backbone.Model.extend({

		initialize: function () {
			this.stream = false;
			//Start a new torrent stream, ops: torrent file, magnet
			Vent.on('streamer:start', _.bind(this.start, this));
			//stop a torrent streaming
			Vent.on('streamer:stop', _.bind(this.stop, this));

		},

		reset: function () {
			this.stream = false;
			this.streamInfo = false;
			this.src = false;
			this.state = false;
			this.data = false;
		},

		start: function (data) {
			var self = this;
			var torrenturl = data.torrent;
			var version = semver.parse(Settings.get('version'));

			var filename = data.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp4';
			var torrentVersion = '';
			torrentVersion += version.major;
			torrentVersion += version.minor;
			torrentVersion += version.patch;
			torrentVersion += version.prerelease.length ? version.prerelease[0] : 0;

			data.videotype = data.videotype || 'video/mp4';
			data.subtitle = data.subtitle || {};

			this.reset();

			this.stream = new PTStreamer(torrenturl, {
				progressInterval: 10,
				buffer: (BUFFERING_SIZE / 100),
				port: 2014,
				writeDir: Settings.get('tmpLocation'),
				index: filename,
				torrent: {
					id: '-PC' + torrentVersion + '-'
				}
			});

			this.stream.on('progress', function (data) {
				self.data = data;
				self.updateInfo();
			});

			this.stream.on('ready', function (data) {
				self.src = data.streamUrl;
				self.state = 'ready';
			});

			this.stream.on('close', function () {
				console.log('im closed');
			});

			this.stream.on('error', function (e) {
				console.log(e);
				//self.stop();
			});

			if (data.type !== 'movie' || !(data.type.indexOf('dropped') > -1)) {
				this.getSubtitles(data.metadata, filename, data.type);
			}

			win.debug('Streaming to %s', path.join(Settings.get('tmpLocation'), filename));
			this.updateInfo();

			var stateModel = new Backbone.Model({
				backdrop: data.metadata.backdrop,
				title: data.metadata.title,
				player: data.device,
				show_controls: false,
				data: data
			});

			Vent.trigger('stream:started', stateModel);
		},

		setStreamUrl: function (url) {
			this.src = url;
		},

		getStreamUrl: function () {
			return this.src || false;
		},

		stop: function () {
			if (this.stream) {
				this.stream.close();
			}

			this.reset();
		},

		updateInfo: function () {
			var state = 'connecting';

			if (this.data.downloaded) {
				state = 'downloading';
			} else if (this.data.seeds) {
				state = 'startingDownload';
			}

			this.prossessStreamInfo();
			this.state = state;

		},
		prettySpeed: function (speed) {
			speed = speed || 0;
			if (speed == 0) return util.format("%s %s", 0, "B/s");

			var converted = Math.floor(Math.log(speed) / Math.log(1024));
			return util.format("%s %s/s", (speed / Math.pow(1024, converted)).toFixed(2), ['B', 'KB', 'MB', 'GB', 'TB'][converted]);
		},
		prossessStreamInfo: function () {
			var converted_speed = 0;
			var percent = 0;

			if (!this.data) {
				return;
			}

			var streamInfo = {
				downloaded: this.data.downloaded,
				peers: this.data.peers,
				connections: this.data.connections,
				seeds: this.data.seeds,
				uploadSpeed: this.data.uploadSpeed,
				prettyUploadSpeed: this.prettySpeed(this.data.uploadSpeed),
				downloadSpeed: this.data.downloadSpeed,
				prettyDownloadSpeed: this.prettySpeed(this.data.downloadSpeed),
				eta: this.data.eta,
				progress: this.data.progress,
				size: this.data.size //debuging size -- use real once when xeon adds it in popcorn - streamer callback
			};

			this.streamInfo = streamInfo;
		},

		getSubtitles: function (data, filename, type) {

			var subskw = [];

			for (var key in Localization.langcodes) {
				if (Localization.langcodes[key].keywords !== undefined) {
					subskw[key] = Localization.langcodes[key].keywords;
				}
			}

			data.filename = filename;
			data.keywords = subskw;
			data.type = type;

			win.debug('Subtitle data request:', data);
			var subtitleProvider = Providers.get(Providers.getActive().config.subtitle);
			subtitleProvider.fetch(data).then(function (subs) {
				if (_.size(subs) > 0) {
					Vent.trigger('subtitles:ready', {
						subtitle: subs,
						defaultSubtitle: Settings.get('subtitle_language')
					});
					win.info(_.size(subs) + ' subtitles found');
				} else {
					win.warn('No subtitles returned');
				}
			}).catch(function (err) {
				win.warn(err);
			});
		}

	});

	App.Streamer = new Streamer();
})(window.App);
