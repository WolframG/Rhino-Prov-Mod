Rhino-Prov-Mod
==============

Changed files:
src/org/mozilla/javascript/ScriptableObject.java
src/org/mozilla/javascript/Context.java
src/org/mozilla/javascript/IdFunctionObject.java
src/org/mozilla/javascript/ScriptRuntime.java
src/org/mozilla/javascript/optimizer/Codegen.java
src/org/build.xml




Added files:
src/org/mozilla/javascript/Provelement.java
src/org/mozilla/javascript/Provenance.java
src/org/mozilla/javascript/ProvenanceAPI.java
src/org/mozilla/javascript/ProvStackElement.java
src/org/mozilla/javascript/demo/ProvDemo.java
lib/ several jar files



To compile (generate jar file):
ant jar

Demo programm for provenance module:
src/org/mozilla/javascript/demo

To run demo programm:
java -cp build/rhino1_7R5pre/js.jar:lib/*:. org.mozilla.javascript.demo.ProvDemoFlag
java -cp build/rhino1_7R5pre/js.jar:lib/*:. org.mozilla.javascript.demo.ProvDemo

To use test webpages:
chromium-browser --disable-web-security
