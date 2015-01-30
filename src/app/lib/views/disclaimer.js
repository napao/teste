(function (App) {
	'use strict';

	var Settings = require('./lib/api').settings;
	var Vent = require('./lib/api').vent;

	var DisclaimerModal = Backbone.Marionette.ItemView.extend({
		template: '#disclaimer-tpl',
		className: 'disclaimer',

		events: {
			'click .btn-accept': 'acceptDisclaimer',
			'click .btn-close': 'closeApp',
		},

		initialize: function () {
			Mousetrap.pause();
			console.log('Show Disclaimer');
		},

		acceptDisclaimer: function (e) {
			e.preventDefault();
			Mousetrap.unpause();
			Settings.set('disclaimerAccepted', 1);
			Vent.trigger('close:disclaimer', []);
		},

		closeApp: function (e) {
			e.preventDefault();
			gui.App.quit();
		}

	});

	App.View.DisclaimerModal = DisclaimerModal;
})(window.App);
