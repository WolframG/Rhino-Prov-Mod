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
    var PolicyConfig = require("./PolicyConfig");
    var Entity = require(PolicyConfig.rootDir + "./Entity.js");
}

var lockConstructors = {};

// ## Constructor
var Lock = function(lock) {

    /* if(this.constructor === Object) {
       throw new Error("Error: Lock: Can't instantiate an abstract class!");
       } */

    /* if(!lockConstructors == {}) {
        Lock.initLocks();
    }*/

    if(this.constructor === Object &&
       lock && lock.path && lockConstructors[lock.path]) {
        throw new Error("Lock: Use Lock.createLock to generate Locks of type '"+lock.path+"'");
    } else {
        if(lock === undefined) {
            this.path = "";
            this.args = [];
            this.not = false;
        } else {
            if(lock.path === undefined)
                throw new Error("Error: Lock does not specify a path");

            this.path = lock.path;
            if(lock.args !== undefined) {
                var l = lock.args.length;
                this.args = []

                for(var i = 0; i < l; i++) {
                    if(lock.args[i].type) {
                        this.args[i] = new Entity(lock.args[i]);
                    }
                    else
                        this.args[i] = lock.args[i];
                }
            }
            if(lock.not === undefined)
                this.not = false;
            else
                this.not = lock.not;
        }
    }
};

// ## Static Methods
Lock.createLock = function(lock) {
    if(!lockConstructors[lock.path]) {
        Lock.initLocks();
    }
    
    if(!lock)
        return new Lock();
    
    if(!(lock instanceof Lock) && !lock.path) {
        throw new Error("Lock: Cannot create a lock from other than a Lock!");
        return null;
    }
    
    // handle malformed SO lock specification
    if(lock.path && lock.path === "locks/actsFor") {
        lock = { path : "actsFor", args : [ lock.args[1].id ] };
    }
    
    if(!lockConstructors[lock.path]) {
        throw new Error("Lock '"+lock.path+"' does not exist!");
        return null;
    }
    
    return new (lockConstructors[lock.path])(lock);
};

Lock.closedLock = function() {
    return Lock.createLock({ path : "closed" });
};

Lock.openLock = function() {
    return Lock.createLock({ path : "open" });
};

Lock.registerLock = function (type, constructor) {
    if(!lockConstructors)
        lockConstructors = {};

    if(lockConstructors[type])
        // throw new Error(type+" is already a registered lock.");
        return;

    if(!constructor)
        throw new Error("Constructor for "+type+" is invalid.");

    lockConstructors[type] = constructor;
};

// TODO: This static method should be replaced by a version which can
// automaticall load locks from a directory. For now, all locks are registered manually
Lock.initLocks = function() {
    if(global && typeof print !== "function") {                
        // at some point the directory should also be read automatically
        // all Locks which should be available

        if(!TimePeriodLock)
            var TimePeriodLock = require(PolicyConfig.lockDir+"TimePeriodLock.js");
        if(!UserLock)
            var UserLock = require(PolicyConfig.lockDir+"UserLock.js");
        if(!ActsForLock)
            var ActsForLock = require(PolicyConfig.lockDir+"ActsForLock.js");
        if(!ClosedLock)
            var ClosedLock = require(PolicyConfig.lockDir+"Closed.js");
        if(!HasIDLock)
            var HasIDLock = require(PolicyConfig.lockDir+"HasIDLock.js");
        if(!ReputationLockLt)
            var ReputationLockLt = require(PolicyConfig.lockDir+"ReputationLockLt.js");
        if(!ReputationLockGt)
            var ReputationLockGt = require(PolicyConfig.lockDir+"ReputationLockGt.js");
        if(!AttributeLock)
            var AttributeLock = require(PolicyConfig.lockDir+"AttributeLock.js");
        if(!AttributeLockLt)
            var AttributeLockLt = require(PolicyConfig.lockDir+"AttributeLockLt.js");
        if(!AttributeLockGt)
            var AttributeLockGt = require(PolicyConfig.lockDir+"AttributeLockGt.js");
        if(!AttributeLockEq)
            var AttributeLockEq = require(PolicyConfig.lockDir+"AttributeLockEq.js");
        if(!GroupLock) 
            var GroupLock = require(PolicyConfig.lockDir+"GroupLock.js");
    }
};

