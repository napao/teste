var settings = require('./settings'),
    localization = require('./localization'),
    database = require('./database'),
    packages = require('./packages'),
    themes = require('./themes'),
    updater = require('./updater'),
    providers = require('./providers'),
    tabs = require('./tabs'),
    vent = require('./vent'),
    player = require('./player');
/**
 * ## Public API
 */
module.exports = {
    localization: localization,
	settings: settings,
    database: database,
    packages: packages,
    themes: themes,
    updater: updater,
    providers: providers,
    tabs: tabs,
    vent: vent,
	player: player
};
