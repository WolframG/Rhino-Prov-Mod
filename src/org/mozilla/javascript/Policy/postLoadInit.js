Lock.lockConstructors = [];
//Lock.registerLock("inTimePeriod", TimePeriodLock);
Lock.registerLock("isUser", UserLock);
Lock.registerLock("inGroup", GroupLock);
Lock.registerLock("hasID", HasIDLock);
Lock.registerLock("actsFor", ActsForLock);
Lock.registerLock("closed", ClosedLock);
//Lock.registerLock("open", OpenLock);

var pSO;
var pSU;
var ret;
var pSet;
var entDes;
var cont;

var p2 = new Policy({"entity":{"type":"so","id":"1234"},"flows":[{"source":{"type":"any"}},{"target":{"type":"any"}}]});
var pSU = new Policy([{"source":{"type":"any"}},{"target":{"type":"any"}}]);
print("public SO: " + p2 + "\n");
print("public SU: " + pSU + "\n");
//print("XXX Flow check: " +  JSON.stringify(pSU.checkFlow(p2,Policy.Direction.INCOMING, null)) + "\n");

