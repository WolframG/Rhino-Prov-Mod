// TODO: Handle empty context.locks

var Context = (function() {
    var cls = function(context) {

        this.isStatic = false;
        this.subject = undefined;
        this.object = undefined;
        this.locks = undefined;

        if(context) {
            this.subject = context.subject;
            this.object = context.object;
            this.locks = context.locks;
            this.isStatic = context.isStatic;
        }
    };

    return cls;
})();

Context.prototype.getLockState = function(lock, subject) {
    if(!lock)
        return undefined;

    if(!lock.path) 
        return undefined;

    if(lock.path == "closed")
        return false;

    if(!this.locks)
        return undefined;

    var key = "global";
    if(subject) {
        if(!subject.type)
            throw new Error("Context: Invalid subject format!");
        if(subject.type == "msg")
            key = "msg";
        else {
            if(!subject.data)
                throw new Error("Context: Invalid subject format!");

            key = subject.type + subject.data.id;
        }
    }
    if(!this.locks[key]) 
        return undefined;
    
    var subjectContext = this.locks[key];

    if(subjectContext[lock.path] == undefined || subjectContext[lock.path] == null) {
        return undefined;
    } else {
        if(subjectContext[lock.path] === false || subjectContext[lock.path] === true) {
            return subjectContext[lock.path];
        }
    }
    
    var states = subjectContext[lock.path];
    
    if(!lock.args || lock.args.length == 0) {
        if(states === true || states === false)
            return states;
    }
    
    var strArg = "";
    for(var s in lock.args)
        strArg += lock.args[s] + ",";
    
    if(states[strArg] == undefined || states[strArg] == null)
        return undefined;
    else
        return states[strArg];
};

Context.prototype.addLockState = function(lock, subject, value) {
    if(!lock) 
        return;

    if(subject != undefined && (subject === false || subject === true) ) {
        value = subject;
        subject = null;
    }

    if(value == undefined || value == null)
        value = true;

    if(!this.locks) 
        this.locks = {};

    var key = "global";
    if(subject) {
        if(!subject.type)
            throw new Error("Context: Invalid subject format!");
        
        if(subject.type == "msg")
            key = "msg";
        else {
            if(!subject.data)
                throw new Error("Context: Invalid subject format!");

            key = subject.type + subject.data.id;
        }
    }
    if(!this.locks[key])
        this.locks[key] = {};

    var subjectContext = this.locks[key];
    
    if(subjectContext[lock.path] == undefined || subjectContext[lock.path] == null) {
        subjectContext[lock.path] = {};
    } else {
        if(subjectContext[lock.path] === false || subjectContext[lock.path] === true) {
            return;
        }
    }

    // this must be a lock without arguments
    if(!lock.args || lock.args.length == 0) {
        subjectContext[lock.path] = value;
        return;
    }

    var strArg = "";
    for(var s in lock.args)
        strArg += lock.args[s] + ",";

    var states = subjectContext[lock.path];
    if(states[strArg] == undefined || states[strArg] == null)
        states[strArg] = {};
        
    states[strArg] = value;
};

if(global && typeof print !== "function")
    module.exports = Context;
