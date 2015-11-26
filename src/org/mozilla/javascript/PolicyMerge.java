/* -*- Mode: java; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.javascript;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.Reader;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.Reader;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
//import org.apache.commons.lang3.StringEscapeUtils;





/**
* This class implements the interface to the data management layer
*
*/
public class PolicyMerge
{
  private boolean error;
  private ScriptEngineManager manager = new ScriptEngineManager();
  private ScriptEngine engine = manager.getEngineByName("JavaScript");

  private static String getStringFromInputStream(InputStream is) {

		if (is == null){
			System.out.println("Empty inout stream");
			return "";
		}

		BufferedReader br = null;
		StringBuilder sb = new StringBuilder();

		String line;
		try {

			br = new BufferedReader(new InputStreamReader(is));
			while ((line = br.readLine()) != null) {
				sb.append("\n" + line);
			}

		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			if (br != null) {
				try {
					br.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}

		return sb.toString();

	}

  public PolicyMerge() {
  String currentJsCode = "";
  String fileList[] = {"Flow.js", "system.js", "PolicyConfig.js", "PolicySet.js", "Policy.js", "ContractFlow.js", "Lock.js", "LockContext.js", "Context.js", "Entity.js", "Contract.js", "Locks/TimePeriodLock.js", "Locks/Closed.js", "Locks/IsEqLock.js", "Locks/Open.js", "Locks/IsEq.js", "Locks/GroupLock.js", "Locks/HasIDLock.js", "Locks/UserLock.js", "Locks/IsLtLock.js", "Locks/ActsForLock.js","postLoadInit.js"};
  String path = "/js/de/passau/uni/sec/compose/Policy/";

  for (int i = 0; i < fileList.length; i++){
    System.out.println("jar " + path + fileList[i]);
    InputStream resource = PolicyMerge.class.getResourceAsStream(path + fileList[i]);
    currentJsCode = getStringFromInputStream(resource);
    try {
      engine.eval(currentJsCode);
      currentJsCode = "";
    } catch (Exception eJS) {
      currentJsCode = "";
      System.out.println("PDP-JS: " + eJS);
      error = true;
    }
  }

}






  public void PolicyMergeNoJar() {
    error = false;

    // Load files
    File polFolder = new File("./src/org/mozilla/javascript/Policy/");
    File[] polFiles = polFolder.listFiles();
    for (File i : polFiles){
      if (i.isFile() && i.getName().toLowerCase().endsWith(".js") && (i.getName().toLowerCase().endsWith("postloadinit.js") == false)){
        System.out.println(i);
        Reader poReaderTemp;
        try {
          poReaderTemp = new FileReader(i);
          engine.eval(poReaderTemp);
        } catch (Exception e) {
          System.out.println("PDP-JS: " + e);
          error = true;
        }
      }
    }
    // Load logs
    File locFolder = new File("./src/org/mozilla/javascript/Policy/Locks/");
    File[] locFiles = locFolder.listFiles();
    for (File i : locFiles){
      if (i.isFile() && i.getName().toLowerCase().endsWith(".js")){
        System.out.println(i);
        Reader poReaderTemp;
        try {
          poReaderTemp = new FileReader(i);
          engine.eval(poReaderTemp);
        } catch (Exception e) {
          System.out.println("PDP-JS: " + e);
          error = true;
        }
      }
    }
    // Register logs
    File testFile = new File("./src/org/mozilla/javascript/Policy/postLoadInit.js");
    Reader testReader;
    try {
      testReader = new FileReader(testFile);
      engine.eval(testReader);
    } catch (Exception e) {
      System.out.println("PDP-JS: " + e);
      error = true;
    }
  }

  /*
  * Performes the merge (LUB)
  */
  public String PolicyMerge(ArrayNode ps) {
    String ret = null;
    System.out.println("JS-Merge init-error:" + error);
    String code = "";
    // Check if there are two policies
    if (ps == null)
    {
      System.out.println("DPD-JS: no Policy found");
      return null;
    }

    System.out.println("Achtung starte merge");
    System.out.println("Java Pol Array: " + ps.toString());
    // Generate analysis code
    code += "pa = "+ ps.toString()+";";
    code += "ret = new Policy(pa[0]);";
    code += "print(\"ret1-js:\" + JSON.stringify(pa[1])+\"-------\");";
    //code += "ret = ret.lub(new Policy(pa[1]));";
    code += "for(var i=1;i<pa.length;i++){ ret = ret.lub(new Policy(pa[i])); ret.entity = null;}";
    //code += "";
    /*code += "p1 = new Policy(" + p1.toString()+");";
    code += "p2 = new Policy(" + p2.toString()+");";
    code += "ret = p1.lub(p2);";*/
    code += "ret = new Policy(ret);";
    code += "print(JSON.stringify(ret));";
    code += "ret = JSON.stringify(ret.flows);";
    // Evaluate code
    try {
      engine.eval(code);
      Object retJS = engine.get("ret");
      System.out.println("\nRET in Java: " + retJS);
      if (retJS instanceof String){
        ret = (String) retJS;
      } else {ret = null;};
    } catch (ScriptException e) {
      System.out.println("PDP-JS: " + e);
      ret = null;
    }
    return ret;


  }

  public JsonNode PolicyGetBestMatch(JsonNode soPol, String stream, String soID) {
    JsonNode ret;
    String code = "";
    String retTemp = "";
    System.out.println("Starte get best");
    if (soPol == null)
    {
      System.out.println("DPD-JS: no Policy found for the SO");
      return null;
    }
    // Build entity with the stream
    String entity = "{\"type\" : \"so\", \"id\":" + soID + ",\"stream\": \""+ stream + "\"}";


    System.out.println("Java Pol Array: " + soPol.toString());
    // Generate analysis code
    code += "entDes = new Entity(" + entity + ");";
    
    code += "var poTemp = "+ soPol.toString() + ";";
    code += "for (var i = 0; i < poTemp.length; i++){if(poTemp[i].hasOwnProperty(\"object\")){ poTemp[i].object.type = poTemp[i].object.type.toLowerCase();}} ;";
    code += "pSet = new PolicySet(poTemp);";

		//code += "print(\"Entity \"+JSON.stringify(entDes));";
    //code += "print(\"PolicySet \"+JSON.stringify(pSet));";
		code += "pSO = pSet.getBestMatchPolicy(entDes);";
		//code += "print(\"Best match \"+JSON.stringify(pSO));";
    code += "ret = JSON.stringify(pSO);";
    // Evaluate code
    try {
      engine.eval(code);
      Object retJS = engine.get("ret");
      //System.out.println("\nRET in Java: " + retJS);
      if (retJS instanceof String){
        retTemp = (String) retJS;
        // Build JSON node
        ObjectMapper mapper = new ObjectMapper();
        ret = mapper.readTree(retTemp);
      } else {ret = null;};
    } catch (Exception e) {
      System.out.println("PDP-JS: " + e);
      ret = null;
    }
    System.out.println("\nRET in Java JSON: " + ret);
    return ret;

  }

}