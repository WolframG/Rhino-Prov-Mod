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
    var Flow = require(PolicyConfig.rootDir + "./Flow.js");
    var Entity = require(PolicyConfig.rootDir + "./Entity.js");
    var Context = require(PolicyConfig.rootDir + "./Context.js");
	var clone = require("clone");
}

var Policy = (function() {

    function processConflicts(conflicts1, conflicts2) {
        var grant1 = false, grant2 = false, finalgrant = false;
        var conditional1 = true, conditional2 = true, finalconditional = true;

        var conflicts = [];

        if(!conflicts1)
            throw new Error("Conflict1 must be defined!");

        if(!conflicts2) {
            grant2 = true;
            conditional2 = false;
        }

        /*
         console.log();
         console.log("Merge conflict1 and conflict2:");
         console.log("conflict1: "+JSON.stringify(conflicts1));
         console.log("conflict2: "+JSON.stringify(conflicts2));
         */

        for(var c1 in conflicts1) {
            var conflict1 = conflicts1[c1];

            if(conflict1.locks)
                conflicts = conflicts.concat(conflict1.locks);
            else if(conflict1.entity)
                conflicts.push({ type : conflict1.entity.type });

            // only one lock set needs to be open
            grant1 = grant1 || conflict1.allopen;

            if(conflict1.allopen) {
                conditional1 = conditional1 && conflict1.conditional;
            }
        }

        for(var c2 in conflicts2) {
            var conflict2 = conflicts2[c2];

            if(conflict2.locks)
                conflicts = conflicts.concat(conflict2.locks);
            else if(conflict2.entity)
                conflicts.push({ type : conflict2.entity.type });

            // only one lock set needs to be open
            grant2 = grant2 || conflict2.allopen;

            if(conflict2.allopen) {
                conditional2 = conditional2 && conflict2.conditional;
            }
        }

        // TODO - Postprocess conflicts and reduce where possible (lub?)

        conditional1 = grant1 && conditional1;
        conditional2 = grant2 && conditional2;

        finalgrant = grant1 && grant2;
        finalconditional = finalgrant && (conditional1 || conditional2);

        // console.log("\tResult of merge: "+JSON.stringify({result : finalgrant, conditional : finalconditional, conflicts : conflicts}));

        if(finalconditional)
            return { result : true, conditional : true, conflicts : conflicts };
        else {
            if(finalgrant)
                return { result : true, conditional : false };
            else
                return { result : false, conditional : false, conflicts : conflicts };
        }
    };

    var cls = function(flows, entity) {
        this.entity = null;
        this.flows = null;

        // exception handling: create also malformed policy objects (SO)
        var rewrite = false;
        if(!entity && flows.length == 4 && !flows.object) {
            var e = flows[0].source ? flows[0].source : flows[0].target;
            if(e.type == 'user' && e.id !== undefined && e.id !== null) {
                rewrite = true;
            }    else {
                if(e.name && (e.name == "{$src}" || e.name == "{$trg}")) {
                    rewrite = true;
                }
            }
        }

        if(flows.object !== undefined || rewrite) {
            var policyDummy = {};

            if(rewrite) {
                this.entity = null;
                policyDummy.flows = flows;
            }    else {
                this.entity = new Entity(flows.object);
                policyDummy.flows = flows.flows;
            }

            if(policyDummy.flows) {
                this.flows = [];
                for(var f in policyDummy.flows) {
                    // this.flows.push(new Flow(policyDummy.flows[f]));
                    this.addFlow(new Flow(policyDummy.flows[f]));
                }
            }

            for(var i in this.flows) {
                var flow = this.flows[i];

                if(flow.source) {
                    this.flows[i].source.name = undefined;
                    if(flow.source.id && flow.source.type == 'user' && !flow.locks) {
                        flow.locks = [ Lock.createLock({ path : "isUser", args : [ flow.source.id ] }) ];
                        flow.source.id = undefined;
                    }
                } else {
                    this.flows[i].target.name = undefined;
                    if(flow.target.id && flow.target.type == 'user' && !flow.locks) {
                        flow.locks = [ Lock.createLock({ path : "isUser", args : [ flow.target.id ] }) ];
                        flow.target.id = undefined;
                    }
                }
            }
        } else if(flows instanceof Policy || flows.flows) {
            var policy = flows;

            if(entity) {
                throw new Error("Policy: Error: Entity must be undefined to construct Policy object from other Policy object");
            }

            if(policy.entity) {
                this.entity = new Entity(policy.entity);
            }

            // console.log("this: "+JSON.stringify(this, null, 2));

            if(policy.flows !== null) {
                this.flows = [];
                for(var i in policy.flows) {
                    // console.log("policy.flows["+i+"]: "+JSON.stringify(policy.flows[i]));
                    var newFlow = new Flow(policy.flows[i]);
                    // this.flows.push(newFlow);
                    this.addFlow(newFlow);
                    // console.log("newFlow: "+newFlow);
                }
            }
        } else {
            // if no entity is specified for the policy, it is
            // a data policy, a policy for a specific entity otherwise
            if(!entity) {
                this.entity = null;
            } else {
                this.entity = new Entity(entity);
            }
            /* else
             throw new Error("Policy: Error: Cannot construct rule without entity onto which rule is specified");*/

            if(flows) {
                if(flows instanceof Array) {
                    this.flows = [];
                    for(var i in flows) {
                        // this.flows.push(new Flow(flows[i]));
                        this.addFlow(new Flow(flows[i]));
                    }

                } else {
                    throw new Error("Policy: Cannot construct rule from flows which are not contained in an array");
                }
            }
        }
    }; // End Constructor;

    // ## Public Static Constants
    //
    // the constant field **Operation** enumerates all valid operations defined in the policy framework
    //
    // * READ - Any reading operation on the entity
    // * WRITE - Any modification of the current state of an entity
    // * EXEC - the execution of the entity
    // * DEL - the deletion of the entity
    cls.Operation = Object.freeze({
        READ  : 1,
        WRITE : 2,
        EXEC  : 3,
        DEL   : 4
    });

    // the constant field **Direction** describes the flow of information in the policy framework
    //
    // * INCOMING denotes a flow of data towards an entity
    // * OUTGOING denotes a flow of data leaving an entity
    cls.Direction = Object.freeze({
        INCOMING : 1,
        OUTGOING : 2
    });

    // ## Static Methods

    // **method top()** returns the most restrictive policy of the framework
    cls.top = function() {
        return new Policy([]);
    };

    // **method bot()** returns the least restrictive policy of the framework
    cls.bot = function() {
        return new Policy([ { target : { type: 'any' } }, {source : { type : 'any'} } ], { type : 'any' });
    };

    // ## Public Methods

    cls.prototype = {
        add : function(toAdd) {
            if(toAdd instanceof Policy) {
                /* console.log("policy: "+JSON.stringify(this));
                console.log("toAdd: "+JSON.stringify(toAdd)); */

                if(!this.entity.eq(toAdd.entity)) {
                    var error = new Error("Policy: Cannot add a policy to another policy if they are not specified over the same entity");
                    throw error;
                }

                for(var f in toAdd.flows) {
                    this.addFlow(new Flow(toAdd.flows[f]));
                }
            } else if(toAdd instanceof Flow) {
                this.addFlow(new Flow(toAdd));
            }
        },

        addFlow : function(newFlow) {
            if(newFlow instanceof Flow) {
                var isSrcFlow = (!newFlow.target);
                var closedLock = Lock.closedLock();

                if(newFlow.locks)
                    for(var l2 = 0; l2 < newFlow.locks.length; l2++) {
                        var lock2 = newFlow.locks[l2];

                        // a closed lock makes the flow always
                        // forbidden, thus we do not need to include it
                        if(lock2.eq(closedLock))
                            return;
                    }

                for(var f in this.flows) {
                    var flow = this.flows[f];
                    var srctrg = "";
                    if(isSrcFlow) {
                        if(!flow.source)
                            continue;
                        srctrg = "source";
                    } else {
                        if(flow.source)
                            continue;
                        srctrg = "target";
                    }

                    // TODO: Use domination to further reduce the
                    // number of flows added (if locks are equal and
                    // entity dominates the other, the policy does
                    // not need to be added!
                    if(!flow[srctrg].eq(newFlow[srctrg]))
                        continue;

                    if(!flow.locks && newFlow.locks || flow.locks && !newFlow.locks || !flow.locks && !newFlow.locks)
                        continue;

                    if(flow.locks.length != newFlow.locks.length)
                        continue;

                    var matched = 0;
                    for(var l1 = 0; matched < flow.locks.length && l1 < flow.locks.length; l1++) {
                        var lock1 = flow.locks[l1];
                        for(var l2 = 0; matched < flow.locks.length && l2 < newFlow.locks.length; l2++) {
                            var lock2 = newFlow.locks[l2];

                            if(!lock1.eq(lock2))
                                matched++;
                        }
                    }

                    // flow exists if all locks are matched
                    if(matched == flow.locks.length)
                        return;
                }

                // if we come here we have not found an equal or dominating flow
                // thus we can add the flow
                this.flows.push(newFlow);

            } else
                throw new Error("Policy: Call to addFlow with an object other than a Flow");
        },

        getFlows : function() {
            return this.flows;
        },

        isDataPolicy : function() {
            return this.entity === null;
        },

        // **method checkFlow** checks whether data with the policy
        // *this* can flow from the source with policy *source*
        // to the target with policy *target*, i.e. this method validates
        // whether the security policy of the data complies with the
        // target and whether the target allows the incoming data

        // context.subject is the message itself (this is the corresponding policy)
        // context.object is the target
        checkIncoming : function(targetPolicy, context) {
            var dataPolicy = new Policy(this);
            var dresult = []; // the eval result for the item coming entering
            var eresult = []; // the eval result for the entity where data enters

            /* console.log("=========== CHECKINCOMING ===========");
            console.log("trgPolicy: " + targetPolicy);
            console.log("dataPolicy: " + dataPolicy);
            if(context && context.locks)
                console.log("context: "+JSON.stringify(context.locks, null, 2)); */

            // First verify whether the data policy allows the
            // flow into the target/this node

            // here the subject to be checked is the target
            // and the object is the message itself
            for(var f in dataPolicy.flows) {
                if(dataPolicy.flows[f].hasSrc())
                    continue;

                var flow = dataPolicy.flows[f];

                // the target in the flow allows the flow to target
                if(flow.target.dominates(targetPolicy.entity)) {
                    var conflicts = flow.getClosedLocks(context);
                    // console.log("\t\t*1 CONFLICTS: ",conflicts);
                    dresult.push(conflicts);
                } else {
                    // console.log("NO DOMINATION for "+flow.target+" and "+targetPolicy.entity);
                    var toPush = { allopen : false, conditional : false, entity : flow.target };
                    // console.log("\t\t1 ENTITY CONFLICT: " + flow.target);
                    dresult.push(toPush);
                }
            }

            // console.log();
            // console.log("-- check whether node policy accepts message");

            // Second, verify whether the node policy of the
            // node receiving data allows the data to enter the node
            for(var f in targetPolicy.flows) {
                // only check flows for incoming data
                if(targetPolicy.flows[f].hasTrg())
                    continue;

                var flow = targetPolicy.flows[f];
                var invContext = null;
                if(context)
                    invContext = new Context(context);

                // console.log("+ get lock states for flow "+flow);
                var conflicts = flow.getClosedLocks(invContext);
                // console.log("\t\t*2 CONFLICTS: ",conflicts);
                eresult.push(conflicts);
            }

            // console.log("DRESULT: "+JSON.stringify(dresult));
            // console.log("ERESULT: "+JSON.stringify(eresult));

            return processConflicts(dresult, eresult);
        },

        checkOutgoing : function(sourcePolicy, context) {
            var dataPolicy = this;
            var dresult = []; // the eval result for the item coming entering
            var eresult = []; // the eval result for the entity where data enters

            // TODO need to be implemented in a useful way

            /* console.log("=========== CHECKFLOW ===========");
             console.log("srcPolicy: " + sourcePolicy);
             console.log("dataPolicy: " + dataPolicy);

             // simply check whether the message is allowed to flow out
             for(var f in sourcePolicy.flows) {
             // only check flows for outgoing data
             if(sourcePolicy.flows[f].hasSrc())
             continue;

             var flow = sourcePolicy.flows[f];

             var conflicts = flow.getClosedLocks(context);
             console.log("\t\t2 CONFLICTS: "+JSON.stringify(conflicts));
             eresult.push(conflicts);
             }

             console.log("DRESULT: "+JSON.stringify(dresult));
             console.log("ERESULT: "+JSON.stringify(eresult));*/

            return processConflicts(dresult, eresult);
        },


        // **method checkFlow** checks whether data with the policy *dataPolicy*
        // trying to enter or leaving (specified by *direction*) the object with
        // *this* policy is allowed or not. The *context* provides information
        // about the status of the locks
        //
        // returns an object of the form `{ result : boolean, conditional : boolean }`
        checkFlow : function(srctrgPolicy, direction, context) {
            var result = { result : false, conditional : false };


            /* console.log("====================== CHECKFLOW =======================");
            console.log("srctrgPolicy: "+JSON.stringify(srctrgPolicy));
            console.log("direction: "+JSON.stringify(direction));
            if(context.locks)
            console.log("context: "+JSON.stringify(context.locks));*/


            if(!srctrgPolicy || !direction) {
                return result;
            }

            switch(direction) {
            case Policy.Direction.INCOMING:
                {
                    result = this.checkIncoming(srctrgPolicy, context);
                    break;
                }
            case Policy.Direction.OUTGOING:
                {
                    result = this.checkOutgoing(srctrgPolicy, context);
                    break;
                }
            default:
                {
                    throw new Error("Undefined flow direction");
                }
            }

            return result;
        },

        // checks whether access of subject to the object with
        // operation and the given flow specification is allowed
        checkAccess : function(subject, operation, context) {
            var result = { result : false, conditional : false };

            if(!subject || !operation) {
                return result;
            }

            switch(operation) {
            case Policy.Operation.WRITE:
                {
                    result = this.checkWrite(subject, context);
                    break;
                }
            case Policy.Operation.READ:
                {
                    result = this.checkRead(subject, context);
                    break;
                }
            case Policy.Operation.EXEC:
            case Policy.Operation.DEL:
            default:
                throw new Error("Undefined or unimplemented operation in policy!");
            }

            return result;
        },

        checkWrite : function(writer, context) {
            var evalResult = [];
            var trgResult = [];
            var writerResult = [];

            // var writer = writerPolicy.entity;
            var target = this.entity;

            var grant = false;
            var conditional = true;


            /*
             console.log("============ checkWriteAccess ============");
             console.log("\tCheck write to target");

             console.log("\t\tTARGET: "+this);
             console.log("\t\tWRITER: "+writer);

             if(context && context.subject.data) {
             console.log("\t\tcontext.subject: "+context.subject.data.id);
             console.log("\t\tcontext.object: "+context.object.data.id);
             }
             */


            // check whether the writer can write to *this*
            for(var f in this.flows) {
                // find flows describing writing access to this
                if(this.flows[f].hasTrg())
                    continue;

                var flow = this.flows[f];
                var flowSrc = flow.source;
                var conflictLocks = [];

                // flowSrc is less specific than the writer
                if(flowSrc.dominates(writer)) {
                    // console.log("\t\tCheck locks of "+flow);
                    var conflicts = flow.getClosedLocks(context);
                    // console.log("\t\tconflicts: "+JSON.stringify(conflicts));
                    trgResult.push(conflicts);
                } else {
                    // console.log("\t\tEntity conflict! ("+flowSrc+" not dominated by writer)");
                    // trgResult.push({ ids : [ flow.id ], allopen : false, conditional : false, entity : flowSrc });
                    trgResult.push({ allopen : false, conditional : false, entity : flowSrc });
                }
            }

            evalResult = processConflicts(trgResult);
            // console.log("evalResult: "+JSON.stringify(evalResult));

            return evalResult;
        },

        checkRead : function(reader, context) {
            var evalResult = [];
            var srcResult = [];
            var readerResult = [];

            // the reader reading from the source
            // var reader = readerPolicy.entity;
            // the source to be read from
            var source = this.entity;

            var grant = false;
            var conditional = true;

            /* console.log("============ checkReadAccess ============");
             console.log("\tCheck read from source");*/

            for(var f in this.flows) {
                if(this.flows[f].hasSrc())
                    continue;

                var flow = this.flows[f];
                var flowTrg = flow.target;
                var conflictLocks = [];

                /* console.log("\t\tREADER: "+reader);
                 console.log("\t\t"+f+": TRG: "+flowTrg);*/

                // flowSrc is less specific than the writer
                if(flowTrg.dominates(reader)) {
                    // console.log("\t\tCheck locks of "+flow);

                    var conflicts = flow.getClosedLocks(context);
                    // console.log("\t\tconflicts: "+JSON.stringify(conflicts));
                    srcResult.push(conflicts);
                } else {
                    // console.log("\t\tEntity conflict! "+flowTrg+" not dominated by reader)");
                    // srcResult.push({ ids : [ flow.id ], allopen : false, conditional : false, entity : flowTrg });
                    srcResult.push({ allopen : false, conditional : false, entity : flowTrg });
                }
            }

            evalResult = processConflicts(srcResult);
            // console.log("evalResult: "+JSON.stringify(evalResult));
            return evalResult;
        },

        eq : function(other) {
            // console.log("*************** EQ *****************");
            // console.log(" this: "+this);
            // console.log("other: "+other);

            if(!this.entity) {
                if(this.entity !== other.entity) {
                    // console.log("*1*");
                    return false;
                }
            } else
            if(!this.entity.eq(other.entity)) {
                // console.log("*2*");
                return false;
            }

            var covered = [];
            for(var f1 in this.flows) {
                var matched = false;
                var flow1 = this.flows[f1];
                // and apply flow1 to each flow in flows2
                for(var f2 in other.flows) {
                    var flow2 = other.flows[f2];

                    if(flow1.eq(flow2)) {
                        // console.log(flow1 + " == " + flow2);
                        matched = true;
                        covered[f2] = true;
                    }
                }

                if(!matched) {
                    // console.log("*3*");
                    return false;
                }
            }

            for(var f2 in other.flows)
                if(covered[f2] !== true) {
                    // console.log("*Y*");
                    return false;
                }

            return true;
        },

        le : function(otherPol, write) {
            // return true;

            var locksToCheck = [];
            var complies = true;

            if(!otherPol)
                return false;

            if(!otherPol.flows || otherPol.flows.length == 0)
                return true;

            var covered1 = [];
            var covered2 = [];

            var srctrg = "target";
            if(write) {
                srctrg = "source";
            }

            // this policy defines no flow, i.e. it is the top policy
            if(this.flows.length == 0)
                return false;
            else
                // the other policy defines no flow, i.e. it is the top policy
                // it will always be more restrictive than the other policy
                if(otherPol.flows.length == 0)
                    return true;

            var flows1 = this.flows.filter(function(f) { return f[srctrg] != undefined || f[srctrg] != null; } );
            var flows2 = otherPol.flows.filter(function(f) { return f[srctrg] != undefined || f[srctrg] != null; } );

            for(var f1 in flows1) {
                var flow1 = flows1[f1];
                for(var f2 in flows2) {
                    var flow2 = flows2[f2];
                    if(flow1.le(flow2)) {
                        covered1[f1] = true;
                        covered2[f2] = true;
                    }
                }
            }

            // if all flows have a less restrictive equivalent in this policy
            // this policy is in fact smaller
            for(f2 in flows2)
                if(covered2[f2] != true) {
                    complies = false;
                    break;
                }

            return complies;
        },

        glb_old : function() {
            var result = false;

            for(var i = 0; i < arguments.length; i++) {
                var otherPol = arguments[i];

                if(!(otherPol instanceof Policy))
                    throw("Policy: Error: Cannot compute least upper bound of object not of type Policy")

                if(this.entity && otherPol.entity && !(this.entity.dominates(otherPol.entity) || otherPol.entity.dominates(this.entity))) {
                    // this or the other policy do not contain specifications for this entity
                    // if nothing is specified access is forbidden by default, i.e., the policy for this entity is also empty
                    this.flows = [];
                    this.entity = null;

                    return false;
                }

                for(var f2 in otherPol.flows) {
                    var merged = false;
                    for(var f1 in this.flows) {
                        merged = merged || this.flows[f1].glb(otherPol.flows[f2]);
                    }
                }
            }

            return result;
        },

        glb : function() {
            var newPolicy = new Policy(this);

            for(var i = 0; i < arguments.length; i++) {
                var otherPol = arguments[i];

                if(!(otherPol instanceof Policy))
                    throw new Error("Policy: Error: Cannot compute greatest lower bound of object not of type Policy");

                if(newPolicy.entity && otherPol.entity) {
                    var newDominatesOther = newPolicy.entity.dominates(otherPol.entity);
                    var otherDominatesNew = otherPol.entity.dominates(newPolicy.entity);

                    // the entities for this policy are different,
                    // thus two completely different policies are compared
                    // result is a policy set, i.e. two policies
                    if(!(newDominatesOther || otherDominatesNew)) {
                        return [ this, otherPol ];
                    }

                    // other policy is more specific
                    if(otherDominatesNew)
                        newPolicy.entity = new Entity(otherPol.entity);
                } else
                if(otherPol.entity)
                    newPolicy.entity = new Entity(otherPol.entity);

                var toAdd = [];
                for(var f1 in newPolicy.flows) {
                    var flow1 = newPolicy.flows[f1];
                    for(var f2 in otherPol.flows) {
                        var flow2 = otherPol.flows[f2];
                        // flows are equal or first flow is
                        // less restrictive => nothing to do

                        if(flow1.eq(flow2) || flow1.le(flow2))
                            continue;
                        else
                            toAdd[f2] = true;
                    }
                }

                for(var f2 in otherPol.flows) {
                    if(toAdd[f2] === true)
                        newPolicy.add(otherPol.flows[f2]);
                }
            }

            return newPolicy;
        },

        lub : function() {
            var newPolicy = new Policy(this);

            for(var i = 0; i < arguments.length; i++) {
                var otherPol = arguments[i];

                // console.log("\nlub(\n\t"+this+",\n\t"+otherPol+")");

                if(!(otherPol instanceof Policy))
                    otherPol = new Policy(otherPol);

                if(newPolicy.entity && otherPol.entity) {
                    var newDominatesOther = newPolicy.entity.dominates(otherPol.entity);
                    var otherDominatesNew = otherPol.entity.dominates(newPolicy.entity);

                    if(!(newDominatesOther || otherDominatesNew)) {
                        // this or the other policy do not contain specifications for this entity
                        // if nothing is specified access is forbidden by default, i.e., the policy for this entity is also empty

                        return Policy.top();
                    }

                    // other policy entity is more specific
                    if(newDominatesOther)
                        newPolicy.entity = new Entity(otherPol.entity);
                } else {
                    newPolicy.entity = null;
                }

                var newFlows = [];
                for(var f2 in otherPol.flows) {
                    for(var f1 in newPolicy.flows) {
                        if(newPolicy.flows[f1].hasSrc() && otherPol.flows[f2].hasSrc() ||
                           newPolicy.flows[f1].hasTrg() && otherPol.flows[f2].hasTrg()) {
                            var res = newPolicy.flows[f1].lub(otherPol.flows[f2]);
                            if(res)
                                newFlows.push(res);
                        }
                    }
                }

                newPolicy = new Policy([], newPolicy.entity);
                for(var f in newFlows) {
                    newPolicy.addFlow(new Flow(newFlows[f]));
                }
            }
            return newPolicy;
        },

        toString : function() {
            var str = "";

            if(this.entity === null)
                str += "<Allowed flows: ";
            else
                str += "<Allowed flows for entity: "+this.entity+": ";

            str += "[";

            for(var f in this.flows) {
                var flow = this.flows[f];
                if(f > 0)
                    str += ",\n\t";
                str += flow;
            }

            str += "]>";

            return str;
        }
    }

    return cls;
})();

