"use strict";

var system = function() {};

system.inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
	constructor: {
	    value: ctor,
	    enumerable: false,
	    writable: true,
	    configurable: true
	}
    });
}

if(global && typeof print !== "function") {
    module.exports = system;
} else {
		var console = {};
		console.log = function() {
		};
}
