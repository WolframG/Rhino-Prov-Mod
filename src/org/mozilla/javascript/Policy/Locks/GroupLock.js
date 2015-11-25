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

var GroupLock = function(lock) {
    // call the super class constructor
    GroupLock.super_.call(this, lock);
}

Lock.registerLock("inGroup", GroupLock);

system.inherits(GroupLock, Lock);

GroupLock.prototype.copy = function() {
    var c = new GroupLock(this);
    return c;
};

GroupLock.prototype.isMember = function(groups) {
    var isMember = false;
    for(var g in groups) {
        var group = groups[g];
        if(group.group_id == this.args[0]) {
            isMember = true;
            break;
        }
    }

    return isMember;
};

// required for dynamic evaluation:
//    * context.subject.data.id - User id accessing the resource or
//    * context.subject.data.token - accesstoken of the user
//
//    * context.subject.data.idm - reference to idm to get info about current user
GroupLock.prototype.handleUser = function(context) {
    var currentIDMInfo = null;
    var isMember = false;

    if(context.isStatic) {
        throw new Error("Not support for static eval yet");
    } else {
        // group membership already passed to the call (e.g. when checked in servIoTicy)
        if(context.subject.data.approvedMemberships) {
            currentIDMInfo = context.subject.data;
        } else {
            if(context.subject && context.subject.data && context.subject.data.idm) {
                if(context.subject.data.id) 
                    currentIDMInfo = context.subject.data.idm.getIDMInfoSync(context.subject.data.id);
                if(context.subject.data && context.subject.data.token) 
                    currentIDMInfo = context.subject.data.idm.getAttributesByToken(context.subject.data.token);
            }
        }
        
        if(currentIDMInfo && currentIDMInfo.approvedMemberships) {
            isMember = this.isMember(currentIDMInfo.approvedMemberships);
            if(isMember)
                return { result : true, conditional : false };
        }
        return { result : false, conditional : false, lock : this };    
    }
};

// required for dynamic evaluation:
//    * context.subject.data - must contain the SO record for this SO
GroupLock.prototype.handleSO = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        if(context && context.subject && context.subject.data) {
            var isMember = this.isMember(context.subject.data.groups);
            if(isMember)
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, lock : this };
        } else {
            throw new Error("Invalid context.subject format");
        }
    }
};

// required for dynamic evaluation:
//    * nothing (however, indicate lock as conditionally open (state will not be added to context))
GroupLock.prototype.handleSU = function(context) {
    if(context.isStatic) {
        throw new Error("Not supported yet");
    } else {
        // TODO let it flow for now
        return { result : true, conditional : true };
    }
};

// required for dynamic evaluation:
//    * nothing (however, indicate lock as conditionally open (state will not be added to context)
GroupLock.prototype.handleMsg = function(context) {
    if(context.isStatic) {
        return { result : true, conditional : true };
    } else {
        return { result : true, conditional : true };
    }
};

// required for static evaluation: 
//    There is no instance ID in the static case as this application does not exist yet!
//    Ignore the lock conflicts in this case!
//
// required for dynamic evaluation:
//    * context.subject.data.instanceId - the id of the application this node is embedded inside
//    * context.subject.data.idm - the reference to IDM cache to get the latest info about the embedding flow
GroupLock.prototype.handleNode = function(context) {
    var currentIDMInfo = null;
    var isMember = false;

    if(context.isStatic) {
        return { result : true, conditional : true };    
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

        if(currentIDMInfo && currentIDMInfo.groups) {
            isMember = this.isMember(currentIDMInfo.groups);
            if(isMember)
                return { result : true, conditional : false };
        }

        return { result : false, conditional : false, lock : this };
    }
};

// required for dynamic evaluation:
//    * context.subject.data.remoteFlowId - the id of the remotely running application
//    * context.subject.data.idm - the reference to IDM cache to get the latest info about the remote flow
GroupLock.prototype.handleApp = function(context) {
    var currentIDMInfo = null;
    var isMember = false;

    if(context.isStatic) {

        if(context.subject.data && context.subject.data.remoteFlowId) 
            currentIDMInfo = context.subject.data.idm.getIDMInfoSync(context.subject.data.remoteFlowId);

        if(currentIDMInfo) {
            isMember = this.isMember(currentIDMInfo.groups);
            if(isMember)
                return { result : true, conditional : false };
        }
        return { result : false, conditional : false, lock : this };
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

        if(currentIDMInfo && currentIDMInfo.groups) {
            isMember = this.isMember(currentIDMInfo.groups);
            if(isMember)
                return { result : true, conditional : false };
            
        }
        return { result : false, conditional : false, lock : this };
    }
};

GroupLock.prototype.isOpen = function(context) {
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
        throw new Error("GroupLock: Require context information to evaluate lock.");
    }
};

GroupLock.prototype.lub = function(lock) {
    if(this.eq(lock))
        return Lock.createLock(this);
    else {
        return null;
    }
};

GroupLock.prototype.le = function(lock) {
    if(this.eq(lock))
        return true;
    else
        return false;
};

if(global && typeof print !== "function")
    module.exports = GroupLock;
