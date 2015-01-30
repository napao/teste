var Q = require('q'),
	path = require('path'),
	_ = require('underscore'),
	fs = require('fs-plus'),
	Package = require('./package'),
	__slice = [].slice,
	packagePaths = [],
    packageDirPaths = [],
    loadedPackages = {},
    activePackages = {},
    init = false;

var PackageManager = {

    initialize: function() {
    	// default packages ?
    	packageDirPaths.push(path.join(process.cwd(), 'src', 'content', 'packages'));
    	// package installed by PPM
    	packageDirPaths.push(path.join(fs.absolute('~/.popcorntime'), 'packages'));
	},

    getAvailablePackagePaths: function () {
    	packagePaths = [];

    	// return our packages paths
    	_.each(packageDirPaths, function (packageDirPath) {
    		_.each(fs.listSync(packageDirPath), function (packagePath) {
    			if (fs.isDirectorySync(packagePath)) {
    				packagePaths.push(packagePath);
    			}
    		});
    	});

    	return _.uniq(packagePaths);
    },

    loadPackages: function (callback) {

    	return Q.Promise(function (resolve, reject) {
    		packagePaths = PackageManager.getAvailablePackagePaths();

    		_.each(packagePaths, function (packagePath) {
    			try {
    				PackageManager.loadPackage(packagePath);
    			} catch (error) {
    				return console.log('Failed to load package ' + (path.basename(packagePath)), error);
    			}
    		});

    		// once all packages are loaded we trigger the
    		// afterActivate event available
    		_.each(loadedPackages, function (myPackage) {
    			if (_.isFunction(myPackage.bundledPackage.afterActivate)) {
    				try {
    					myPackage.bundledPackage.afterActivate();
    				} catch (e) {
    					throw e;
    				}
    			}
    		});

    		return resolve();
    	});
    },

    loadPackage: function (nameOrPath) {
    	var error, metadata, name, pack, packagePath, _ref, _ref1;

    	// already loaded?
    	if (pack = PackageManager.getLoadedPackage(nameOrPath)) {
    		return pack;
    	}

    	if (packagePath = PackageManager.resolvePackagePath(nameOrPath)) {
    		name = path.basename(nameOrPath);
    		if (pack = PackageManager.getLoadedPackage(name)) {
    			return pack;
    		}
    		try {

    			metadata = (_ref = Package.loadMetadata(packagePath)) != null ? _ref : {};
				var imports = [];

				if (metadata.packageDependencies) {
					// this package consume another package
					// we should check if it's available...
					_.each(metadata.packageDependencies, function(version, deps) {
						console.log('Loading depedencies', deps);
						// version managed by ppm so not really needed here for now
						// but if we have to make some logic for it, it should happen here
						if (!loadedPackages[deps]) {
							// Try to load the package
							try {
								var tryLoading = PackageManager.loadPackage(deps);
								if (_.isFunction(tryLoading.bundledPackage.afterActivate)) {
				    				try {
				    					tryLoading.bundledPackage.afterActivate();
				    				} catch (e) {
				    					throw e;
				    				}
				    			}
								if (tryLoading.bundledPackage) {
									imports[deps] = tryLoading.bundledPackage;
								} else {
									throw new Error('Skiping loading of ' + name + ', ' + deps + ' can\'t be bundled ');
								}
							} catch (e) {
								throw new Error('Skiping loading of ' + name + ', ' + deps + ' not available ', e);
							}

						} else {
							imports[deps] = loadedPackages[deps].bundledPackage;
						}
					});
				}

    			pack = new Package(packagePath, metadata, imports);

    			pack.load();
    			pack.activate();

    			//console.log('Loaded ' + name + ' in ' + pack.loadTime + 's');

    			loadedPackages[pack.name] = pack;
    			return pack;

    		} catch (_error) {
    			error = _error;
    			return console.log('Failed to load package ' + (path.basename(packagePath)), (_ref1 = error.stack) != null ? _ref1 : error);
    		}
    	} else {
    		throw new Error('Could not resolve ' + nameOrPath + ' to a package path');
    	}
    },

    getLoadedPackages: function () {
    	return _.values(loadedPackages);
    },

    getLoadedPackage: function (name) {
    	return loadedPackages[name];
    },

    resolvePackagePath: function (name) {
    	var packagePath;
    	if (fs.isDirectorySync(name)) {
    		return name;
    	}
    	packagePath = fs.resolve.apply(fs, __slice.call(packageDirPaths).concat([name]));

    	if (fs.isDirectorySync(packagePath)) {
    		return packagePath;
    	}
    }

};

if (!init) {
	PackageManager.initialize();
	init = true;
}

module.exports = PackageManager;
