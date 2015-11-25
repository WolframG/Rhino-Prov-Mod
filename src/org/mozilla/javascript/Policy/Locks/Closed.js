"use strict";

if(global && typeof print !== "function") {
    var PolicyConfig = require("./../PolicyConfig.js");
    var Lock = require(PolicyConfig.rootDir + "./../Lock.js");
    var system = require(PolicyConfig.rootDir + "./../system.js");
}

var ClosedLock = function(lock) {
    // call the super class constructor
    ClosedLock.super_.call(this, lock);
}

Lock.registerLock("closed", ClosedLock);

system.inherits(ClosedLock, Lock);

ClosedLock.prototype.copy = function() {
    var c = new Closed();
    return c;
}

ClosedLock.prototype.eq = function(lock) {
    return (lock.path == this.path) && (this.not == lock.not);
}

ClosedLock.prototype.isOpen = function(context) {
    return { open : false, conditional : false };
}

ClosedLock.prototype.lub = function(lock) {
    return Lock.createLock(this);
}

ClosedLock.prototype.toString = function(lock) {
    return "[[ closed ]]";
}

if(global && typeof print !== "function")
    module.exports = ClosedLock;
