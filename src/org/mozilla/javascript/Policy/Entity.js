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

var Entity = (function() {
    var cls = function(entity) {
        if(!entity) {
            entity = { type : "any" };
        }
        
        this.type = null;
        
        if(!entity.type) {
            throw new Error("Error: Call to entity constructor with invalid argument ("+entity+")");
        } else {
            for(var t in cls.Types) {
                if(entity.type === t) {
                    this.type = t;
                    break;
                }
            }
        }
        
        if(!this.type) {
            throw new Error("Error: unknown entity type");
        }
        
        this.id = entity.id;
        this.name = entity.name;
        
        this.input = entity.input;
        this.output = entity.output;
        this.stream = entity.stream;
        this.value = entity.value;
    };
    
    // Public and static members
    cls.Types = Object.freeze({
        "any"    :  1,
        "app"    :  2,
        "node"   :  3,
        "so"     :  4,
        "user"   :  5,
        "group"  :  6,
        "uri"    :  7,
        "api"    :  8,
        "const"  :  9,
        "attr"   : 10,
        "var"    : 11
    });
    
    // Public Methods
    cls.prototype = {
        key : function() {
            return this.type +
                (this.id !== undefined && this.id !== null ? "id" + this.id : "") +
                // the name does not change the entity 
                // (this.name !== undefined && this.name !== null ? "n" + this.name : "") +
                (this.input !== undefined && this.input !== null ? "i" + this.input : "") +
                (this.output !== undefined && this.output !== null ? "o" + this.output : "") +
                (this.stream !== undefined && this.stream !== null ? "s" + this.stream : "") +
                (this.value !== undefined &&  this.value !== null ? "v" + this.value : "");
        },
        
        isInputPort : function() {
            return this.type === 'app' && this.input;
        },
        
        isOutputPort : function() {
            return this.type === 'app' && this.output;
        },
        
        eq : function(e) {
            if(e == null) return false;
            if(e == undefined) return false;
            if(this.id != e.id) return false;
            if(this.type != e.type) return false;
            if(this.input != e.input) return false;
            if(this.output != e.output) return false;
            if(this.stream != e.stream) return false;
            if(this.value != e.value) return false;
            // the name does not change the entity
            // if(this.name != e.name) return false; 
            
            return true;
        },
        
        neq : function(e) {
            return !(this.eq(e));
        },
        
        dominates : function(e) {
            if(e === undefined || e === null) return false;
            
            if(this.id !== undefined &&
               this.id != e.id) {
                // console.log("id problem");
                return false;
            }
            
            if(this.type !== undefined &&
               this.type !== 'any' &&
               this.type !== e.type) {
                // console.log("type problem");
                return false;
            }
            
            if(this.input != undefined &&
               this.input != e.input) {
                // console.log("input problem");
                return false;
            } else if(this.output != undefined &&
                      this.output != e.output) {
                // console.log("output problem");
                return false;
            } else if(this.stream != undefined &&
                      this.stream != e.stream) {
                // console.log("stream problem");
                return false;
            }
            return true;
        },
        
        toString : function() {
            var str = "{ ";
            var comma = "";
            
            for(var prop in this) {
                if(this.hasOwnProperty(prop) && this[prop] !== undefined) {
                    str += comma;
                    str += prop + " : " + this[prop];
                    comma = ", ";
                }
            }
            
            str += " }";
            
            return str;
        },

        compile2PolicyEval : function() {
            switch(this.type) {
            case 'var' : 
                return this.name;
            case 'const' :
                return (typeof(this.value) == "number") ? this.value : '"'+this.value+'"';
            default :
                throw new Error("Entity: Type '"+this.type+"' not supported for compile2PolciyEval");
            }
        }
    };
    
    return cls;
})();

if(global && typeof print !== "function")
    module.exports = Entity;