Policy.createMessageArray = function(msg) {
    if (msg.type == 'normal') {

        // if top level element is array user intended the object to be send to
        // different locations
        if (msg.value.value !== null && msg.value.value.Class === 'Array') {
            var resultArray = [];

            for (var i = 0; i < msg.value.value.properties.length; i++) {
                if (msg.value.value.properties[i] !== null) {

                    // if the array contains a sub array the elements are
                    // intended to be sent sequentially
                    if (msg.value.value.properties[i].Class === 'Array') {
                        var subResultArray = [];
                        for (var j = 0; j < msg.value.value.properties[i].properties.length; j++) {

                            if (msg.value.value.properties[i].properties[j] !== null) {
                                var shell = {};
                                shell.type = "normal";
                                shell.value = {};
                                shell.value.label = {};

                                // When this shell is created in jsFlow the default policy is set
                                shell.value.label.policy = clone(msg.value.label.policy);
                                // console.log("POLICY OF SUBARRAY: %j", msg.value.label.policy);

                                // msg.value.value.properties[i] is the complete msg object
                                shell.value.value = msg.value.value.properties[i].properties[j];
                                // console.log("POLICY OF SUBARRAY: %j", shell.value.value);

                                subResultArray[j] = shell;
                            } else {
                                subResultArray[j] = null;
                            }
                            resultArray[i] = subResultArray;
                        }
                    } else {
                        console.log("NO SUB ARRAY");

                        // outer object similar to the policyObject
                        var shell = {};
                        shell.type = "normal";
                        shell.value = {};
                        shell.value.label = {};

                        // When this shell is created in jsFlow the default
                        // policy is set
                        shell.value.label.policy = clone(msg.value.label.policy);

                        // console.log("POLICY OF THIS ELEMENT: %j",shell.value.label.policy);

                        // msg.value.value.properties[i] is the complete msg
                        // object
                        shell.value.value = clone(msg.value.value.properties[i]);
                        console.log("SUB: %j",shell.value.value.labels);

                        resultArray[i] = shell;

                        // console.log("resultArray: "+resultArray[i]);
                    }
                } else {
                    resultArray[i] = null;
                }
            }
        } else {
            var resultArray = [ msg ];
        }
    } else {
        console.log("unsupported type!");
    }
    return resultArray;
};

