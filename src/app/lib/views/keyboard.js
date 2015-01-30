(function (App) {
	'use strict';

	var Vent = require('./lib/api').vent;

	var Keyboard = Backbone.Marionette.ItemView.extend({
		template: '#keyboard-tpl',
		className: 'keyboard',

		events: {
			'click .close-icon': 'closeKeyboard',
		},


		onShow: function () {
			$('.search input').blur();
			Mousetrap.bind('esc', function (e) {
				Vent.trigger('keyboard:close');
			});
		},

		onClose: function () {},

		closeKeyboard: function () {
			Vent.trigger('keyboard:close');
		},

	});

	App.View.Keyboard = Keyboard;
})(window.App);
