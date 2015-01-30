var path = require('path'),
	_ = require('underscore'),
	fs = require('fs'),
	Settings = require('../settings'),
    activeTheme = false,
    themePath = false,
    init = false;

/*
 * Construction
 */

var ThemeManager = {

    // name and path of the active theme
    name: false,
    rootPath: path.join('/', 'src', 'content', 'themes'),
    themePath: false,
    themeDirPaths: false,
    config: false,

    loadTheme: function () {
        ThemeManager.name = Settings.get('activeTheme');
    	ThemeManager.themePath = path.join(ThemeManager.rootPath, ThemeManager.name);
    	ThemeManager.themeDirPaths = path.join(process.cwd(), ThemeManager.themePath);

    	ThemeManager.config = ThemeManager.themeDirPaths + '/package.json';

    	if (fs.existsSync(ThemeManager.themeDirPaths) && fs.existsSync(ThemeManager.config)) {
    		ThemeManager.config = require(ThemeManager.config);
    		Settings.set('theme_path', path.join(ThemeManager.themePath), false);
    	} else {
    		console.log('unable to initialize the theme ' + ThemeManager.name);
    		process.exit();
    	}
    },

    getTemplates: function (callback) {
    	// we read the package.json

    	var templates = [];

    	_.each(ThemeManager.config.templates, function (file, key) {
    		templates.push({
    			key: key + '-tpl',
    			path: path.join(ThemeManager.themePath, file)
    		});
    	});

    	callback(templates);
    },

    getAllCss: function (callback) {
    	// we read the package.json

    	var css = [];
    	_.each(ThemeManager.config.css, function (file, key) {
    		css.push({
    			key: key,
    			path: path.join(ThemeManager.themePath, file)
    		});
    	});

    	return css;
    },

    getAllThemes: function (callback) {
    	// we simply list the dir for now
    	// maybe we can read the package.json and make it more nice
    	return fs.readdirSync(path.join(process.cwd(), ThemeManager.rootPath));
    },

    getActiveCss: function (callback) {
    	if (Settings.get('activeCss')) {
    		var cssKey = Settings.get('activeCss');
    		// we check if this css is still valid... for this theme
    		if (ThemeManager.config.css[cssKey]) {
    			callback({
    				key: cssKey,
    				path: path.join(ThemeManager.themePath, ThemeManager.config.css[cssKey])
    			});
    			return;
    		}
    	}

    	// send the first css found in package.json
    	var newCss = {
    		key: Object.keys(ThemeManager.config.css)[0],
    		path: path.join(ThemeManager.themePath, ThemeManager.config.css[Object.keys(ThemeManager.config.css)[0]])
    	};

    	Settings.set('activeCss', newCss.key);
    	callback(newCss);
    	return;
    }

};


if (!init) {
	ThemeManager.loadTheme();
	init = true;
}

module.exports = ThemeManager
