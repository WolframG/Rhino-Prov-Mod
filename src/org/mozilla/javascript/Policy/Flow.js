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
    var PolicyConfig = require("./PolicyConfig.js");
    var Lock = require(PolicyConfig.rootDir + "./Lock.js");
    var Entity = require(PolicyConfig.rootDir + "./Entity.js");
}

var Flow = (function() {
    
    // Constructor
    var cls = function(flow) {
        if(!flow) {
            throw new Error("Flow: Error: Cannot construct flow from undefined flow.");
        }

        if(!flow.source && !flow.target) {
            throw new Error("Flow: Error: Flow '"+JSON.stringify(flow)+"' does not specify source or target.");
        } 

        if(flow.source && flow.target) {
            throw new Error("Flow: Error: Flow specifies source and target at the same time.");
        }

        if(flow.source) {
            this.source = new Entity(flow.source);
        } else {
            this.source = null;
        }

        if(flow.target) {
            this.target = new Entity(flow.target);
        } else {
            this.target = null;
        }

        if(flow.locks && flow.locks.length) {
            var l = flow.locks.length;
            if(l > 0) {
                this.locks = [];
                for(var i = 0; i < l; i++) {
                    this.locks[i] = Lock.createLock(flow.locks[i]);
                }
            }
        } else
            this.locks = null;
    };

    cls.gid = 0;

    cls.prototype = {
        hasSrc : function() {
            return this.source !== null;
        },

        hasTrg : function() {
            return this.target !== null;
        },

        eq : function(otherFlow) {
            if(this.target && !this.target.eq(otherFlow.target) ||
               this.source && !this.source.eq(otherFlow.source)) {
                return false;
            }

            if(!this.locks && this.locks !== otherFlow.locks) {
                return false;
            }

            if(this.locks) {
                if(this.locks.length !== otherFlow.locks.length) {
                    return false;
                }

                var matched = [];
                for(var i in this.locks) {
                    var found = false;
                    for(var k in otherFlow.locks) {
                        if(this.locks[i].eq(otherFlow.locks[k])) {
                            found = true;
                            matched[k] = true;
                            // console.log("***" + this.locks[i] + " === " + otherFlow.locks[k]);
                        } /*else {
                            console.log("***" + this.locks[i] + " !== " + otherFlow.locks[k]);
                            }*/
                    }
                    if(!found) {
                        // console.log("4 ("+this.locks[i]+")");
                        return false;
                    }
                }

                for(var k in otherFlow.locks)
                    if(matched[k] !== true)
                        return false;
            }

            return true;
        },

        le : function(otherFlow) {
            // console.log("LE: "+this+" <= "+otherFlow);

            var conflictLocks = [];
            var result = undefined;

            // incompatible flows to be compared
            if((this.target !== null && otherFlow.source !== null) ||
               (this.source !== null && otherFlow.target !== null))
                return undefined;

            if(!this.source && !this.target)
                return false;

            if(!otherFlow.source && !otherFlow.target)
                return true;

            if(this.target) {
                if(!this.target.dominates(otherFlow.target))
                    return false;
            } else {
                if(!this.source.dominates(otherFlow.source))
                    return false;
            }

            var complies = true;
            var covered = [];

            for(var l1 in this.locks) {
                var lock1 = this.locks[l1];
                
                if(!otherFlow.locks || otherFlow.locks.length === 0) {
                    complies = false;
                    continue;
                }
                
                for(var l2 in otherFlow.locks) {
                    var lock2 = otherFlow.locks[l2];
                    if(lock1.path === lock2.path) {
                        // console.log("cmp "+lock1+" and "+lock2);
                        if(lock1.le(lock2)) {
                            // console.log("** set true **");
                            covered[l1] = true;
                        } else {
                            // TODO RECORD CONFLICT FOR CONFLICT RESOLUTION
                        }
                    }
                }
            }
            
            var complies = true;
            if(this.locks && this.locks.length) {
                for(var l1 in this.locks) {
                    if(!covered[l1]) {
                        // console.log("CONFLICT: "+JSON.stringify(otherFlow.locks[l2]));
                        complies = false;
                    }
                }
            }
            // console.log("\t=> "+complies);

            return complies;
        },

        getClosedLocks : function(context) {
            var conflictLocks = [];
            var allopen = true;
            var conditional = false;
            var resLocks = [];

            if(this.locks !== null) {
                var f = this;
                this.locks.forEach(function(lock, i) {
                    var s = undefined;

                    // console.log("lock: "+lock);
                    // console.log("Current lock state: ",context.locks);

                    // check whether lockstate is already in context
                    if(context) {
                        s = context.getLockState(lock, context.subject);
                    }
                    // console.log("LOCK STATE: ",s);
                    // console.log("CONTEXT STATE: ",context.isStatic);
                    
                    // lock state is not know => compute it
                    if(s == undefined) {
                        s = lock.isOpen(context);
                        // console.log("compute state of "+lock+": ",s);
                        // console.log("sibject is: ",context.subject);
                        if(context && s && s.conditional == false)
                            context.addLockState(lock, context.subject, s.result);
                    } else {
                        s = { result : s, conditional : false, lock : lock };
                    }
                    
                    allopen = allopen && s.result;
                    conditional = conditional || s.conditional;

                    if(!s.result || s.conditional) {
                        // s.id = f.id;
                        if(s.lock) {
                            conflictLocks.push(s.lock);
                        }
                    }
                });

                if(conflictLocks.length) {
                    var dummyFlow = new Flow({ target : { type : 'any' } });
                    for(var cl in conflictLocks) {
                        dummyFlow.locks = dummyFlow.lubLock(conflictLocks[cl]);
                    }
                    resLocks = dummyFlow.locks;
                }
            }

            var result = { allopen : allopen, conditional : conditional };

            if(resLocks && resLocks.length)
                result.locks = resLocks;

            // console.log("getClosedLocks result: ", result);

            return result;
        },

        // multiplies the locks in this flow with the lock in factor
        // this method assumes that the array of locks is always
        // minimal, i.e. there are no redundant locks
        lubLock : function(factor) {
            var l = this.locks ? this.locks.length : 0;
            var newLocks = [];
            var merged = false;
            var conflict = false;
            
            /* 
             console.log("-----------------------");
             console.log("this: "+this);
             console.log("Factor: "+factor);
             */
            
            
            var lock = factor.copy();

            for(var i = 0; i < l; i++) {
                var newLock = this.locks[i].lub(lock);
                // if the lub returns null, we cannot compute it
                if(newLock) {
                    if(newLock.path.length) {
                        newLocks.push(newLock);
                        merged = true;
                    } else 
                        throw new Error("Flow: The result of the least upper bound must be either null or a real lock. However, the lock '"+JSON.stringify(newLock)+"' was generated from '"+this.locks[i]+"' and '"+lock+"'");
                } else {
                    newLocks.push(this.locks[i]);
                }
            }
            
            if(!merged) {
                newLocks.push(lock);
            }

            return newLocks;
        },

        lub : function(flow) {
            // console.log("\n*** lub(\n\t"+this+",\n\t"+flow+") --> ");
            
            // flows are incompatible and there is
            // no upper bound on them; we would need
            // a new policy for this
            if(this.source && !flow.source ||
               this.target && !flow.target) {
                // console.log("Error: try to lub source and target flow");
                return null;
            } else {
                var newFlow = new Flow(this);
                
                if(this.target) {
                    if(this.target.dominates(flow.target) || flow.target.dominates(this.target)) {
                        if(this.target.dominates(flow.target))
                            newFlow.target = new Entity(flow.target);
                        else
                            newFlow.target = new Entity(this.target);
                    } else 
                        return null;
                } else if(this.source) {
                    if(this.source.dominates(flow.source) || flow.source.dominates(this.source)) {
                        if(this.source.dominates(flow.source))
                            newFlow.source = new Entity(flow.source);
                        else 
                            newFlow.source = new Entity(this.source);
                    } else
                        return null;
                }

                var fl = flow.locks ? flow.locks.length : 0;
                for(var i = 0; i < fl; i++) {
                    newFlow.locks = newFlow.lubLock(flow.locks[i]);
                }

                // console.log("Result: "+newFlow);
                
                return newFlow;
            }
        },

        toString : function() {
            var str = "";
            var l = this.locks ? this.locks.length : 0;

            if(this.source === null) {
                if(this.locks) {
                    this.locks.forEach(function(lock,i) {
                        str += lock;
                        if(i < l - 1)
                            str += " ^ ";
                    });
                } else
                    str += "always";
                str = "{"+str+" ==> "+this.target+"}";
            } else {
                str = "{"+this.source+" ==> ";
                if(this.locks) {
                    this.locks.forEach(function(lock,i) {
                        str += lock;
                        if(i < l - 1)
                            str += " ^ ";
                    });
                } else
                    str += "always";
                str += "}";
            }
            return str;
        },

        compile2PolicyEval : function() {
            var srctrg = this.source ? this.source.compile2PolicyEval() : this.target.compile2PolicyEval();

            var condition = "";
            for(var l in this.locks) {
                if(l > 0)
                    condition += " && ";
                condition += '(' + this.locks[l].compile2PolicyEval() + ')';
            }

            var result = "";

            if(this.target) {
                if(condition.length)
                    result = srctrg + " = (!"+condition+") ? "+srctrg+" : ";
                else
                    result = srctrg + " = ";
            } else {
                if(condition.length)
                    result = " = "+condition+" ? " + srctrg + " : ";
                else 
                    result = " = " + srctrg + ";";
            }

            return result;
        }
    };

    return cls;
})();

if(global && typeof print !== "function")
    module.exports = Flow;
