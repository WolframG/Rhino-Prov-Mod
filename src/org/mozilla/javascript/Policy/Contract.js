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

if(global && typeof print !== "function") {
	var PolicyConfig = require("./PolicyConfig.js");
    var ContractFlow = require(PolicyConfig.rootDir + "./ContractFlow.js");
    var Lock = require(PolicyConfig.rootDir + "./Lock.js");
    var Entity = require(PolicyConfig.rootDir + "./Entity.js");

    var jsFlowPath = "../jsflow/src/jsflow.js";
    var util = require("util");
    var vm = require("vm");
}

var Contract = (function() {

    var cls = function(flows) {
        this.flows = null;

        if(!flows || !(flows instanceof Array)) {
            throw new Error("Contract: Cannot construct contract if no flow array is specified!");
        }

        this.flows = [];
        for(var f in flows) {
            var newFlow = flows[f];
            if(newFlow instanceof ContractFlow)
                this.flows.push(new ContractFlow(newFlow));
            else
                this.flows.push(new ContractFlow(newFlow.entity, newFlow.flows));
        }
    };

    cls.prototype.compile2JS = function() {
        return null;
    };

    cls.prototype.compile2PolicyEval = function() {
        var process = "";

        for(var f in flows) {
            process += flows[f].compile2PolicyEval();
        }

        return process;
    };

    return cls;
})();


var contractCache = {};
/*
* Executes the contract with the given message and node in jsflow.
*/
var processContract = function(node, msg, addParam){

	var sandbox = {
			jsflow: require(jsFlowPath), // Path to JsFlow
			console:console,
			util:util,
			Buffer:Buffer,
			context: {}
	};

	var context = vm.createContext(sandbox);

	if(typeof node.res != 'undefined') {
		var res = node.res;
		node.res = null;
	}
	if(typeof node.req != 'undefined') {
		var req = node.req;
		node.req = null;
	}
	if(node.contractMsg) {
		node.contractMsg = null;
	}


    //check msg policy before execution
    checkPolicy(msg);
    contract = getContract(node);

    //extract additional parameters.
    var parameters = "";
    for(var prop in addParam) {
        parameters = parameters + "var " + prop + " = " + JSON.stringify(addParam[prop]) + ";";
    }

    try {
        context.msg = msg;

        var functionCode = "var node = " + JSON.stringify(node) + ";" + parameters + contract;
        var functionText = "var results = null; results = jsflow.execWithJsFLOW(" + JSON.stringify("(function(msg){" + functionCode + "})(msg)") + "," + JSON.stringify(msg) + ")";

        var script = vm.createScript(functionText);
        script.runInContext(context);
        var results = context.results;


        //check policy after execution
        checkPolicy(results);

    	if(typeof node.res != 'undefined') {
    		node.res = res;
    	}
    	if(typeof node.req != 'undefined') {
    		node.req = req;
    	}

        return results;

    } catch(err) {
    	console.log("Error executing jsflow");
    	console.log("Node causing the error: " + node.type);
        console.log(err.toString());
    }
}

//Checks if the message policy is still complaint
var checkPolicy = function(msg) {
    //TODO implement
}

var getContract = function(node) {
    //TODO database access
    //Use mongodb
		if(contractCache[node.id]) {
				return contractCache[node.id];

	}else{

			//TODO Set Contract into cache

			if(node.type == 'http in') {
					contract =
										"if (node.method == \"get\") {"  +
												"msg = {req:req, res:res, payload:req.query};" +
												"return msg;" +
										"} else if (node.method == \"post\") {" +
												"msg = {req:req, res:res, payload:req.body};" +
												"return msg;" +
										"} else {" +
												"msg = {req:req ,res:res};" +
												"return msg;" +
										"};";
					return contract;
			} else {
					return "return msg;"
			}
		}



}


if(global && typeof print !== "function") {
		module.exports = Contract;
}

// module.exports.processContract = processContract;
