(function (App) {
	'use strict';

	var self;

	var Vent = require('./lib/api').vent;

	var UNIMPLEMENTED = function () {
		console.error ('NOT IMPLEMENTED');
	};

	var Device = Backbone.Model.extend({
		defaults: {
			id: 'local',
			type: 'local',
			name: 'Popcorn Time'
		},
		play: function (streamModel) {
			Vent.trigger('stream:local', streamModel);
		},
		pause:		function () { UNIMPLEMENTED();},
		unpause:	function () { UNIMPLEMENTED();},
		stop:		function () { UNIMPLEMENTED();},
		forward:	function () { UNIMPLEMENTED();},
		backward:	function () { UNIMPLEMENTED();},
		seek:		function () { UNIMPLEMENTED();},
		getStatus:	function () { UNIMPLEMENTED();},
		getID:		function () {
			return this.id;
		}

	});

	var DeviceCollection = Backbone.Collection.extend({
		selected: 'local',
		initialize: function () {
			Vent.on('device:list', this.list);
			Vent.on('device:pause', this.pause);
			Vent.on('device:unpause', this.unpause);
			Vent.on('device:stop', this.stop);
			Vent.on('device:forward', this.forward);
			Vent.on('device:backward', this.backward);
			Vent.on('device:seek', this.seek);
			Vent.on('device:status:update', this.getStatus);
			self = this;
		},
		list: function () {
			_.each(self.models, function (device) {
				Vent.trigger('device:add', device);
			});
		},
		pause: function () {
			self.selected.pause();
		},
		unpause: function () {
			self.selected.unpause();
		},
		stop: function () {
			self.selected.stop();
		},
		forward: function () {
			self.selected.forward();
		},
		backward: function () {
			self.selected.backward();
		},
		seek: function (newCurrentTime) {
			self.selected.seek(newCurrentTime);
		},
		getStatus: function (callback) {
			self.selected.getStatus(callback);
		},
		startDevice: function (streamModel) {
			if (!this.selected) {
				this.selected = this.models[0];
			}

			/* SlashmanX: Just testing for now,
			 ** replaces localhost IP with network IP,
			 ** will remove when new streamer implemented
			 **
			 ** ddaf: Copied getIPAddress from App.View.Settings.
			 **       filters virtual and vpn adapters.
			 */
			var ip, alias = 0;
			var ifaces = require('os').networkInterfaces();
			for (var dev in ifaces) {
				ifaces[dev].forEach(function (details) {
					if (details.family === 'IPv4') {
						if (!/(loopback|vmware|internal|hamachi|vboxnet)/gi.test(dev.toLowerCase())) {
							if (details.address.substring(0, 8) === '192.168.' ||
								details.address.substring(0, 7) === '172.16.' ||
								details.address.substring(0, 5) === '10.0.'
							) {
								if (streamModel.get('type') !== 'trailer') {
									streamModel.attributes.src = App.Streamer.getStreamUrl()
										.replace('127.0.0.1', details.address).replace('localhost', details.address);
								} else {
									streamModel.attributes.src = streamModel.get('trailerSrc')
										.replace('127.0.0.1', details.address).replace('localhost', details.address);
								}
							}
						}
					}
				});
			}

			return this.selected.play(streamModel);
		},

		setDevice: function (deviceID) {
			this.selected = this.findWhere({
				id: deviceID
			});
		}

	});

	var collection = new DeviceCollection(new Device());
	collection.setDevice('local');

	var ChooserView = Backbone.Marionette.ItemView.extend({
		template: '#player-chooser-tpl',
		events: {
			'click .playerchoicemenu li a': 'selectPlayer'
		},
		onRender: function () {
			var id = this.collection.selected.get('id').replace('\'', '\\\'');
			var el = $('.playerchoicemenu li#player-' + id + ' a');
			this._selectPlayer(el);
		},
		selectPlayer: function (e) {
			this._selectPlayer($(e.currentTarget));
		},
		_selectPlayer: function (el) {
			var player = el.parent('li').attr('id').replace('player-', '');
			collection.setDevice(player);
			$('.playerchoicemenu li a.active').removeClass('active');
			el.addClass('active');
			$('.imgplayerchoice').attr('src', el.children('img').attr('src'));
		}
	});

	var createChooserView = function (el) {
		return new ChooserView({
			collection: collection,
			el: el
		});
	};

	App.Device = {
		Generic: Device,
		Collection: collection,
		ChooserView: createChooserView
	};

})(window.App);
