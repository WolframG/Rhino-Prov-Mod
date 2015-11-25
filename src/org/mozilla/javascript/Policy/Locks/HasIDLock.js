/**
 * Copyright 2015 Daniel Schreckling
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

if(global && typeof print !== "function") {
    var PolicyConfig = require("./../PolicyConfig.js");
    var Lock = require(PolicyConfig.rootDir + "./../Lock.js");
    var system = require(PolicyConfig.rootDir + "./../system.js");
}

var HasIDLock = function(lock) {
    // call the super class constructor
    HasIDLock.super_.call(this, lock);
};

Lock.registerLock("hasID", HasIDLock);

system.inherits(HasIDLock, Lock);

HasIDLock.prototype.copy = function() {
    var c = new HasIDLock(this);
    return c;
}

HasIDLock.prototype.handleUser = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(context.subject.data.reputation > this.args[0])
            return { result : true, conditional : false };
        else
            return { result : false, conditional : false, lock : this };
    }
};

HasIDLock.prototype.handleSO = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(context.subject.data.id == this.args[0])
            return { result : true, conditional : false };
        else
            return { result : false, conditional : false, lock : this };
    }
};

HasIDLock.prototype.handleSU = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        // TODO
        return { result : true, conditional : false };
    }
};

HasIDLock.prototype.handleMsg = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        // TODO
        return { result : true, conditional : false };
    }
};

HasIDLock.prototype.handleNode = function(context) {
    // TODO
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        // TODO
        return { result : true, conditional : false };
    }
};

HasIDLock.prototype.handleApp = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        // TODO
        return { result : true, conditional : false };
    }
};

HasIDLock.prototype.isOpen = function(context) {
    if(context) {
		if(context.subject) {
            switch(context.subject.type) {
            case "node" : { 
                return this.handleNode(context);
                break; 
            }
            case "user" : { 
                return this.handleUser(context);
                break;
            }
            case "app" : { 
                return this.handleApp(context);
                break;
            }
            case "so" : { 
                return this.handleSO(context);
                break;
            }
            case "su" : { 
                return this.handleSU(context);
                break;
            }
            case "msg" : {
                return this.handleMsg(context);
                break;
            }
            default : {
                throw new Error("Unknown context type");
            }
            }
        } else {
            throw new Error("HasIDLock: Require context.subject information to evaluate lock");
        }
        throw new Error("HasIDLock: Require context information to evaluate lock.");
    }
};

HasIDLock.prototype.lub = function(lock) {
    if(this.eq(lock))
		return this;
    else {
        if(this.path == lock.path)
            return Lock.closedLock();
        else
            return null;
    }
}

if(global && typeof print !== "function")
    module.exports = HasIDLock;
