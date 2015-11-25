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

var AttributeLockGt = function(lock) {
    // call the super class constructor
    AttributeLockGt.super_.call(this, lock);
};

Lock.registerLock("hasAttributeGt", AttributeLockGt);

system.inherits(AttributeLockGt, Lock);

AttributeLockGt.prototype.copy = function() {
    var c = new AttributeLockGt(this);
    return c;
};

AttributeLockGt.prototype.getAttribute = function(attributes) {
    for(var g in attributes) {
        var attribute = attributes[g];
        if(attribute.attribute_definition_id == this.args[1] && 
           attribute.group_id == this.args[0]) {
            return attributes[g];
        }
    }
    return null;
};

// required for dynamic evaluation:
//    * context.subject.data.id - User id accessing the resource or
//    * context.subject.data.token - accesstoken of the user or
//    * context.subject.data.attributeValue - directly passed values for, e.g., a SO
//
//    * context.subject.data.idm - reference to idm to get info about current user
AttributeLockGt.prototype.handleUser = function(context) {
    var currentIDMInfo = null;

    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        if(context.subject.data.attributeValues) {
            currentIDMInfo = context.subject.data;
        } else {
            if(context.subject && context.subject.data && context.subject.data.idm) {
                if(context.subject.data.id) 
                    currentIDMInfo = context.subject.data.idm.getIDMInfo(context.subject.data.id);
                if(context.subject.data.token) 
                    currentIDMInfo = context.subject.data.idm.getAttributesByToken(context.subject.data.token);
            }
        }

        if(currentIDMInfo && currentIDMInfo.attributeValues) {
            var attribute = this.getAttribute(currentIDMInfo.attributeValues);
            var comp = false;
            if(attribute) {
                if(isNaN(attribute.value))
                    comp = (attribute.value > this.args[2]);
                else 
                    comp = (attribute.value > parseFloat(this.args[2]));
            }
            if(comp)
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock : this };
        }
        return { result : false, conditional : false, lock : this };
    }
};

// required for dynamic evaluation:
//    * context.subject.data - must contain the SO record for this SO
AttributeLockGt.prototype.handleSO = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        if(context.subject && context.subject.data && context.subject.data.attributeValues) {
            var attribute = this.getAttribute(context.subject.data.attributeValues);
            var comp = false;
            if(attribute) {
                if(isNaN(attribute.value))
                    comp = (attribute.value > this.args[2]);
                else 
                    comp = (attribute.value > parseFloat(this.args[2]));
            }
            if(comp)
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock: this };
        }
        return { result : false, conditional : false, lock : this };
    }
};

AttributeLockGt.prototype.handleSU = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        // TODO let it flow for now
        return { result : true, conditional : true };
    }
};

AttributeLockGt.prototype.handleMsg = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        // TODO: Simply let it flow for now - check group of wrapper app?
        return { result : true, conditional : true };
    }
};

// required for dynamic evaluation:
//    * context.subject.data.instanceId - ID of application this node is embedded inside
//
//    * context.subject.data.idm - reference to idm to get info about the embedding application
AttributeLockGt.prototype.handleNode = function(context) {
    var currentIDMInfo = null;

    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        if(context.subject && context.subject.data) {
            if(context.subject.data.instanceId) {
                if(context.subject.data.idm)
                    currentIDMInfo = context.subject.data.idm.getIDMInfoSync(context.subject.data.instanceId);
            } else {
                return { result : true, conditional : true };
            }
        } else
            throw new Error("Invalid subject context format (no subject data delivered)");
        
        if(currentIDMInfo && currentIDMInfo.attributeValues) {
            var attribute = this.getAttribute(currentIDMInfo.attributeValues);
            var comp = false;
            if(attribute) {
                if(isNaN(attribute.value))
                    comp = (attribute.value > this.args[2]);
                else 
                    comp = (attribute.value > parseFloat(this.args[2]));
            }
            if(comp)
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock: this };
        }
        return { result : false, conditional : false, lock : this };
    }
};

// required for dynamic evaluation:
//    * context.subject.data.remoteFlowId - ID of application this node points to
//
//    * context.subject.data.idm - reference to idm to get info about the embedding application
AttributeLockGt.prototype.handleApp = function(context) {
    var currentIDMInfo = null;

    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        if(context.subject && context.subject.data) {
            if(context.subject.data.remoteFlowId) {
                if(context.subject.data.idm) {
                    currentIDMInfo = context.subject.data.idm.getIDMInfoSync(context.subject.data.remoteFlowId);
                }
            } else {
                return { result : true, conditional : true };
            }
        } else {
            throw new Error("Invalid subject context format (no subject data provided)");
        }
        
        if(currentIDMInfo && currentIDMInfo.attributeValues) {
            var attribute = this.getAttribute(currentIDMInfo.attributeValues);
            var comp = false;
            if(attribute) {
                if(isNaN(attribute.value))
                    comp = (attribute.value < this.args[2]);
                else 
                    comp = (attribute.value < parseFloat(this.args[2]));
            }
            if(comp)
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock: this };
        }
        return { result : false, conditional : false, lock : this };
    }
};

AttributeLockGt.prototype.isOpen = function(context) {
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
        }
    } else {
        throw new Error("AttributeLockGt: Require context information to evaluate lock.");
    }
};

AttributeLockGt.prototype.lub = function(lock) {
    if(this.eq(lock))
        return Lock.createLock(this);
    else {
        var attributeValue = this.args[2];
        var comp = false;
        if(isNaN(attributeValue))
            comp = (this.args[2] > lock.args[2]);
        else {
            comp = (parseFloat(this.args[2]) > lock.args[2]);
        }

        if(this.path == lock.path && this.args[0] == lock.args[0] && this.args[1] == lock.args[1] && this.not == lock.not) {
            if(comp) 
                return Lock.createLock(this);
            else
                return Lock.createLock(lock);
        } if(lock.path == "hasAttributeLt" && this.args[0] == lock.args[0] && this.args[1] == lock.args[1] && this.not == lock.not) {
            if(comp) 
                return Lock.closedLock();
            else
                // both locks should be integrated
                return null;
        } if(lock.path == "hasAttributeEq" && this.args[0] == lock.args[0] && this.args[1] == lock.args[1] && this.not == lock.not) {
            if(comp) 
                return Lock.closedLock();
            else
                return Lock.createLock(lock);
        } else {
            return null;
        }
    }
};

AttributeLockGt.prototype.le = function(lock) {
    if(this.eq(lock))
        return true;
    else { 
        if(this.path == lock.path && this.args[0] == lock.args[0] && this.args[1] == lock.args[1]) {
            var attributeValue = this.args[2];
            var comp = false;
            if(isNaN(attributeValue))
                comp = (this.args[2] > lock.args[2]);
            else 
                comp = (parseFloat(this.args[2]) > lock.args[2]);

            if(comp)
                return true;
        }
        return false;
    }
};

if(global && typeof print !== "function")
    module.exports = AttributeLockGt;
