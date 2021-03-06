var CSON = require('season'),
	path = require('path'),
	fs = require('fs-plus'),
	_ = require('lodash'),
	Q = require('q'),
	App = window.App,
	ProxyApp,
	SandboxApp,
	__slice = [].slice,
	Package,
	Sandbox = require('./sandbox'),
	ProxyModule = require('./proxy');

/*
 * Construction
 */
function Package(path, metadata, imports) {
	var _ref1, _ref2;
	this.path = path;
	this.metadata = metadata;
	this.imports = imports;
	this.bundledPackage = false;

	if (this.metadata == null) {

		try {
			this.metadata = Package.loadMetadata(this.path);
		} catch (e) {
			console.log(e);
		}

	}

	this.name = (_ref1 = (_ref2 = this.metadata) != null ? _ref2.name : void 0) != null ? _ref1 : path.basename(this.path);

	// setup proxy app
	ProxyApp = new ProxyModule({
		name: this.name,
		permissions: {
			providers: ['set', 'get']
		}
	});

	SandboxApp = new Sandbox();
	console.log('Loading package: ' + this.name);
}

Package.prototype.keymaps = null;
Package.prototype.menus = null;
Package.prototype.mainModule = null;

/*
 * Load Meta Data from package.json
 */
Package.loadMetadata = function (packagePath, ignoreErrors) {
	var app_path = process.execPath;
	var error, metadata, metadataPath;
	if (ignoreErrors == null) {
		ignoreErrors = false;
	}
	if (metadataPath = CSON.resolve(path.join(packagePath, 'package'))) {

		try {
			metadata = CSON.readFileSync(metadataPath);
		} catch (e) {
			throw e;
		}
	}

	if (metadata == null) {
		metadata = {};
	}

	metadata.name = path.basename(packagePath);
	//console.debug(metadata);
	return metadata;
};

Package.prototype.measure = function (key, fn) {
	var startTime, value;
	startTime = Date.now();
	value = fn();
	this[key] = Date.now() - startTime;
	return value;
};

Package.prototype.load = function () {

	this.measure('loadTime', (function (_this) {
		return function () {
			var error, _ref1;
			try {

				// do all we need here
				_this.loadKeymaps();

				// activation command
				if (!_this.hasActivationCommands()) {

					// no activation command defined
					// in package.json so we require the main module

					return _this.requireMainModule();
				}

			} catch (e) {
				console.log('Failed to activate package named ' + this.name, e.stack);
				return false;
			}
		};
	})(this));

	return this;

};

/*
 * TODO: Need to load the translation as well
 * When a package is enabled, we activate it
 */
Package.prototype.activate = function () {
	//if (this.grammarsPromise == null) {
	//    this.grammarsPromise = this.loadGrammars();
	//}

	if (this.activationDeferred == null) {
		this.activationDeferred = Q.defer();
		this.measure('activateTime', (function (_this) {
			return function () {
				_this.activateResources();
				return _this.activateNow();
			};
		})(this));
	}
	return Q.all([this.activationDeferred.promise]);
};

Package.prototype.activateNow = function () {
	var e, _ref1;
	try {
		// TODO: Maybe the plugin should have
		// his own config ?
		//this.activateConfig();

		if (this.requireMainModule()) {

			var _app;
			if (_.isFunction(this.mainModule)) {
				_app = new this.mainModule(ProxyApp, this.metadata, this.imports);
			} else {
				_app = this.mainModule;
			}

			this.bundledPackage = _app;

			// activate the package
			if (_.isFunction(_app.__activate)) {

				_app.__activate();
				this.mainActivated = true;

				this.loadSettings();
				this.loadAuthentification();

			} else {
				console.log('Rejected');
				this.activationDeferred.reject();

			}
		}
	} catch (e) {
		console.log('Failed to activate package named ' + this.name, e.stack);
		this.activationDeferred.reject();
	}

	return this.activationDeferred.resolve();
};

/*
 * Keymapin'
 */
Package.prototype.loadKeymaps = function () {
	return this.keymaps = this.getKeymapPaths().map(function (keymapPath) {
		return [keymapPath, CSON.readFileSync(keymapPath)];
	});
};


Package.prototype.loadSettings = function () {
	if (this.mainActivated) {
		return this.settings = this.bundledPackage.settings || {};
	} else {
		return {};
	}
};

Package.prototype.loadAuthentification = function () {
	if (this.mainActivated) {
		return this.authentification = this.bundledPackage.authentification || {};
	} else {
		return {};
	}
};

Package.prototype.getKeymapPaths = function () {
	var keymapsDirPath;
	keymapsDirPath = path.join(this.path, 'keymaps');
	if (this.metadata.keymaps) {
		return this.metadata.keymaps.map(function (name) {
			return fs.resolve(keymapsDirPath, name, ['json', 'cson', '']);
		});
	} else {
		return fs.listSync(keymapsDirPath, ['cson', 'json']);
	}
};

/*
 * TODO
 * Here we map the keys witht he right package function
 * If the package include a lang file, we include it as well
 */
Package.prototype.activateResources = function () {

	// enable keymap

	// load lanaguage file ?

	return this.scopedPropertiesActivated = true;
};

/*
 * Function to load the module within the app using
 * the sandbox
 */
Package.prototype.requireMainModule = function () {
	try {
		var mainModulePath;
		if (this.mainModule != null) {
			return this.mainModule;
		}
		if (!this.isCompatible()) {
			return;
		}
		mainModulePath = this.getMainModulePath();
		if (fs.isFileSync(mainModulePath)) {
			return this.mainModule = SandboxApp.loadApp(this.mainModulePath);
		}
	} catch (e) {
		console.log(e);
		return false;
	}
};

/*
 * Get Main Module Path (to be required)
 */
Package.prototype.getMainModulePath = function () {
	var mainModulePath;
	if (this.resolvedMainModulePath) {
		return this.mainModulePath;
	}
	this.resolvedMainModulePath = true;
	mainModulePath = this.metadata.main ? path.join(this.path, this.metadata.main) : path.join(this.path, 'index');
	return this.mainModulePath = fs.resolveExtension(mainModulePath, [''].concat(__slice.call(_.keys(require.extensions))));
};

/*
 * Check if package is compatible
 */
Package.prototype.isCompatible = function () {
	return this.compatible = true;
};

/*
 * Custom activation command (not supported right now)
 */

Package.prototype.hasActivationCommands = function () {
	return false;
};

Package.prototype.getActivationCommands = function () {
	return this.activationCommands;
};

Package.prototype.subscribeToActivationCommands = function () {
	var _results = [];
	return _results;
};

module.exports = Package;
