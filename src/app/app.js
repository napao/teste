var MIN_PERCENTAGE_LOADED = 0.5,
	MIN_SIZE_LOADED = 10 * 1024 * 1024,
	gui = require('nw.gui'),
	win = gui.Window.get(),
	os = require('os'),
	path = require('path'),
	fs = require('fs-plus'),
	url = require('url'),
	i18n = require('i18n'),
	mime = require('mime'),
	moment = require('moment'),
	Q = require('q'),
	Handlebars = require('handlebars'),
	// we init our entire api
	api = require('./lib/api'),
	// required in this run
	Settings = api.settings,
	ThemesManager = api.themes,
	Localization = api.localization,
	Vent = api.vent;

// Special Debug Console Calls!
win.log = console.log.bind(console);
win.debug = function () {
	var params = Array.prototype.slice.call(arguments, 1);
	params.unshift('%c[%cDEBUG%c] %c' + arguments[0], 'color: black;', 'color: green;', 'color: black;', 'color: blue;');
	console.debug.apply(console, params);
};
win.info = function () {
	var params = Array.prototype.slice.call(arguments, 1);
	params.unshift('[%cINFO%c] ' + arguments[0], 'color: blue;', 'color: black;');
	console.info.apply(console, params);
};
win.warn = function () {
	var params = Array.prototype.slice.call(arguments, 1);
	params.unshift('[%cWARNING%c] ' + arguments[0], 'color: orange;', 'color: black;');
	console.warn.apply(console, params);
};
win.error = function () {
	var params = Array.prototype.slice.call(arguments, 1);
	params.unshift('%c[%cERROR%c] ' + arguments[0], 'color: black;', 'color: red;', 'color: black;');
	console.error.apply(console, params);
};

if (gui.App.fullArgv.indexOf('--reset') !== -1) {

	var data_path = require('nw.gui').App.dataPath;

	localStorage.clear();
	indexedDB.deleteDatabase('cache');

	fs.unlinkSync(path.join(data_path, 'data/watched.db'), function (err) {
		if (err) {
			throw err;
		}
	});
	fs.unlinkSync(path.join(data_path, 'data/movies.db'), function (err) {
		if (err) {
			throw err;
		}
	});
	fs.unlinkSync(path.join(data_path, 'data/bookmarks.db'), function (err) {
		if (err) {
			throw err;
		}
	});
	fs.unlinkSync(path.join(data_path, 'data/shows.db'), function (err) {
		if (err) {
			throw err;
		}
	});
	fs.unlinkSync(path.join(data_path, 'data/settings.db'), function (err) {
		if (err) {
			throw err;
		}
	});
}

// Global App skeleton for backbone
var App = new Backbone.Marionette.Application();
_.extend(App, {
	Controller: {},
	View: {},
	Model: {},
	Page: {},
	Scrapers: {},
	Providers: {},
	Localization: {}
});

// Handlebars render engine
Backbone.Marionette.Renderer.render = function (template, data) {
	return Handlebars.compile($(template).html())(data);
};
Handlebars.registerHelper('_', function (text) {
	return i18n.__(text);
});
Handlebars.registerHelper('settings', function (key) {
	return Settings.get(key);
});
Handlebars.registerHelper('if_settings', function (key, value, options) {
	if (!options) {
		options = value;
		value = true;
	}
	var setting = Settings.get(key);
	if (!_.isArray(setting) && setting === value) {
		return options.fn(this);
	} else if (_.isArray(setting) && _.contains(setting, value)) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});
Handlebars.registerHelper('each_settings', function (key, options) {
	var ret = '';

	var items = Settings.get(key);

	for (var i = 0, j = items.length; i < j; i++) {
		ret = ret + options.fn(items[i]);
	}

	return ret;
});
Handlebars.registerHelper('pluralize', function (number, single, plural) {
	if (number === 1) {
		return single;
	} else {
		return plural;
	}
});

Handlebars.registerHelper('languageTitle', function (lang) {
	return Localization.langcodes[lang].nativeName;
});

Handlebars.registerHelper('date', function (date) {
	return moment.unix(date).lang(Settings.get('language')).format('LLLL');
});

Handlebars.registerHelper('capitalize', function (data) {
	return data.charAt(0).toUpperCase() + data.slice(1);
});