/* function getDominatingPolicy(obj, min, lub) {
 for (var i in obj) {
 if (typeof obj[i] == 'object') {
 if(i == 'policy') {
 min = lub(min, obj[i]);
 } else {
 min = getDominatingPolicy(obj[i], min, lub);
 }
 }
 }
 return min;
 } */

/* =============================================================================== */

/*
 *create a new object which has the necessary properties
 *in order to support policies.
 */
function policyObject(policy) {
    this.type = 'normal';

    this.value = {};
    this.value.label = {};
    this.value.label.policy = policy;

    this.value.value = {};
    this.value.value.Class = 'Object';
    this.value.value.properties = {};
    this.value.value.labels = {};
}

//Set the given property and name as property in the policy object
policyObject.prototype.setProperty = function(propName, property) {
    this.value.value.properties[propName] = property;
}

//Return the property according to the given key
policyObject.prototype.getProperty = function(propName) {
    return this.value.value.properties[propName];
}

//Return all properties
policyObject.prototype.getProperties = function() {
    return this.value.value.properties;
}

// set the given policy and name as label in the policy object
policyObject.prototype.setPolicy = function(labelName, policy) {
    this.value.value.labels[labelName] = {};
    this.value.value.labels[labelName].value = {};
    this.value.value.labels[labelName].value.policy = policy;
}

