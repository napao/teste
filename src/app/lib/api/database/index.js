var _ = require('lodash'),
	Datastore = require('nedb'),
	path = require('path'),
	Q = require('q'),
	fs = require('fs-plus'),
	cachedDatabase = [],
	// active database
	activeDatabase = [{
		name: 'settings',
		unique: ['key'],
		path: 'data/settings.db'
	}, {
		name: 'bookmarks',
		unique: ['imdb_id'],
		path: 'data/bookmarks.db'
	}, {
		name: 'tvshows',
		unique: ['imdb_id', 'tvdb_id'],
		path: 'data/shows.db'
	}, {
		name: 'movies',
		unique: ['imdb_id'],
		path: 'data/movies.db'
	}, {
		name: 'watched',
		unique: [],
		path: 'data/watched.db'
	}],
	init = false;
console.log(init);

// some helper
function promisifyDatastore(datastore) {
	datastore.insert = Q.denodeify(datastore.insert.bind(datastore));
	datastore.update = Q.denodeify(datastore.update.bind(datastore));
	datastore.remove = Q.denodeify(datastore.remove.bind(datastore));
}

function promisifyDb(obj) {
	return Q.Promise(function (resolve, reject) {
		obj.exec(function (error, result) {
			if (error) {
				return reject(error);
			} else {
				return resolve(result);
			}
		});
	});
}

var DatabaseManager = {

	path: fs.absolute('~/.popcorntime'),

	initialize: function () {
		cachedDatabase = [];

		console.debug('Database path: ' + DatabaseManager.path);

		// Create our new Datastore for each activeDatabase
		_.each(activeDatabase, function (database) {

			var _this = new Datastore({
				filename: path.join(DatabaseManager.path, database.path),
				autoload: true
			});

			promisifyDatastore(_this);

			_.each(database.unique, function (uniqueKey) {
				_this.ensureIndex({
					fieldName: uniqueKey,
					unique: true
				});

			});
			cachedDatabase[database.name] = _this;

		});
	},

	add: function (database, data) {
		return cachedDatabase[database].insert(data);
	},

	get: function (database, data) {
		return promisifyDb(cachedDatabase[database].findOne(data));
	},

	find: function (database, data, offset, byPage) {
		data = data || {};
		offset = offset || false;
		byPage = byPage || false;

		if (offset && byPage) {
			return promisifyDb(cachedDatabase[database].find(data).skip(offset).limit(byPage));
		} else {
			return promisifyDb(cachedDatabase[database].find(data));
		}
	},

	update: function (database, key, data) {
		return DatabaseManager.get(database, key)
			.then(function (result) {
				if (result) {
					return cachedDatabase[database].update(key, {
						$set: data
					}, {});
				} else {
					return cachedDatabase[database].insert(_.merge(key, data));
				}
			});
	},

	delete: function (database, data, multi) {
		multi = multi || false;
		return cachedDatabase[database].remove(data, {
			multi: multi
		});
	},

	deleteDatabase: function () {

		return Q.Promise(function (resolve, reject) {

			_.each(activeDatabase, function (database) {
				fs.unlinkSync(path.join(DatabaseManager.path, database.path));
			});

			resolve();
		});
	}

}

if (!init) {
	DatabaseManager.initialize();
	init = true;
}

module.exports = DatabaseManager;
