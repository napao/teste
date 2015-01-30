(function (App) {
	'use strict';

	var _this,
		Launch = require('./lib/initialize')(App),
		Tabs = require('./lib/api').tabs,
		Providers = require('./lib/api').providers,
		Settings = require('./lib/api').settings,
		Vent = require('./lib/api').vent;

	var MainWindow = Backbone.Marionette.Layout.extend({
		template: '#main-window-tpl',

		id: 'main-window',

		regions: {
			Header: '#header',
			Content: '#content',
			MovieDetail: '#movie-detail',
			FileSelector: '#file-selector-container',
			Player: '#player',
			Settings: '#settings-container',
			InitModal: '#initializing',
			Disclaimer: '#disclaimer-container',
			About: '#about-container',
			Keyboard: '#keyboard-container',
			Help: '#help-container'
		},

		ui: {
			posterswidth_alert: '.posterswidth_alert'
		},

		events: {
			'dragover': 'preventDefault',
			'drop': 'preventDefault',
			'dragstart': 'preventDefault',
		},

		initialize: function () {
			_this = this;

			_.each(_this.regionManager._regions, function (element, index) {
				element.on('show', function (view) {
					if (view.className) {
						App.ViewStack.push(view.className);
					}
					Vent.trigger('viewstack:push', view.className);
				});

				element.on('close', function (view) {
					App.ViewStack.pop();
					Vent.trigger('viewstack:pop', view.className);
				});
			});

			this.nativeWindow = require('nw.gui').Window.get();

			// Application events
			Vent.on('favorites:list', _.bind(this.showFavorites, this));
			Vent.on('watchlist:list', _.bind(this.showWatchlist, this));

			// generic providers list
			Vent.on('provider:list', _.bind(this.showProvider, this));

			// Add event to show disclaimer
			Vent.on('show:disclaimer', _.bind(this.showDisclaimer, this));
			Vent.on('close:disclaimer', _.bind(this.Disclaimer.close, this.Disclaimer));

			// Add event to show about
			Vent.on('about:show', _.bind(this.showAbout, this));
			Vent.on('about:close', _.bind(this.About.close, this.About));

			// Keyboard
			Vent.on('keyboard:show', _.bind(this.showKeyboard, this));
			Vent.on('keyboard:close', _.bind(this.Keyboard.close, this.Keyboard));
			Vent.on('keyboard:toggle', _.bind(this.toggleKeyboard, this));

			// Help
			Vent.on('help:show', _.bind(this.showHelp, this));
			Vent.on('help:close', _.bind(this.Help.close, this.Help));
			Vent.on('help:toggle', _.bind(this.toggleHelp, this));

			// Movies
			Vent.on('movie:showDetail', _.bind(this.showMovieDetail, this));
			Vent.on('movie:closeDetail', _.bind(this.closeMovieDetail, this.MovieDetail));

			// Tv Shows
			Vent.on('show:showDetail', _.bind(this.showShowDetail, this));
			Vent.on('show:closeDetail', _.bind(this.closeShowDetail, this.MovieDetail));

			// Settings events
			Vent.on('settings:show', _.bind(this.showSettings, this));
			Vent.on('settings:close', _.bind(this.Settings.close, this.Settings));

			Vent.on('system:openFileSelector', _.bind(this.showFileSelector, this));
			Vent.on('system:closeFileSelector', _.bind(this.FileSelector.close, this.FileSelector));

			Vent.on('system:traktAuthenticated', _.bind(this.syncTraktOnStart, this));

			// Stream events
			Vent.on('stream:started', _.bind(this.streamStarted, this));
			Vent.on('stream:ready', _.bind(this.streamReady, this));
			Vent.on('stream:local', _.bind(this.showPlayer, this));
			Vent.on('player:close', _.bind(this.showViews, this));
			Vent.on('player:close', _.bind(this.Player.close, this.Player));

			// Subtitles for tvShows
			Vent.on('subtitles:ready', _.bind(this.showSubtitles, this));

			Vent.on('updatePostersSizeStylesheet', _.bind(this.updatePostersSizeStylesheet, this));
		},

		showSubtitles: function (model) {
			var s = new App.View.Subtitles({
				model: model
			});
			s.render();
		},

		onShow: function () {
			this.Header.show(new App.View.TitleBar());
			// Set the app title (for Windows mostly)
			this.nativeWindow.title = Settings.get('title');

			// Show loading modal on startup
			var that = this;
			this.Content.show(new App.View.InitModal());

			console.log('init');

			Launch.init()
				.done(function () {

					Vent.trigger('main:ready');
					Vent.trigger('updatePostersSizeStylesheet');
					// Always on top
					win.setAlwaysOnTop(Settings.get('alwaysOnTop'));

					// we check if the disclaimer is accepted
					if (!Settings.get('disclaimerAccepted')) {
						that.showDisclaimer();
					}

					that.InitModal.close();


					var startScreen = Settings.get('startScreen');
					if (startScreen) {

						if (startScreen === 'Last Open') {
							var lastTab = Settings.get('lastTab');

							if (lastTab.type === 'pct-tab') {
								if (lastTab.id === 'Watchlist') {
									that.showWatchlist();
								} else if (lastTab.id === 'Favorites') {
									that.showFavorites();
								}
							} else {
								that.showProvider(lastTab.id);
							}

						} else {
							if (startScreen === 'Watchlist') {
								that.showWatchlist();
							} else if (startScreen === 'Favorites') {
								that.showFavorites();
							}
						}

					} else {
						that.showProvider(Tabs.first().provider);
					}


					// Focus the window when the app opens
					that.nativeWindow.focus();
				});

			// Cancel all new windows (Middle clicks / New Tab)
			this.nativeWindow.on('new-win-policy', function (frame, url, policy) {
				policy.ignore();
			});

			Mousetrap.bind('`', function () {
				$('.favorites').click();
			});

			Mousetrap.bind('i', function () {
				if (App.PlayerView === undefined || App.PlayerView.isClosed) {
					$('.about').click();
				}
			});


		},

		showProvider: function (provider) {

			if (provider === undefined) {
				provider = Tabs.first().provider;
			}

			this.Settings.close();
			this.MovieDetail.close();

			Providers.setActive(provider);
			this.Content.show(new App.View.ProviderBrowser());
		},

		showFavorites: function (e) {
			this.Settings.close();
			this.MovieDetail.close();

			this.Content.show(new App.View.FavoriteBrowser());
		},

		showWatchlist: function (e) {
			this.Settings.close();
			this.MovieDetail.close();

			this.Content.show(new App.View.WatchlistBrowser());
		},

		showDisclaimer: function (e) {
			this.Disclaimer.show(new App.View.DisclaimerModal());
		},

		showAbout: function (e) {
			this.About.show(new App.View.About());
		},

		showKeyboard: function (e) {
			this.Keyboard.show(new App.View.Keyboard());
		},

		toggleKeyboard: function (e) {
			if ($('.keyboard-container').length > 0) {
				Vent.trigger('keyboard:close');
			} else {
				this.showKeyboard();
			}
		},

		showHelp: function (e) {
			this.Help.show(new App.View.Help());
		},

		toggleHelp: function (e) {
			if ($('.help-container').length > 0) {
				Vent.trigger('help:close');
			} else {
				this.showHelp();
			}
		},

		preventDefault: function (e) {
			e.preventDefault();
		},

		showMovieDetail: function (movieModel) {
			this.MovieDetail.show(new App.View.MovieDetail({
				model: movieModel
			}));
		},

		closeMovieDetail: function (movieModel) {
			_this.MovieDetail.close();
			Vent.trigger('shortcuts:movies');
		},

		showShowDetail: function (showModel) {
			this.MovieDetail.show(new App.View.ShowDetail({
				model: showModel
			}));
		},

		closeShowDetail: function (showModel) {
			_this.MovieDetail.close();
			Vent.trigger('shortcuts:shows');
		},

		showFileSelector: function (fileModel) {
			Vent.trigger('stream:stop');
			Vent.trigger('player:close');
			this.FileSelector.show(new App.View.FileSelector({
				model: fileModel
			}));
		},

		showSettings: function () {
			this.Settings.show(new App.View.Settings({
				model: new Backbone.Model()
			}));
		},

		syncTraktOnStart: function () {
			if (Settings.get('syncOnStart')) {
				// @TODO: remove that and make it as a package...
				//Providers.get('trakttv').sync();
			}
		},

		streamStarted: function (stateModel) {

			// People wanted to keep the active
			// modal (tvshow/movie) detail open when
			// the streaming start.
			//
			// this.MovieDetail.close();
			//
			// uncomment previous line to close it

			this.Player.show(new App.View.Loading({
				model: stateModel
			}));
		},

		streamReady: function (streamModel) {
			App.Device.Collection.startDevice(streamModel);
		},

		showPlayer: function (streamModel) {
			this.Player.show(new App.View.Player({
				model: streamModel
			}));
			this.Content.$el.hide();
			if (this.MovieDetail.$el !== undefined) {
				this.MovieDetail.$el.hide();
			}
		},

		showViews: function (streamModel) {

			this.Content.$el.show();
			if (this.MovieDetail.$el !== undefined) {
				this.MovieDetail.$el.show();
			}
			$(window).trigger('resize');
		},

		updatePostersSizeStylesheet: function () {

			var that = this;
			var postersWidth = Settings.get('postersWidth');
			var postersHeight = Math.round(postersWidth * Settings.get('postersSizeRatio'));
			var postersWidthPercentage = (postersWidth - Settings.get('postersMinWidth')) / (Settings.get('postersMaxWidth') - Settings.get('postersMinWidth')) * 100;
			var fontSize = ((Settings.get('postersMaxFontSize') - Settings.get('postersMinFontSize')) * postersWidthPercentage / 100) + Settings.get('postersMinFontSize');

			var stylesheetContents = [
				'.list .items .item {',
				'width:', postersWidth, 'px;',
				'}',

				'.list .items .item .cover,',
				'.load-more {',
				'background-size: cover;',
				'width: ', postersWidth, 'px;',
				'height: ', postersHeight, 'px;',
				'}',

				'.item {',
				'font-size: ' + fontSize + 'em;',
				'}'
			].join('');

			$('#postersSizeStylesheet').remove();

			$('<style>', {
				'id': 'postersSizeStylesheet'
			}).text(stylesheetContents).appendTo('head');

			// Copy the value to Settings so we can get it from templates
			Settings.set('postersWidth', postersWidth);

			// Display PostersWidth
			var humanReadableWidth = Number(postersWidthPercentage + 100).toFixed(0) + '%';
			if (typeof App.currentview !== 'undefined') {
				that.ui.posterswidth_alert.show().text(i18n.__('Posters Size') + ': ' + humanReadableWidth).delay(3000).fadeOut(400);
			}

		}
	});

	App.View.MainWindow = MainWindow = MainWindow;
})(window.App);
