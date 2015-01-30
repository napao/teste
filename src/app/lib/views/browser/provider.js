(function (App) {
	'use strict';
	var Providers = require('./lib/api').providers;

	App.View.ProviderBrowser = App.View.PCTBrowser.extend({
		collectionModel: App.Model.Collection.extend({
			getProviders: function () {
				var subtitles = false,
					metadata = false;

				if (Providers.getActive().config.subtitle !== false) {
					subtitles = Providers.get(Providers.getActive().config.subtitle);
				}

				if (Providers.getActive().config.metadata !== false) {
					metadata = Providers.get(Providers.getActive().config.metadata);
				}

				return {
					torrents: [Providers.getActive()],
					subtitle: subtitles,
					metadata: metadata
				};
			}
		})
	});

})(window.App);