//return the policy of the object itself
policyObject.prototype.getPolicy = function(prop) {
    return this.value.value.labels[prop].value.policy ;
}

//Return all policies of the properties
policyObject.prototype.getPolicies = function() {
    return this.value.label.policy;
}

// A property object for the policy object
function policySubObject() {
    this.Class = 'Object';
    this.Extensible = true;
    this.properties = {};
    this.labels = {};
}

//set the given property and name as property in the sub policy object
policySubObject.prototype.getPolicy = function(prop) {
    return this.labels[prop].value.policy;
}

// set the given property and name as property in the sub policy object
policySubObject.prototype.setProperty = function(propName, property) {
    this.properties[propName] = property;
}

//Return the property according to the key from this object
policySubObject.prototype.getProperty = function(propName) {
    return this.properties[propName];
}

//Return all properties from this object
policySubObject.prototype.getProperties = function() {
    return this.properties;
}

// set the given policy and name as label in the sub policy object
policySubObject.prototype.setPolicy = function(labelName, policy) {
    this.labels[labelName] = {};
    this.labels[labelName].value = {};
    this.labels[labelName].value.policy = policy;
}

// A property array object for the policy object
function policySubArray(policy) {
    this.Class = 'Array';
    this.Extensible = true;
    this.properties = [];
    this.labels = {};

    this.labels.length = {};
    this.labels.length.value = {};
    this.labels.length.value.policy = policy;
}

