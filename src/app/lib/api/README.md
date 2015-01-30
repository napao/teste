# API

### What's this?

In 0.4 almost everything pass by the API.
It exposes everything required by the `Popcorn Time` core as a node module.

### How it works ?

Simple as hell. In the `app.js` the entire api is intialized.
That's include Database, Settings, updater and other stuff.

If you need to access the settings from a controllers, models, views or anythings else use the api !

```
    var Settings = require('./lib/api').settings
    Settings.get('myKey')
```

You can dig in `index.js` to view all available endpoints.