// Public Methods
Lock.prototype = {
    neg : function() {
        this.not = !this.not;

        return this;
    },

    toString : function() {
        var str = "[[ ";

        if(this.not === true)
            str += "not ";
        
        str += this.path;
        
        if(this.args !== undefined) {
            var l = this.args.length - 1;
            
            if(l >= 0)
                str += "(";
            
            this.args.forEach(function(e,i) {
                str += e;
                if(i < l)
                    str += ", ";
                else
                    str += ")";
            });
        }
        str += " ]]";
        
        return str;
    },

    // **method isOpen** must be overwritten by the corresponding lock class
    isOpen : function(lockContext) {
        throw new Error("Lock: isOpen is required to be overwritten");
    },

    // function tries to merge this lock with the argument lock
    // returns a new lock if successful, null otherwise
    lub : function(lock) {
        if(!lock || !lock.path)
            throw new Error("Error: lub(lock): lock is not valid.");

        if(this.path === lock.path) {
            if(this.path === "inTimePeriod") {
                return this.lub(lock);
            }

            // if the second lock is also a hasID lock, then
            // the locks must be identical as no two entities
            // can have the same ID if they reference the same
            // entitiy
            if(this.path === "hasID" ||
               this.path === "ownedBy" ||
               this.path === "attrValueEq") {
                if(!this.eq(lock))
                    return new Lock();
                else
                    return this;
            }

            if(this.path === "authenticated" ||
               this.path === "inGroup" ||
               this.path === "attrIsValidated" ||
               this.path === "hasAttribute" ||
               this.path === "originatesFrom" ||
               this.path === "modifiedBy" ||
               this.path === "processedBy" ||
               this.path === "encrypted" ||
               this.path === "integrity" ||
               this.path === "filtered" ||
               this.path === "anonymized") {
                if(this.eq(lock))
                    return this;
                else {
                    if(this.neg().eq(lock))
                        return new Lock();
                    else
                        return null;
                }
            }

            if(this.path === "hasReputationLt") {
                if(!this.eq(lock)) {
                    if(this.args[0] === lock.args[0])
                        this.args[1] = parseFloat(this.args[1]) < parseFloat(lock.args[1]) ? this.args[1] : lock.args[1];
                    else
                        return null;
                }
                return this;
            }

            if(this.path === "hasReputationGt") {
                if(!this.eq(lock)) {
                    if(this.args[0] === lock.args[0])
                        this.args[1] = parseFloat(this.args[1]) > parseFloat(lock.args[1]) ? this.args[1] : lock.args[1];
                    else
                        return null;
                }
                return this;
            }

            if(this.path === "attrValueLt") {
                if(!this.eq(lock)) {
                    if(this.args[0] === lock.args[0] &&
                       this.args[1] === lock.args[1])
                        this.args[2] = parseFloat(this.args[2]) < parseFloat(lock.args[2]) ? this.args[2] : lock.args[2];
                    else
                        return null;
                }
                return this;
            }

            if(this.path === "attrValueGt") {
                if(!this.eq(lock)) {
                    if(this.args[0] === lock.args[0] &&
                       this.args[1] === lock.args[1])
                        this.args[2] = parseFloat(this.args[2]) > parseFloat(lock.args[2]) ? this.args[2] : lock.args[2];
                    else
                        return null;
                }
                return this;
            }

            throw new Error("Error: Unknown lock specified in policy!");

        } else
            return null;
    },

    eq : function(lock) {
        if(!lock)
            return false;

        if(!(this.path === undefined && lock.path === undefined)) {
            if(this.path === undefined || lock.path === undefined)
                return false;
            else
                if(this.path != lock.path)
                    return false;
        }

        if(!(this.not === undefined && lock.not === undefined)) {
            if(this.not === undefined || lock.not === undefined)
                return false;
            else
                if(this.not != lock.not)
                    return false;
        }

        if(!(this.args === undefined && lock.args === undefined)) {
            if(this.args === undefined || lock.args === undefined)
                return false;
            else {
                for(var i in this.args) {
                    if(this.args[i] && this.args[i].type) {
                        if(JSON.stringify(this.args[i]) !== JSON.stringify(lock.args[i]))
                            return false;
                    } else {
                        if(this.args[i] != lock.args[i])
                            return false;
                    }
                }
            }
        }

        return true;
    },

    // returns true if lock is less restrictive than this lock
    le : function (lock) {
        if(this.path != lock.path)
            return false;

        switch(this.path) {
        case 'inTimePeriod':
            var start1 = this.args[0];
            var end1 = this.args[1];
            var start2 = lock.args[0];
            var end2 = lock.args[1];

            if(start1 <= start2 && end1 >= end2)
                return true;
            return false;
        case 'isUser':
            return this.args[0] === lock.args[0] && this.args[1] === lock.args[1];
        case 'hasID':
        case 'isGroupMember' :
            return this.args[0] == lock.args[0];

        case 'isOwnedBy' :
            return this.args[0] == lock.args[0];
        default:
            throw("Error: Lock: Unknown lock in le");
        }
    }
};

if(global && typeof print !== "function")
    module.exports = Lock;