Handlebars.registerHelper('capitalizeEach', function (data) {
	return data.replace(/\w*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
});

Handlebars.registerHelper('xif', function (v1, operator, v2, options) {

	switch (operator) {
	case '==':
		return (v1 === v2) ? options.fn(this) : options.inverse(this);
	case '===':
		return (v1 === v2) ? options.fn(this) : options.inverse(this);
	case '<':
		return (v1 < v2) ? options.fn(this) : options.inverse(this);
	case '<=':
		return (v1 <= v2) ? options.fn(this) : options.inverse(this);
	case '>':
		return (v1 > v2) ? options.fn(this) : options.inverse(this);
	case '>=':
		return (v1 >= v2) ? options.fn(this) : options.inverse(this);
	case '&&':
		return (v1 && v2) ? options.fn(this) : options.inverse(this);
	case '||':
		return (v1 || v2) ? options.fn(this) : options.inverse(this);
	default:
		return options.inverse(this);
	}
});

// Gui
App.gui = gui;

// Handles language detection and internationalization
i18n.configure({
	defaultLocale: 'en',
	locales: Localization.allTranslations,
	directory: './src/content/languages'
});

fs.readFile('./.git.json', 'utf8', function (err, json) {
	if (!err) {
		App.git = JSON.parse(json);
	}
});

App.addRegions({
	Window: '.main-window-region'
});

App.ActiveProvider = {
	filters: false,
	config: false
};


//Keeps a list of stacked views
App.ViewStack = [];

/**
 * TO be moved
 */
var ScreenResolution = {
	get SD() {
		return window.screen.width < 1280 || window.screen.height < 720;
	},
	get HD() {
		return window.screen.width >= 1280 && window.screen.width < 1920 || window.screen.height >= 720 && window.screen.height < 1080;
	},
	get FullHD() {
		return window.screen.width >= 1920 && window.screen.width < 2000 || window.screen.height >= 1080 && window.screen.height < 1600;
	},
	get UltraHD() {
		return window.screen.width >= 2000 || window.screen.height >= 1600;
	},
	get QuadHD() {
		return window.screen.width >= 3000 || window.screen.height >= 1800;
	},
	get Standard() {
		return window.devicePixelRatio <= 1;
	},
	get Retina() {
		return window.devicePixelRatio > 1;
	}
};

App.addInitializer(function (options) {
	// this is the 'do things with resolutions and size initializer
	var zoom = 0;
	var screen = window.screen;

	if (ScreenResolution.QuadHD) {
		zoom = 2;
	} else if (ScreenResolution.UltraHD || ScreenResolution.Retina) {
		zoom = 1;
	}

	var width = parseInt(localStorage.width ? localStorage.width : Settings.get('defaultWidth'));
	var height = parseInt(localStorage.height ? localStorage.height : Settings.get('defaultHeight'));
	var x = parseInt(localStorage.posX ? localStorage.posX : -1);
	var y = parseInt(localStorage.posY ? localStorage.posY : -1);

	// reset app width when the width is bigger than the available width
	if (screen.availWidth < width) {
		win.info('Window too big, resetting width');
		width = screen.availWidth;
	}

	// reset app height when the width is bigger than the available height
	if (screen.availHeight < height) {
		win.info('Window too big, resetting height');
		height = screen.availHeight;
	}

	// reset x when the screen width is smaller than the window x-position + the window width
	if (x < 0 || (x + width) > screen.width) {
		win.info('Window out of view, recentering x-pos');
		x = Math.round((screen.availWidth - width) / 2);
	}

	// reset y when the screen height is smaller than the window y-position + the window height
	if (y < 0 || (y + height) > screen.height) {
		win.info('Window out of view, recentering y-pos');
		y = Math.round((screen.availHeight - height) / 2);
	}

	win.zoomLevel = zoom;
	win.resizeTo(width, height);
	win.moveTo(x, y);
});

var initTemplates = function () {

	// Load in external templates
	var ts = [];

	// Set the CSS
	var css = ThemesManager.config.css;

	// hack for now, we'll use
	// the first element in theme package.json

	ThemesManager.getActiveCss(function (css) {
		$('head').append('<link rel="stylesheet" href="' + css.path + '" type="text/css" />');
	});

	ThemesManager.getTemplates(function (templates) {
		_.each(templates, function (el) {

			var d = Q.defer();
			$.get(el.path, function (res) {
				var s = document.createElement('script');
				s.type = 'text/x-template';
				s.src = el.path;
				s.id = el.key;
				s.innerHTML = res;
				$('body').append(s);
				d.resolve(true);
			});

			ts.push(d.promise);

		});
	});

	return Q.all(ts);
};


var initApp = function () {
	var mainWindow = new App.View.MainWindow();
	win.show();

	try {
		App.Window.show(mainWindow);
	} catch (e) {
		console.error('Couldn\'t start app: ', e, e.stack);
	}
};

App.addInitializer(function (options) {
	initTemplates()
		.then(initApp);
});

/**
* Windows 8 Fix
* https://github.com/rogerwang/node-webkit/issues/1021#issuecomment-34358536
 # commented this line so we can watch movies withou the taskbar showing always

if(process.platform === 'win32' && parseFloat(os.release(), 10) > 6.1) {
	gui.Window.get().setMaximumSize(screen.availWidth + 15, screen.availHeight + 14);
};

*/

var deleteFolder = function (path) {

	if (typeof path !== 'string') {
		return;
	}

	try {
		var files = [];
		if (fs.existsSync(path)) {
			files = fs.readdirSync(path);
			files.forEach(function (file, index) {
				var curPath = path + '\/' + file;
				if (fs.lstatSync(curPath).isDirectory()) {
					deleteFolder(curPath);
				} else {
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(path);
		}
	} catch (err) {
		win.error('deleteFolder()', err);
	}
};

win.on('resize', function (width, height) {
	localStorage.width = Math.round(width);
	localStorage.height = Math.round(height);
});

win.on('move', function (x, y) {
	localStorage.posX = Math.round(x);
	localStorage.posY = Math.round(y);

});

// Wipe the tmpFolder when closing the app (this frees up disk space)
win.on('close', function () {
	if (Settings.get('deleteTmpOnClose')) {
		deleteFolder(Settings.get('tmpLocation'));
	}
	deleteFolder(path.join(os.tmpDir(), 'torrent-stream'));
	win.close(true);
});


// Developer Shortcuts
Mousetrap.bind(['shift+f12', 'f12', 'command+0'], function (e) {
	win.showDevTools();
});
Mousetrap.bind(['shift+f10', 'f10', 'command+9'], function (e) {
	console.log('Opening: ' + Settings.get('tmpLocation'));
	gui.Shell.openItem(Settings.get('tmpLocation'));
});
Mousetrap.bind('mod+,', function (e) {
	Vent.trigger('about:close');
	Vent.trigger('settings:show');
});
Mousetrap.bind('f11', function (e) {
	var spawn = require('child_process').spawn,
		argv = gui.App.fullArgv,
		CWD = process.cwd();

	argv.push(CWD);
	spawn(process.execPath, argv, {
		cwd: CWD,
		detached: true,
		stdio: ['ignore', 'ignore', 'ignore']
	}).unref();
	gui.App.quit();
});
Mousetrap.bind(['?', '/', '\''], function (e) {
	e.preventDefault();
	Vent.trigger('keyboard:toggle');
});
Mousetrap.bind('shift+up shift+up shift+down shift+down shift+left shift+right shift+left shift+right shift+b shift+a', function () {
	$('body').addClass('knm');
});
if (process.platform === 'darwin') {
	Mousetrap.bind('command+ctrl+f', function (e) {
		e.preventDefault();
		win.toggleFullscreen();
	});
} else {
	Mousetrap.bind('ctrl+alt+f', function (e) {
		e.preventDefault();
		win.toggleFullscreen();
	});
}


/**
 * Pass magnet link as last argument to start stream
 */
var last_arg = gui.App.argv.pop();

if (last_arg && (last_arg.substring(0, 8) === 'magnet:?' || last_arg.substring(0, 7) === 'http://' || last_arg.endsWith('.torrent'))) {
	Vent.on('main:ready', function () {
		// DO SOMETHING WITH 'last_arg' DATA LATER
	});
}

// -f argument to open in fullscreen
if (gui.App.fullArgv.indexOf('-f') !== -1) {
	win.enterFullscreen();
}

/**
 * Show 404 page on uncaughtException
 */
process.on('uncaughtException', function (err) {
	window.console.error(err, err.stack || false);
});
