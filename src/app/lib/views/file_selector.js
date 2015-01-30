(function (App) {
	'use strict';

	var _this;
	var Vent = require('./lib/api').vent;

	var FileSelector = Backbone.Marionette.ItemView.extend({
		template: '#file-selector-tpl',
		className: 'file-selector',

		events: {
			'click .close-icon': 'closeSelector',
			'click .file-item': 'startStreaming'
		},

		initialize: function () {
			_this = this;
		},

		onShow: function () {
			App.Device.ChooserView('#player-chooser2').render();
			this.$('#watch-now').text('');

			Mousetrap.bind(['esc', 'backspace'], function (e) {
				_this.closeSelector(e);
			});
		},


		startStreaming: function (e) {
			var torrent = _this.model.get('torrent');
			var file = parseInt($(e.currentTarget).attr('data-file'));
			var actualIndex = parseInt($(e.currentTarget).attr('data-index'));
			torrent.name = torrent.files[file].name;

			var torrentStart = new Backbone.Model({
				torrent: torrent,
				torrent_read: true,
				file_index: actualIndex
			});
			Vent.trigger('stream:start', torrentStart);
			Vent.trigger('system:closeFileSelector');
		},

		closeSelector: function (e) {
			Mousetrap.bind('backspace', function (e) {
				Vent.trigger('show:closeDetail');
				Vent.trigger('movie:closeDetail');
			});
			$('.filter-bar').show();
			$('#header').removeClass('header-shadow');
			$('#movie-detail').show();
			Vent.trigger('system:closeFileSelector');
		},

		onClose: function () {

		},

	});

	App.View.FileSelector = FileSelector;
})(window.App);
