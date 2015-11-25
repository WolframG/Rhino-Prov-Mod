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

var UserLock = function(lock) {
    // call the super class constructor
    UserLock.super_.call(this, lock);
};

Lock.registerLock("isUser", UserLock);

system.inherits(UserLock, Lock);

UserLock.prototype.copy = function() {
    var c = new UserLock(this);
    return c;
};

UserLock.prototype.handleUser = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        if (context.subject.data.id == this.args[0]) {
            return { result : true, conditional : false };
        } else {
            return { result : false, conditional : false, lock : this };
        }
    }
};

UserLock.prototype.handleSO = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        return { result : false, conditional : false, lock : this };
    }
};

UserLock.prototype.handleSU = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        return { result : false, conditional : false, lock : this };
    }
};

UserLock.prototype.handleMsg = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        return { result : false, conditional : false, lock : this };
    }
};

UserLock.prototype.handleNode = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        return { result : false, conditional : false, lock : this };
    }
};

UserLock.prototype.handleApp = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        return { result : false, conditional : false, lock : this };
    }
};

UserLock.prototype.isOpen = function(context) {
    if(context && context.subject) {
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
        throw new Error("No subject defined for UserLock evalution");
    }
};

UserLock.prototype.le = function(lock) {
    if(this.eq(lock))
        return true;
    else
        return false;
};

UserLock.prototype.lub = function(lock) {
    if(this.eq(lock)) {
        return Lock.createLock(this);
    } else {
        if(this.path == lock.path)
            return Lock.closedLock();
        else
            return null;
    }
};

if(global && typeof print !== "function")
    module.exports = UserLock;