//set the given property and name as property in the sub policy object
policySubArray.prototype.getPolicy = function(prop) {
    return this.labels[prop].value.policy;
}

// set the given property and name as property in the sub policy object
policySubArray.prototype.setProperty = function(propName, property) {
    this.properties[propName] = property;
}

//Return the property according to the key from this object
policySubArray.prototype.getProperty = function(propName) {
    return this.properties[propName];
}

//Return all properties from this object
policySubArray.prototype.getProperties = function() {
    return this.properties;
}

// set the given policy and name as label in the sub policy object
policySubArray.prototype.setPolicy = function(labelName, policy) {
    this.labels[labelName] = {};
    this.labels[labelName].value = {};
    this.labels[labelName].value.policy = policy;
}

/*
 * Iterate through the given object and create a corresponding policy object
 * with the given policy.
 */
function createPolicyObject(obj, policyObj, policy) {

    if (obj instanceof Object || obj instanceof Array) {
        for (var prop in obj) {

            if (!obj.hasOwnProperty(prop)) {
                continue;
            }

            if (obj[prop] instanceof Array) {
                var subArray = new policySubArray(policy);

                policyObj.setProperty(prop, subArray);
                policyObj.setPolicy(prop, policy);
                createPolicyObject(obj[prop], subArray, policy);

            } else if (obj[prop] instanceof Object) {
                var subObj = new policySubObject();

                policyObj.setProperty(prop, subObj);
                policyObj.setPolicy(prop, policy);
                createPolicyObject(obj[prop], subObj, policy);

            } else {
                policyObj.setProperty(prop, obj[prop]);
                policyObj.setPolicy(prop, policy);
            }
        }
    } else {
        policyObj.value.value = obj;
    }
}

