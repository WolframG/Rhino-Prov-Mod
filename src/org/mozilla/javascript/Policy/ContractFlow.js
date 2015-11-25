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
}

var ContractFlow = (function() {

    // depending on the flow direction, a contractflow specifies
    // whether information from an entity flows to some other entity
    // or whether information to an entity flows from some source
    //
    // example: flow from some msg in Node-RED to another message/variable
    // would require a contract flow with the msg as the entity and a 
    // target flow with the target being the variable receiving the information
    var cls = function(entity, flows) {
        if(entity instanceof ContractFlow || (entity.entity && entity.flows)) {
            if(flows)
                throw new Error("ContractFlow: Call to copy constructor with additional flow specification.");

            this.entity = new Entity(entity.entity);

            this.flows = [];
            for(var i in entity.flows) 
                this.flows.push(new Flow(entity.flows[i]));
        } else {
            if(!entity || !flows)
                throw new Error("ContractFlow: Cannot construct without entity or any flows.");

            this.entity = new Entity(entity);

            if(!(flows instanceof Array)) {
                throw new Error("ContractFlow: Constructor only accepts an array of flows.");
            }

            this.flows = [];
            for(var i in flows) {
                console.log("flows["+i+"]: "+flows[i]);
                this.flows.push(new Flow(flows[i]));
            }
        }
    };

    cls.prototype.compile2JS = function() {
        throw new Error("ContractFlow: Method compile2JS not defined yet");
    };

    cls.prototype.compile2PolicyEval = function() {
        var result = "";

        var srctrg = this.entity.compile2PolicyEval();
        for(var i in this.flows) {
            var strFlow = this.flows[i].compile2PolicyEval() ;
            if(this.flows[i].hasTrg()) {
                result += strFlow + srctrg + ";";
            } else {
                if(strFlow.charAt(strFlow.length - 1) != ';')
                    result += srctrg + strFlow + srctrg + ";";
                else
                    result += srctrg + strFlow;
            }
            result += "\n";
        }
            
        return result;
    };

    return cls;
})();

if(global && typeof print !== "function") {
		module.exports = ContractFlow;
}
