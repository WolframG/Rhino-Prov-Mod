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

var ActsForLock = function(lock) {
    // call the super class constructor
    ActsForLock.super_.call(this, lock);
};

Lock.registerLock("actsFor", ActsForLock);

system.inherits(ActsForLock, Lock);

ActsForLock.prototype.copy = function() {
    var c = new ActsForLock(this);
    return c;
}

ActsForLock.prototype.handleUser = function(context) {
    if(context && context.isStatic) {
        throw new Error("Not supported"); 
    } else {
        // a user is always acting for himself in all other cases
        // we have to return false as we do not support delegation yet
        if(context.subject.data.id == this.args[0])
            return { result : true, conditional : false };
        
        return { result : false, conditional : false, lock : this };
    }
};

ActsForLock.prototype.handleSO = function(context) {
    if(context && context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(context.subject.data.owner_id == this.args[0])
            return { result : true, conditional : false };
        else
            return { result : false, conditional : false, lock : this };
    }
};

ActsForLock.prototype.handleSU = function(context) {
    if(context && context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(context.object.data.owner_id == this.args[0])
            return { result : true, conditional : false };
        else
            return { result : false, conditional : false, lock : this };
    }
};

ActsForLock.prototype.handleMsg = function(context) {
    if(context && context.isStatic) {
        var open = undefined;
        if(context && context.locks)
            open = context.locks.getLockState(this, context.subject);
        
        var conflict = undefined;
        if(!open) {
            conflict = this;
            open = false;
        }
        var result = { result : open, conditional : false, lock : conflict };
        return result;
    } else {
        return { result : true, conditional : true };
    }
};

// required for dynamic evaluation:
//    * context.object.data.userInfo - id of the user currently sending data to the flow 
//                                   (as stored in the message) or the owner of the flow
ActsForLock.prototype.handleNode = function(context) {
    if(context && context.isStatic) {
        return { result : true, conditional : false };
    } else {
        if(context.subject && context.subject.data) {
            if(context.subject.data.userInfo == null) {
                return { result : false, conditional : false, lock : this };
            } else {
                if(context.subject.data.userInfo.id == this.args[0])
                    return { result : true, conditional : false };
                else
                    return { result : false, conditional : false, lock : this };
            }
        } else {
            throw new Error("Invalid context.subject format to evaluate lock");
        }
    }
};

// required for dynamic evaluation: 
//    * context.object.data.userInfo - id of the user currently sending data to the flow 
//                                   (as stored in the message) or the owner of the flow
ActsForLock.prototype.handleApp = function(context) {
    if(context && context.isStatic) {
        return { result : false, conditional : false, lock : this };
    } else {
        if(context.subject && context.subject.data) {
            if(context.subject.data.userInfo == null) {
                return { result : false, conditional : false, lock : this };
            } else {
                if(context.subject.data.userInfo.id == this.args[0])
                    return { result : true, conditional : false };
                else
                    return { result : false, conditional : false, lock : this };
            }
        } else {
            throw new Error("Invalid context.subject format to evaluate lock");
        }
    }
};

ActsForLock.prototype.isOpen = function(context) {
    // console.log("ActsForLock.prototype.isOpen");
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
            throw new Error("ActsForLock: Require context.subject information to evaluate lock");
        }
    } else {
        throw new Error("ActsForLock: Require context information to evaluate lock.");
    }
};

ActsForLock.prototype.lub = function(lock) {
    if(this.eq(lock))
        return Lock.createLock(this);
     else {
        if(this.path == lock.path)
            return Lock.closedLock();
        else
            return null;
    }
};

ActsForLock.prototype.le = function(lock) {
    if(this.eq(lock))
        return true;
    else
        return false;
};

if(global && typeof print !== "function")
    module.exports = ActsForLock;
