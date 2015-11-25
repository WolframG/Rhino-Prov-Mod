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

var TimePeriodLock = function(lock) {
    // call the super class constructor
    TimePeriodLock.super_.call(this, lock);
};

Lock.registerLock("inTimePeriod", TimePeriodLock);

system.inherits(TimePeriodLock, Lock);

TimePeriodLock.prototype.copy = function() {
    // console.log("TimePeriodLock.copy");
    var c = new TimePeriodLock(this);
    return c;
}

TimePeriodLock.prototype.isOpen = function(context) {
    if(context && !context.isStatic) {
        var currentDate = new Date();
        var hours = currentDate.getHours();
        var mins = currentDate.getMinutes();
        
        var currentTime = hours < 10 ? '0' + hours : '' + hours;
        currentTime += ":" + (mins < 10 ? '0' + mins : '' + mins);
        
        if(this.args[0] <= currentTime &&
           this.args[1] >= currentTime)
            return { result : true, conditional : false };
        else
            return { result : false, conditional : false };
    } else {
        return { result : true, conditional : true, lock : this };
    }
}

TimePeriodLock.prototype.lub = function(lock) {

    if(!(lock instanceof TimePeriodLock))
        return null;
    // throw new Error("TimerPeriodLock: Error: Cannot generate LUB between different lock types");

    var sstart1 = this.args[0]+"", send1 = this.args[1]+"";
    var sstart2 = lock.args[0]+"", send2 = lock.args[1]+"";
    var newStart = 0;
    var newEnd = 0;

    var splitStart1 = sstart1.split(":");
    var start1 = splitStart1[0] * 100 + splitStart1[1]*1;
    var splitStart2 = sstart2.split(":");
    var start2 = splitStart2[0] * 100 + splitStart2[1]*1;
    var splitEnd1 = send1.split(":");
    var end1 = splitEnd1[0] * 100 + splitEnd1[1]*1;
    var splitEnd2 = send2.split(":");
    var end2 = splitEnd2[0] * 100 + splitEnd2[1]*1;

    // console.log("s1: %j, e1: %j, s2: %j, s3: %j", start1, end1, start2, end2);

    if(start1 > end1)
        start1 = start1 - 2400;
    
    if(start2 > end2)
        start2 = start2 - 2400;
    
    // check whether intervals overlap
    if(start2 >= end1) {
        return Lock.closedLock();
    } else {
        if(start1 < start2) {
            newStart = start2;
        } else {
            newStart = start1;
        }

        if(end1 > end2) {
            newEnd = end2;
        } else {
            newEnd = end1;
        }
    }

    // console.log("ns: %j, ne: %j", newStart, newEnd);

    if(newStart >= newEnd)
        return Lock.closedLock();

    if(newStart < 0)
        newStart = newStart + 2400;

    if(newEnd < 0)
        newEnd = newEnd + 2400;

    var hours = Math.floor(newStart / 100);
    hours = (hours < 10 ? "0" + hours : hours);
    var minutes = newStart % 100;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    // console.log("hours: "+hours);
    var snewStart = hours + ":" + minutes;

    hours = Math.floor(newEnd / 100);
    hours = (hours < 10 ? "0" + hours : hours);
    minutes = newEnd % 100;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    var snewEnd = hours + ":" + minutes;

    // console.log("snewStart: %j, snewEnd: %j", snewStart, snewEnd);

    return new TimePeriodLock({ path : 'inTimePeriod', args : [ snewStart, snewEnd] });
}

if(global && typeof print !== "function")
    module.exports = TimePeriodLock;
