// We use our builtin event manager in marionette
// we simply expose the function, if we need to
// make logic for our packages it can be defined here

//var _ = require('lodash');

module.exports = {

    on: function(key, fn) {
        window.App.vent.on(key, fn);
    },

    once: function(key, fn) {
        window.App.vent.once(key, fn);
    },

    trigger: function(key, value) {
        window.App.vent.trigger(key, value);
    }

};
