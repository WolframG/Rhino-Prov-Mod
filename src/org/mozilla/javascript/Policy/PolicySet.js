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

// # PolicySet Class

if(global && typeof print !== "function") {
    var PolicyConfig = require("./PolicyConfig.js");
    var Policy = require(PolicyConfig.rootDir + "./Policy.js");
    var Flow = require(PolicyConfig.rootDir + "./Flow.js");
    var Lock = require(PolicyConfig.rootDir + "./Lock.js");
    var Entity = require(PolicyConfig.rootDir + "./Entity.js");
}

var PolicySet = (function() {
    
    // ## Constructor
    //
    // * if *pol* is not defined, the PolicySet will be empty and have no policies.
    // * if *pol* is a [Policy](Policy.html), it will be added to *this* PolicySet
    // * if *pol* is an Array, Policies will be created from the elements of the array and they will be added to the PolicySet
    //
    // The constructor will throw an exception if *pol* is of any other type
    var cls = function(pol) {
        this.policies = {};
        
        if(pol === undefined) {
            return;
        }
        
        if(pol instanceof Policy) {
            this.add(new Policy(pol));
            return;
        }

        if(pol instanceof PolicySet || pol.policies) {
            for(var p in pol.policies) {
                this.add(new Policy(pol.policies[p]));
            }
            return;
        }
        
        if(pol instanceof Array) {
            for(var p in pol) {
                this.add(new Policy(pol[p]));
            }
            return;
        }
        
        throw new Error("Error: PolicySet: Unable to construct PolicySet from '"+JSON.stringify(pol)+"'");
    };
    
    // ## Public Methods
    cls.prototype = {
        // **method getPolicy** returns the policy for an entity specified in *this* PolicySet, 'undefined' otherwise
        getPolicy : function(entity) {
            if(entity instanceof Entity)
                return this.policies[entity.key()];
            else
                return undefined;
        },
        
        // **method add** adds the object in toAdd to the policy
        //
        // * if *toAdd* is a PolicySet, the policies in toAdd are added to the corresponding policies in this, we add without checking uniqueness of flows
        // * if *toAdd* is a Policy we add the policy to the corresponding entity in the PolicySet stored in this
        // * if *toAdd* is an Array of policies -> TODO: not handled yet (throw Error)
        // * if *toAdd* is anything else we throw an error
        add : function(toAdd) {
            if(toAdd instanceof PolicySet) {
                var policy = toAdd;
                var polKeys = policy.getEntities();
                
                // console.log("Add "+policy+" to "+this);
                for(var k in polKeys) {
                    var key = polKeys[k];
                    // console.log("k: '"+key+"'");
                    if(this.policies[key] === undefined)
                        this.policies[key] = new Policy(policy.getPolicy(key));
                    else {
                        // console.log("policy[key]: "+JSON.stringify(policy.getPolicy(key)));
                        // console.log("Policy: "+this.policies[key]);
                        this.policies[key].add(new Policy(policy.getPolicy(key)));
                    }
                }
            } else if(toAdd instanceof Policy) {
                // console.log("to add is Policy")
                var policy = toAdd;
                var entity = policy.entity;
                
                if(!entity)
                    throw new Error("PolicySet: Cannot add data policies to a policy set");
                
                var key = policy.entity.key();
                
                if(this.policies[key] === undefined) {
                    this.policies[key] = new Policy(policy);
                } else {
                    // policies for this entity exist => simply add policy without optimization
                    this.policies[key].add(new Policy(policy));
                }
            } else if(toAdd instanceof Array && toAdd[0] instanceof Policy) {
                throw new Error("PolicySet: Error: Cannot add an array of policies yet");
            } else {
                throw new Error("PolicySet: Error: Need more data if no policy object is used to add a new policy");
            }
        },
        
        // **method getEntities** returns all entities for which a policies are specified
        getEntites : function() {
            return Object.keys(this.policies);
        },
        
        // **method getInputPortPolicy** returns a reference to the policy
        // specified for this particular *input*, which is a string
        // specifying the name of the input
        //
        // returns *undefined* if no such policy exists
        /* getInputPortPolicy : function(input) {
         for(var k in this.policies) {
         var p = this.policies[k];
         if(p.entity.isInputPort() && p.entity.input === input)
         return this.policies[k];
         }
         
         return undefined;
         },
         */
        
        // **method getOutputPortPolicy** returns a reference to the policy
        // specified for this particular *output*, which is a string
        // specifying the name of the output
        //
        // returns *undefined* if no such policy exists
        /* getOutputPortPolicy : function(output) {
         for(var k in this.policies) {
         var p = this.policies[k];
         if(p.entity.isOutputPort() && p.entity.output === output)
         return this.policies[k];
         }  
         return undefined;
         },
         */
        
        getInputPortPolicy : function() {
            return this.getBestMatchPolicy(new Entity({type : 'any', input : 0 }));
        },
        
        getOutputPortPolicy : function(port) {
            return this.getBestMatchPolicy(new Entity({type : 'any', output : port }));
        },
        
        getBestMatchPolicy : function(e) {
            var entities = Object.keys(this.policies);
            var bestMatch = null;
            var entity = null;
            
            if(e instanceof Entity) {
                entity = e;
            } else {
                entity = new Entity(e);
            }
            
            for(var i = 0; i < entities.length; i++) {
                var queryEntity = new Entity(entity);
                
                if(entity.type === "any") {
                    queryEntity.type = this.policies[entities[i]].entity.type;
                    if(!entity.id || !entity.id.length)
                        queryEntity.id = this.policies[entities[i]].entity.id;
                }
                
                var pol = this.policies[entities[i]];
                
                if(pol.entity.eq(queryEntity)) {
                    bestMatch = pol;
                    break;
                } else {
                    if(pol.entity.dominates(queryEntity))
                        bestMatch = pol;
                }
            }
            
            return bestMatch;
        },

        checkAccess : function(subject, e, operation, context) {
            var result = { result : false, conditional : false };
            var bestMatch = this.getBestMatchPolicy(e);
            
            if(!bestMatch)
                return result;
            else 
                return bestMatch.checkAccess(subjectPolicy, operation, context);
        },
        
        // **method toString** returns a string representation of this policy
        toString : function() {
            var str = "PolicySet: [";
            var keys = Object.keys(this.policies);
            if(keys.length > 0) {
                for(var k in keys) {
                    if(k > 0)
                        str += ", \n\t";
                    str += this.policies[keys[k]];
                }
            }
            str += "]";
            
            return str;
        }
    };
    
    return cls;
})();

if(global && typeof print !== "function")
    module.exports = PolicySet;
