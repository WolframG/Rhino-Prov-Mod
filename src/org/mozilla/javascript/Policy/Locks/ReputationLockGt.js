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

var ReputationLockGt = function(lock) {
    // call the super class constructor
    ReputationLockGt.super_.call(this, lock);
}

Lock.registerLock("hasReputationGt", ReputationLockGt);

system.inherits(ReputationLockGt, Lock);

ReputationLockGt.prototype.copy = function() {
    var c = new ReputationLockGt(this);
    return c;
}

ReputationLockGt.prototype.handleUser = function(context) {
    var currentRepInfo = null;
    var idmInfo = null;

    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(context.subject.data.reputation) {
            currentRepInfo = context.subject.data;
        } else {
            if(context.subject && context.subject.data && context.subject.data.Reputation) {
                if(context.subject.data.id) {
                    var repArray = context.subject.data.Reputation.getReputationInfoSync([context.subject.data.id]);
                    currentRepInfo = repArray[0];
                }
            }
        }

        if(currentRepInfo && currentRepInfo.reputation) {
            var rep = parseFloat(currentRepInfo.reputation);
            if(rep > parseFloat(this.args[0]))
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock : this };
        }
        return { result : false, conditional : false, lock : this };
    }
};

ReputationLockGt.prototype.handleSO = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(parseFloat(context.subject.data.reputation) < parseFloat(this.args[0]))
            return { result : true, conditional : false };
        else
            return { result : false, conditional : false, lock : this };
    }
};

ReputationLockGt.prototype.handleSU = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        return { result : true, conditional : true };
    }
};

ReputationLockGt.prototype.handleMsg = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        return { result : true, conditional : true };
    }
};

ReputationLockGt.prototype.handleNode = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(!(context.subject && context.subject.data))
            throw new Error("Invalid context format to evaluate hasReputationLt lock.");
        
        // this node is part of an application 
        if(context.subject.data.instanceId) {
            if(!context.subject.data.Reputation)
                throw new Error("Invalid context format to evaluate hasReputationLt lock.");
            
            var node = context.subject.data;
            var valueArray = node.Reputation.getReputationInfoSync([node.instanceId]);
            var value = valueArray[0].reputation;

            if(parseFloat(value) > parseFloat(this.args[0]))
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock: this };
        } else {
            // if it is a regular node, let it flow
            return { result : true, conditional : true };
        }

        return { result : false, conditional : false, conflict : this };
    }
};

ReputationLockGt.prototype.handleApp = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported");
    } else {
        if(!(context.subject && context.subject.data))
            throw new Error("Invalid context format to evaluate hasReputationLt lock.");
        
        // this node is part of an application 
        if(!context.subject.data.remoteFlowId) {
            if(!context.subject.data.Reputation)
                throw new Error("Invalid context format to evaluate hasReputationLt lock.");

            var node = context.subject.data;
            var valueArray = node.Reputation.getReputationInfoSync([node.remoteFlowId]);
            var value = valueArray[0].reputation;
            if(parseFloat(value) > parseFloat(this.args[0]))
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock: this };
        } else {
            // if it is a regular node, let it flow
            return { result : true, conditional : false };
        }
    }
};

ReputationLockGt.prototype.isOpen = function(context) {
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
            throw new Error("hasReputationGt: Require context.subject information to evaluate lock");
        }
    } else {
        throw new Error("hasReputationGt: Require context information to evaluate lock.");
    }
};

ReputationLockGt.prototype.lub = function(lock) {
    if(this.eq(lock))
        return Lock.createLock(this);
    else {
        if(this.path == lock.path) {
            var value = parseFloat(lock.args[0]);
            var newLock = Lock.createLock(this);
            if(value > parseFloat(this.args[0]))
                newLock.args[0] = value;
            else 
                newLock.args[0] = this.args[0];
            
            return newLock;
        } if(lock.path == "hasReputationLt") {
            var value = parseFloat(lock.args[0]);
            if(value <= parseFloat(this.args[0])) 
                return Lock.closedLock();
            else
                return null;
        } else
        return null;
    }
};

ReputationLockGt.prototype.le = function(lock) {
    if(this.eq(lock))
        return true;
    else {
        if(this.path == lock.path) {
            if(parseFloat(this.args[0]) < parseFloat(lock.args[0]))
                return true;
        }             
        return false;
    }
};


if(global && typeof print !== "function")
    module.exports = ReputationLockGt;
