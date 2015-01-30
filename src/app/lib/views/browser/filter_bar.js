(function (App) {
	'use strict';
	var clipboard = gui.Clipboard.get(),
		Tabs = require('./lib/api').tabs,
		Settings = require('./lib/api').settings,
		Vent = require('./lib/api').vent;

	App.View.FilterBar = Backbone.Marionette.ItemView.extend({
		className: 'filter-bar',
		ui: {
			searchForm: '.search form',
			searchInput: '.search input',
			search: '.search',
			searchClear: '.search .clear',
			sorterValue: '.sorters .value',
			typeValue: '.types .value',
			genreValue: '.genres  .value'
		},
		events: {
			'hover  @ui.searchInput': 'focus',
			'submit @ui.searchForm': 'search',
			'contextmenu @ui.searchInput': 'rightclick_search',
			'click  @ui.searchClear': 'clearSearch',
			'click  @ui.search': 'focusSearch',
			'click .sorters .dropdown-menu a': 'sortBy',
			'click .genres .dropdown-menu a': 'changeGenre',
			'click .types .dropdown-menu a': 'changeType',
			'click #filterbar-settings': 'settings',
			'click #filterbar-about': 'about',
			'click #filterbar-favorites': 'showFavorites',
			'click #filterbar-watchlist': 'showWatchlist',
			'click .providers': 'changeProviderView'
		},

		templateHelpers: {
			tabs: function () {
				return Tabs.get();
			}
		},

		changeProviderView: function (e) {
			e.preventDefault();
			var provider = $(e.currentTarget).attr('data-provider');

			Vent.trigger('about:close');
			Vent.trigger('provider:list', provider);

			Settings.set('lastTab', {
				type: 'provider',
				id: provider
			});

			$('.filter-bar').find('.active').removeClass('active');
			$('.filter-bar #p-' + provider).addClass('active');
			$('.sorters .dropdown-menu a:nth(0)').addClass('active');
			$('.genres .dropdown-menu a:nth(0)').addClass('active');
			$('.types .dropdown-menu a:nth(0)').addClass('active');
		},

		focus: function (e) {
			e.focus();
		},

		rightclick_search: function (e) {
			e.stopPropagation();
			var search_menu = new this.context_Menu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'));
			search_menu.popup(e.originalEvent.x, e.originalEvent.y);
		},

		context_Menu: function (cutLabel, copyLabel, pasteLabel) {
			var gui = require('nw.gui'),
				menu = new gui.Menu(),

				cut = new gui.MenuItem({
					label: cutLabel || 'Cut',
					click: function () {
						document.execCommand('cut');
					}
				}),

				copy = new gui.MenuItem({
					label: copyLabel || 'Copy',
					click: function () {
						document.execCommand('copy');
					}
				}),

				paste = new gui.MenuItem({
					label: pasteLabel || 'Paste',
					click: function () {
						var text = clipboard.get('text');
						$('#searchbox').val(text);
					}
				});

			menu.append(cut);
			menu.append(copy);
			menu.append(paste);

			return menu;
		},
		onShow: function () {
			var startScreen = Settings.get('startScreen');
			if (startScreen) {

				if (startScreen === 'Last Open') {
					var lastTab = Settings.get('lastTab');

					if (lastTab.type === 'pct-tab') {
						$('#filterbar-' + lastTab.id.toLowerCase()).addClass('active');
					} else {
						$('.filter-bar #p-' + lastTab.id).addClass('active');
					}

				} else {
					if (startScreen === ('Favorites' || 'Watchlist')) {
						$('#filterbar-' + startScreen.toLowerCase()).addClass('active');
					}
				}

			} else {
				$('.filter-bar #p-' + Tabs.first().provider).addClass('active');
			}

			$('.sorters .dropdown-menu a:nth(0)').addClass('active');
			$('.genres .dropdown-menu a:nth(0)').addClass('active');
			$('.types .dropdown-menu a:nth(0)').addClass('active');

			this.$('.tooltipped').tooltip({
				delay: {
					'show': 800,
					'hide': 100
				}
			});

		},

		focusSearch: function () {
			this.$('.search input').focus();
		},

		search: function (e) {
			Vent.trigger('about:close');
			Vent.trigger('movie:closeDetail');
			e.preventDefault();
			var searchvalue = this.ui.searchInput.val();
			this.model.set({
				keywords: this.ui.searchInput.val(),
				genre: ''
			});

			this.ui.searchInput.blur();

			if (searchvalue === '') {
				this.ui.searchForm.removeClass('edited');
			} else {
				this.ui.searchForm.addClass('edited');
			}
		},

		clearSearch: function (e) {
			this.ui.searchInput.focus();

			Vent.trigger('about:close');
			Vent.trigger('movie:closeDetail');

			e.preventDefault();
			this.model.set({
				keywords: '',
				genre: ''
			});

			this.ui.searchInput.val('');
			this.ui.searchForm.removeClass('edited');

		},

		sortBy: function (e) {
			Vent.trigger('about:close');
			this.$('.sorters .active').removeClass('active');
			$(e.target).addClass('active');

			var sorter = $(e.target).attr('data-value');

			if (this.previousSort === sorter) {
				this.model.set('order', this.model.get('order') * -1);
			} else if (this.previousSort !== sorter && sorter === 'alphabet') {
				this.model.set('order', this.model.get('order') * -1);
			} else {
				this.model.set('order', -1);
			}
			this.ui.sorterValue.text(i18n.__(sorter.capitalizeEach()));

			this.model.set({
				keyword: '',
				sorter: sorter
			});
			this.previousSort = sorter;
		},

		changeType: function (e) {
			Vent.trigger('about:close');
			this.$('.types .active').removeClass('active');
			$(e.target).addClass('active');

			var type = $(e.target).attr('data-value');
			this.ui.typeValue.text(i18n.__(type));

			this.model.set({
				keyword: '',
				type: type
			});
		},

		changeGenre: function (e) {
			Vent.trigger('about:close');
			this.$('.genres .active').removeClass('active');
			$(e.target).addClass('active');

			var genre = $(e.target).attr('data-value');
			this.ui.genreValue.text(i18n.__(genre));

			this.model.set({
				keyword: '',
				genre: genre
			});
		},

		settings: function (e) {
			Vent.trigger('about:close');
			Vent.trigger('settings:show');
		},

		about: function (e) {
			Vent.trigger('about:show');
		},

		showFavorites: function (e) {
			e.preventDefault();

			Settings.set('lastTab', {
				type: 'pct-tab',
				id: 'Favorites'
			});
			Vent.trigger('about:close');
			Vent.trigger('favorites:list', []);

		},

		showWatchlist: function (e) {
			e.preventDefault();

			Settings.set('lastTab', {
				type: 'pct-tab',
				id: 'Watchlist'
			});
			Vent.trigger('about:close');
			Vent.trigger('watchlist:list', []);

			return false;
		}
	});

	App.View.FilterBar = App.View.FilterBar.extend({
		template: '#filter-bar-tpl'
	});

})(window.App);