/*
 *
 * Create an object with policies from the given object and policy similar to
 * the internal used jsFlow object.
 */
Policy.setPolicy = function(obj, policy) {
    var policyObj = new policyObject(policy);
    createPolicyObject(obj, policyObj, policy)

    return policyObj;
};

Policy.removePolicy = function(obj) {
    var nakedObj = {};
    var properties = obj.properties;

    for (var prop in properties) {
        if(properties[prop] == "Prototype") {
            continue;
        } else if(properties[prop] == null) {
            nakedObj[prop] = properties[prop];
        } else if (properties[prop].Class == 'Array') {
            var nakedSubObj = removeArrayPolicy(properties[prop]);
            nakedObj[prop] = nakedSubObj;
        } else if(properties[prop].Class == 'Object') {
            var nakedSubObj = Policy.removePolicy(properties[prop]);
            nakedObj[prop] = nakedSubObj;
        } else {
            nakedObj[prop] = properties[prop];
        }
    }

    if(obj.Class != undefined && obj.Class == 'Array') {
        var arr = [];
        for(var o in nakedObj) {
            arr.push(nakedObj[o]);
        }
        nakedObj = arr;
    }
    return nakedObj;
}

var removeArrayPolicy = function(obj) {
    var nakedObj = [];
    var properties = obj.properties;

    for(var element in properties) {
        if(properties[element] == null) {
            nakedObj.push(properties[element]);
        } else if(properties[element].Class == 'Array') {
            nakedObj.push(removeArrayPolicy(properties[element]));
        } else if(properties[element].Class == 'Object') {
            nakedObj.push(Policy.removePolicy(properties[element]));
        } else {
            nakedObj.push(properties[element]);
        }
    }
    return nakedObj;
};


//Merge an obj which has policies set with a obj without policies.
//The result is the modified obj with policies.
//Properties present in the obj without policies but not in the policy
//message get set and obtain the policy bottom.
//Properties present in the obj with policies but not in the message without
//policies get deleted.
//The values of properties present in both messages get set to the value
//of the obj without policies.
Policy.mergePolicyObjWithObj = function(objWithPolicy, obj) {

		var objWithPolicyClone = clone(objWithPolicy);
		var objClone = clone(obj);

    //TODO better check with object Constructor
    if(objWithPolicyClone.type == 'normal' && objClone.type != "normal"){
        deletePropertiesFromObjWithPolicy(objWithPolicyClone.value.value, objClone);
        setPolicyObjWithObj(objWithPolicyClone.value.value, objClone);
    } else {
        throw new Error("Error: Can only merge a obj with policies with a obj without policies");
    }

    return objWithPolicyClone;
}


//Remove the properties of the first argument with polcies which are not present
//in the second argument which does not have policies.
function deletePropertiesFromObjWithPolicy(objWithPolicy, obj){

    for (var prop in objWithPolicy.properties) {

        //The property is also present in the object without policies
        if(obj[prop]){
            if(objWithPolicy.properties[prop] == "Prototype") {
                continue;
            }

            if (typeof objWithPolicy.properties[prop] == 'array' || typeof objWithPolicy.properties[prop] == 'object') {
                deletePropertiesFromObjWithPolicy(objWithPolicy.properties[prop], obj[prop]);
            }
        }else{

            //Remove the value;
            delete objWithPolicy.properties[prop];

            //Remove the policy connected to this property
            delete objWithPolicy.labels[prop];

        }
    }
}

