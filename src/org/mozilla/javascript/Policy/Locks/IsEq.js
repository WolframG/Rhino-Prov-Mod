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

var IsEqLock = function(lock) {
    IsEqLock.super_.call(this, lock);
}

system.inherits(IsEqLock, Lock);

IsEqLock.prototype.copy = function() {
    var c = new IsEqLock(this);
    return c;
}

IsEqLock.prototype.isOpen = function(context) {
    throw new Error("IsEqLock: isOpen not implemented for this ContractLock");

    if(context) {
		if(context.subject.type == 'node') {
            var v1 = this.args[0];
            var v2 = this.args[1];

            if(v1.type && v1.type == 'var') {
            }
            
			return { result : (this.args[0] === context.subject.node.id), conditional : false };
		} else 
			throw new Error("Other contexts than node contexts are not supported");
	} else {
        if((this.args[0].type && this.args[0].type !== 'const') || (this.args[1].type && this.args[0].type !== 'const'))
		    throw new Error("IsEqLock: Unable to evaluate lock without context.");

        var v1 = this.args[0];
        var v2 = this.args[0];

        if(v1.type && v1.type == 'const')
            v1 = this.args[0].value;

        if(v2.type && v2.type == 'const')
            v2 = this.args[0].value;

        return v1 == v2;
    }
}

IsEqLock.prototype.lub = function(lock) {
    throw new Error("IsEqLock: lub not implemented for this ContractLock");
    
    if(this.eq(lock))
		return this;
    else {
		var neg = this.copy().neg();
		if(neg.eq(lock))
			return new Lock();
		else
			return null;
    }
}

IsEqLock.prototype.compile2PolicyEval = function() {
    var v1 = this.args[0].compile2PolciyEval();
    var v2 = this.args[1].compile2PolciyEval();

    return v1 + " == " + v2;
}

if(global && typeof print !== "function")
    module.exports = IsEqLock;