function setPolicyObjWithObj(objWithPolicy, obj) {

    for(var prop in obj){
        if(obj[prop] == "Prototype") {
            continue;
        }

        //The policy object has the same prpoerty
        if(objWithPolicy.properties[prop]){
            if((typeof obj[prop] == 'array') || (typeof obj[prop] == 'object')){
							if((typeof objWithPolicy.properties[prop] == 'array') || (typeof objWithPolicy.properties[prop] == 'object')){
                setPolicyObjWithObj(objWithPolicy.properties[prop], obj[prop]);
							} else {
								if (typeof obj[prop] == 'array') {
										var subArray = new policySubArray(Policy.bot());
										objWithPolicy.properties[prop] = subArray;
										createPolicyObject(obj[prop], subArray, Policy.bot());

								} else if (typeof obj[prop] ==  'object') {
										var subObj = new policySubObject();

										objWithPolicy.properties[prop] = subObj;
										createPolicyObject(obj[prop], subObj, Policy.bot());
								} else {
										objWithPolicy.properties[prop] = obj[prop];
								}
							}
            }else{
                objWithPolicy.properties[prop] = obj[prop];
            }

        //The obj with policies is missing properties from the obj without policies
        //set the missing properties with the bot policy.
        }else{
            if (obj instanceof Object || obj instanceof Array) {
                for (var prop in obj) {

                    if (!obj.hasOwnProperty(prop)) {
                        continue;
                    }

                    if (obj[prop] instanceof Array) {
                        var subArray = new policySubArray(Policy.bot());

                        objWithPolicy.properties[prop] = subArray;
                        objWithPolicy.labels[prop] = { value : { policy : Policy.bot()}};
                        createPolicyObject(obj[prop], subArray, Policy.bot());

                    } else if (obj[prop] instanceof Object) {
                        var subObj = new policySubObject();

                        objWithPolicy.properties[prop] = subObj;
  											objWithPolicy.labels[prop] = { value : { policy : Policy.bot()}};
                        createPolicyObject(obj[prop], subObj, Policy.bot());

                    } else {
                        objWithPolicy.properties[prop] = obj[prop];
												objWithPolicy.labels[prop] = { value : { policy : Policy.bot()}};
                    }
                }
            } else {
                objWithPolicy.value.value = obj;
            }
        }
    }
}

//Adapts the policies of an object based on its own policies and the policies
//in its properties.
Policy.adaptPolicy = function(objWithPolicy){

    if(objWithPolicy.type == "normal"){
        var propertyPolicies = adaptPropertyPolicy(objWithPolicy.value.value);
        objWithPolicy.value.label.policy = objWithPolicy.value.label.policy.lub.apply(objWithPolicy.value.label.policy, propertyPolicies);

    } else {
        throw new Error("Error: Expected an object with policies");
    }
    return objWithPolicy;
}

function adaptPropertyPolicy(obj){
    var policies = [];

    for (var prop in obj.properties){

        if(typeof obj.properties[prop] == 'array' || typeof obj.properties[prop] == 'object'){
            var propPolicies = adaptPropertyPolicy(obj.properties[prop]);
            obj.labels[prop].value.policy = obj.labels[prop].value.policy.lub.apply(obj.labels[prop].value.policy, propPolicies);
            policies.push(obj.labels[prop].value.policy);

        } else {
            policies.push(obj.labels[prop].value.policy);
        }
    }
    return policies;
}

//Iterate over all policies of the object an set the lub of the current policy and the given policy.
//The entity of the policy object is set to null.
Policy.PolicyObjlubWithPolicy = function(objWithPolicy, policy){

	var objWithPolicyClone = clone(objWithPolicy);
	var policyClone = clone(policy);

	if(objWithPolicy.type == "normal"){
			var objPolicy = new Policy(objWithPolicyClone.value.label.policy);

			objPolicy.entity = null;
			policyClone.entity = null;

			objWithPolicyClone.value.label.policy = objPolicy.lub(policyClone);
			policyObjlubWithPolicyHelper(objWithPolicyClone.value.value, policy);
	} else {
			throw new Error("Error: Expected an object with policies");
	}

	return objWithPolicyClone;
}

function policyObjlubWithPolicyHelper(obj, policy){
		for(var prop in obj.properties){
				var objPolicy = new Policy(obj.labels[prop].value.policy);

				objPolicy.entity = null;

				obj.labels[prop].value.policy = objPolicy.lub(policy);

			  if((typeof obj.properties[prop] == 'array' || typeof obj.properties[prop] == 'object') && obj.properties[prop] != null){
					policyObjlubWithPolicyHelper(obj.properties[prop], policy);
				}
		}
}

//Returns the lub policy based on all policies in its properties.
Policy.getlubOfPolicyObj = function(obj){
	if(obj.type == "normal"){
			var objWithPolicy = clone(obj);
			var props = objWithPolicy.value.value;
			var policy = new Policy(objWithPolicy.value.label.policy);

			var propertyPolicies = lubOfProperties(props);

			var lubPolicy = policy.lub.apply(policy, propertyPolicies);

	} else {
			throw new Error("Error: Expected an object with policies");
	}
	return lubPolicy;
}

function lubOfProperties(obj){
    var policies = [];


    for (var prop in obj.properties){

        if((typeof obj.properties[prop] == 'array' || typeof obj.properties[prop] == 'object') && obj.properties[prop] != null){

            var propPolicies = lubOfProperties(obj.properties[prop]);
						var policy = new Policy(obj.labels[prop].value.policy);

            obj.labels[prop].value.policy = policy.lub.apply(policy, propPolicies);
            policies.push(new Policy(obj.labels[prop].value.policy));

        } else {
            policies.push(new Policy(obj.labels[prop].value.policy));
        }
    }
    return policies;
}

//Returns the policy for the given path and policy object.
Policy.getPolicyAtPath = function(objWithPolicy, path){

	if(objWithPolicy.type == "normal"){

		var obj = clone(objWithPolicy);
		var policy;
		path = path.replace(/\[(\w+)\]/g, '.$1');
		var pathArray = [];

		if(path != ""){
			pathArray = path.split(".");
		}

		if(pathArray.length < 1){
			policy = obj.value.label.policy;
		}else{
			policy = getPolicyHelper(obj.value.value, pathArray);
		}
	} else {
		throw new Error("Error: Expected an object with policies");
	}

	return policy;
}

function getPolicyHelper(obj, path){
	var len = path.length;
	var policy;

	for(var i = 0; i < len; i++){
		var prop = path[i];
		if(prop in obj.properties){
			if(i == len - 1){
				policy = obj.labels[path[i]].value.policy;
			} else {
				obj = obj.properties[path[i]];
			}

		} else {
			throw new Error("Error: Path not found in given object");
		}
	}
		return policy;
}

//Sets the given policy according to the given path in th egiven policy object
Policy.setPolicyAtPath = function(objWithPolicy, path, policy){

	if(objWithPolicy.type == "normal"){

		var obj = clone(objWithPolicy);
		path = path.replace(/\[(\w+)\]/g, '.$1');
		var pathArray = [];

		if(path != ""){
			pathArray = path.split(".");
		}

		if(pathArray.length < 1){
			obj.value.label.policy = policy;
		}else{
			setPolicyAtPathHelper(obj.value.value, pathArray, policy);
		}
	} else {
		throw new Error("Error: Expected an object with policies");
	}

	return obj;
}

function setPolicyAtPathHelper(obj, path, policy){
	var len = path.length;

	for(var i = 0; i < len; i++){
		var prop = path[i];
		if(prop in obj.properties){
			if(i == len - 1){
				obj.labels[path[i]].value.policy = policy;
			} else {
				obj = obj.properties[path[i]];
			}

		} else {
			throw new Error("Error: Path not found in given object");
		}
	}
		return obj;
}

//Iterate an object with policies. Executes the given function with the
//current property, policy for this property, and the path to this property
Policy.iteratePolicyObj = function(objWithPolicy, func){
	if(objWithPolicy.type == "normal"){
		var obj = clone(objWithPolicy);
		func("", obj.value.label.policy, "");
		iteratePolicyObjHelper(obj.value.value, func, "");

	} else {
		throw new Error("Error: Expected an object with policies");
	}
}

function iteratePolicyObjHelper(obj, func, path){

	for(var prop in obj.properties){

		if((typeof obj.properties[prop] == 'array' || typeof obj.properties[prop] == 'object') && obj.properties[prop] != null){
			func(prop, obj.labels[prop].value.policy, path + prop);
			iteratePolicyObjHelper(obj.properties[prop], func, path + prop + ".");
		}else{
			func(prop, obj.labels[prop].value.policy, path + prop);
		}
	}
}

//Remove the property including its policy at the given path
Policy.removePropertyAtPath = function(objWithPolicy, path){

	if(objWithPolicy.type == "normal"){

		var obj = clone(objWithPolicy);
		path = path.replace(/\[(\w+)\]/g, '.$1');
		var pathArray = [];

		if(path != ""){
			pathArray = path.split(".");
		}

		if(pathArray.length < 1){
			obj = undefined;
		}else{
			removePropertyAtPathHelper(obj.value.value, pathArray);
		}
	} else {
		throw new Error("Error: Expected an object with policies");
	}

	return obj;
}

function removePropertyAtPathHelper(obj, path){
	var len = path.length;

	for(var i = 0; i < len; i++){
		var prop = path[i];
		if(prop in obj.properties){
			if(i == len - 1){
				delete obj.properties[prop];
				delete obj.labels[prop];
			} else {
				obj = obj.properties[prop];
			}

		} else {
			throw new Error("Error: Path not found in given object");
		}
	}
		return obj;
}

//Sets the given property with policy in the given object according to the path.
//If no path is provided create a new policy object with the property and policy.
Policy.setPropertyAtPath = function(objWithPolicy, path, property, policy){

	if(objWithPolicy.type == "normal"){

		var obj = clone(objWithPolicy);
		path = path.replace(/\[(\w+)\]/g, '.$1');
		var pathArray = [];

		if(path != ""){
			pathArray = path.split(".");
		}

		if(pathArray.length < 1){
			obj = Policy.setPolicy(porperty, policy);
		}else{
			setPropertyAtPathHelper(obj.value.value, pathArray, property, policy);
		}
	} else {
		throw new Error("Error: Expected an object with policies");
	}

	return obj;
}

function setPropertyAtPathHelper(obj, path, property, policy){

	var len = path.length;

	for(var i = 0; i < len; i++){
		var prop = path[i];

			if(i == len - 1){
				obj.labels[prop] = { value : { policy : policy}};


				if (property instanceof Array) {
			  	var subArray = new policySubArray(policy);
					createPolicyObject(property, subArray, policy);

					obj.properties[prop] = subArray;

				} else if (property instanceof Object) {
					var subObj = new policySubObject();
					createPolicyObject(property, subObj, policy);

					obj.properties[prop] = subObj;

				} else {
					obj.properties[prop] = property;
				}

			} else {
				obj = obj.properties[path[i]];
			}
	}
		return obj;
}

if(global && typeof print !== "function") {
    module.exports = Policy;
}
