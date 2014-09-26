/* -*- Mode: java; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.javascript;

import java.io.File;
import java.io.IOException;
import java.security.Timestamp;
import java.util.*;
import java.util.Map.Entry;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.jayway.jsonpath.Criteria;
import com.jayway.jsonpath.Filter;
import com.jayway.jsonpath.JsonPath;
import net.minidev.json.JSONObject;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;


/**
 * This class implements the interface to the data management layer
 *
 */
public class ProvenanceAPI
{	
	static String[] PROVENANCE_ENTRIY = {"\"agent\"", "\"type\"", "\"entity\"", "\"activity\"", "\"timestamp\"", "\"accessed\"", "\"onbehalf-of\"", "\"source\""};
	public static final String COMPUTATION = "res";


	/**
	 * Returns the "normal" return value of the computation
	 *
	 * @param provData  List of provelements gathered during computation
	 * @return return-value of the compuation
	 */
	public static Object getResultValue(List<Provelement> provData){
	Object value = "";
	boolean found = false;
	for(Provelement element : provData)
	{
		if (element.writeVar == "return"){
			value = element.readVars.get(0);
			found = true; 
			break;
		}
	}
	if (found == false)
	{
		return null;
	}
	return value;
	}



	/**
         * OBSOLETE (moved to the general call library
	 * Returns the provenance String for Basic SU (source is a webobject)
	 *
	 * @param securityMetaData  Identity Management data for SO (JSON)
	 * @param webObjId	 Contains all information gahtered during runtime
	 * @return String containing the provenance data for the new SU
	 */
	public static String getBasicSuProvenance(String securityMetaData, String webObjId)
	{
		// Agent
		String agent = PROVENANCE_ENTRIY[0] + " : \"SO\",\n";
		// Type
		String type = PROVENANCE_ENTRIY[1] + " : \"sensor_update\",\n";
		// Entity
		String entity = PROVENANCE_ENTRIY[2] + " : \"\" ,\n";
		// Activity
		String activity = PROVENANCE_ENTRIY[3] + " : \"creattion\",\n";
		// Timestamp
		Date date= new Date();
		long time = date.getTime();
		String timestamp = PROVENANCE_ENTRIY[4] + " : " + time + ",\n";
		// Accessed
		String accessed = PROVENANCE_ENTRIY[5] + " :  NULL,\n";
		// Onbehalf_of
		String onbehalf = PROVENANCE_ENTRIY[6] + " : " + "\"default.user.12345\"" + ",\n"; //TODO replace acording to the securityMetaData
		// Source
		String source = PROVENANCE_ENTRIY[7] + " : \"" + webObjId + "\"\n";

		return "\"provenance\" : {" + agent + type + entity + activity + timestamp + accessed + onbehalf + source + "}";
	}


	/**
	 * Builds the computation String, (including variable declarations)
	 *
	 * @param variableAnadValue Map contaning variables and there corresonding value; and the compuation code
	 * @return String containing the full campuation string e.g. "var a = 1; var b = 2; a + b"
	 */
	public static String buildString(HashMap<String,String> variableAndValue)
	{
		String res = "";
		String comp = "";
		// HashMap<String, String> varNameMapping = new HashMap<String,String>();//Add this code if no JavaScript compliant variable name is passed
		for(Entry<String, String> entry : variableAndValue.entrySet()) {
		    String key = entry.getKey();
		    String value = entry.getValue();
		    if (key == "res")
		    {
			comp = value;
		    }
		    else
		    {
			// Add this code if no JavaScript compliant variable name is passed
			//String newVarName = getValideVarName(key);
			//varNameMapping.put(key, newVarName);
		    	//res = "var " + newVarName + " = " + value + ";" + res;
			res = "var " + key + " = " + value + ";" + res;

		    }
		}
		//res = res + getValideComputation(comp, varNameMapping); Add this code if no JavaScript compliant variable name is passed
		res = res + comp;
		return res;
	}




	/**
         * Returns the provenance information in JSON -- Tree No References --
	 * 
	 * @param securityMetaData  Identity Management data for SO (JSON)
	 * @param provList	 Contains all information gahtered during runtime
	 * @param VarName_SuPath	 Maping between variable names and SU
	 * @return String containing the provenance data for the new SU
	 */
	public static String buildProvenanceJSON(String securityMetaData, List<Provelement> provList, Map<String, String> VarName_SuPath)
	{
                // Check the flag if provenance collection is on
                boolean profOn;
                try{
                        profOn = provenanceCollection(securityMetaData);
                }catch(Exception e){profOn = true;}
                if (profOn == false){return "";}

		// Generate JSON data
		
		// Agent
		String agent = PROVENANCE_ENTRIY[0] + " : \"SO\",\n";
		// Type
		String type = PROVENANCE_ENTRIY[1] + " : \"sensor_update\",\n";
		// Entity
		String entity = PROVENANCE_ENTRIY[2] + " : \"\" ,\n";
		// Activity
		String activity = PROVENANCE_ENTRIY[3] + " : " + buildActivityString(provList) + ",\n"; //" : derived_from,\n";
		// Timestamp
		Date date= new Date();
		long time = date.getTime();
		String timestamp = PROVENANCE_ENTRIY[4] + " : " + time + ",\n";
		// Accessed
		String accessed = PROVENANCE_ENTRIY[5] + " :  [],\n";
		// Onbehalf_of
		String onbehalf = PROVENANCE_ENTRIY[6] + " : " + "\"default.user.1234\"" + ",\n"; //TODO replace acording to the securityMetaData
		// Source
		String source = PROVENANCE_ENTRIY[7] + " : [\n";
			//Find out which provenance data has to be copied into the new SU
			Set<String> usedSU = new TreeSet<String>();
			for(Provelement currentVars : provList)
			{
			// Add provenance data for all written variables
				/*String tempW = "";
				for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
				{
					//if ((getValideVarName(entry.getKey())).equals(currentVars.writeVar)) // Add this code if no JavaScript compliant variable name is passed
					if ((entry.getKey()).equals(currentVars.writeVar))
					{
						tempW = entry.getValue();
						break;
					}						
				}
				//String tempW = VarName_SuPath.get(currentVars.writeVar);
				if (tempW != null && usedSU.contains(tempW) == false )
				{
					String tempString = "";
					if (tempW.equals("return")){continue;}
					tempString = addSource(tempW);
					if (tempString.equals("") == false)
					{
						if (usedSU.size()>= 1) {tempString = ","  + tempString;}
						source += tempString;
					}
					usedSU.add(tempW);
				}*/
				for(String read : currentVars.readVars)
				{
					String tempR = "";
					for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
					{
						//if ((getValideVarName(entry.getKey())).equals(read))	// Add this code if no JavaScript compliant variable name is passed				
						if ((entry.getKey()).equals(read))
						{
							tempR = entry.getValue();
							break;
						}						
					}
					//String tempR =  VarName_SuPath.get(read);
					if (tempR != null && usedSU.contains(tempR) == false )
					{
						String tempString = "";
						tempString = addSourceJSON(tempR);
						if (tempString.equals("") == false)
						{
							if (usedSU.size()> 0) {
								tempString = "," +  tempString;}
								source += tempString;
						}
						usedSU.add(tempR);
					}
				}
			}
			source += "]\n";
		
		return "{\"provenance\" : {" + agent + type + entity + activity + timestamp + accessed + onbehalf + source + "}}";
	}


/** 
 * 
 * @param SU in JSON format 
 * @return String that contains the provenance information 
 */
	public static String addSourceJSON(String su) 
	{
                String returnString = "";
                try{
                ObjectMapper mapper = new ObjectMapper();
		JsonNode data;
		data = mapper.readTree(su);
                JsonNode provCollection = data.findValue("provenance");
                returnString = provCollection.toString();
        
                }catch(Exception e){}
		return returnString;
        }
	



/** 
 * Obsolete
 * 
 * @param SU in JSON format 
 * @return String that contains the provenance information 
 */
	public static String addSource(String su) 
	{	
		String returnString = "";
		List<Object>  tempList = new LinkedList<Object>();
		try{
			tempList = JsonPath.read(su, ".provenance");
			//returnString =  "{ \"" + JsonPath.read(su, ".provenance").toString() + "}";
		} catch (Exception e) {
			return "";
		}

		for (Object tempObject : tempList)
		{
			if (tempObject != null)
			{
				returnString += tempObject.toString();
			}
		}	
                // Replace fist "{" and last "}" by "[" and  "]"
                returnString = returnString.replaceFirst("^\\{", "\\[");
                returnString = returnString.replaceFirst("\\}$", "\\]");
                
		return returnString;
	}


/** 
 * 
 * @param Code full computation string (including variable declarations) 
 * @return List of Provelements (containing the data gathered during runtime and the actual result)
 */
	public static List<Provelement> executeWithProv(String code)
	{
		Provenance.init();
		List<Provelement> provList = new LinkedList<Provelement>();
		try
		{
			Context cx = Context.enter();

			Scriptable scope = cx.initStandardObjects();
			Object apiResult = (Object) cx.evaluateString(scope, code, "<COMPOSE>", 1, null);
			provList = (List<Provelement>) apiResult;
		}
		finally
		{
			Context.exit();
		}
		return provList;
	}


/** 
 * 
 * @param Code full computation string (including variable declarations) 
 * @return List of Provelements (containing the data gathered during runtime and the actual result)
 */
	public static List<Provelement> executeWithProv(String code, List<Provelement> oldElements)
	{

		List<Provelement> returnList = new LinkedList<Provelement>();
		// Adds all alt provenance entries and removes the old result value
		for (Provelement tempElement : oldElements)
		{
			if (!(tempElement.writeVar.equals("return")))
			{
				returnList.add(tempElement);
				//System.out.println("add : " + tempElement.activity);
			}
		}
		// Calles the executeWithProv(String code) function
		returnList.addAll(executeWithProv(code));
		return returnList;
	}

	private static String buildActivityString(List<Provelement> provList)
	{
		String returnString = "";
		Map<String, Set<String>> varOpList  = new HashMap<String, Set<String>>(); // Key = var; Value = List of operations
		// Find all activities that are performed on a variable 
		for(Provelement element : provList)
		{
			if (element.writeVar.equals("return") == true)
			{
				continue;
			}
			//System.out.print("   Write: " + element.writeVar + " Reads:");
			for (String read: element.readVars)
			{
				if (varOpList.containsKey(read))
				{
					Set<String> tempList = varOpList.get(read);
					tempList.add(element.activity);
					varOpList.put(read, tempList);
				}
				else
				{
					Set<String> tempList = new TreeSet<String>();
					tempList.add(element.activity);
					varOpList.put(read,tempList);				
				}			
			}
		}
		// Add all variables which used the same operation
		Map<String, Set<String>>varsOpsMap = new HashMap<String, Set<String>>();	// Key = operations; Value = List of variables
		for(Map.Entry<String, Set<String>> entry : varOpList.entrySet())
		{
			String operations = "";
			for (String tempString : entry.getValue())
			{
				if (operations.equals("") == false){ operations += ", ";}
				operations = operations + tempString;
			}
			if (varsOpsMap.containsKey(operations))
			{
				Set<String> tempList = varsOpsMap.get(operations);
				tempList.add("\"" + entry.getKey() + "\"");
				varsOpsMap.put(operations, tempList);
			}
			else
			{
				Set<String> tempList = new HashSet<String>();
				tempList.add("\"" + entry.getKey() + "\"");
				varsOpsMap.put(operations,tempList);				
			}
		}
		// Build string to for adding to the JSON file
		returnString += "[";
		for(Map.Entry<String, Set<String>> entry : varsOpsMap.entrySet())
		{
			if(returnString.equals("[") == false){ returnString += ",\n";}
			returnString += "{ \"op\": [" + entry.getKey() + "], \"var\":" + entry.getValue() + "}"; 

		}
		returnString += "]";

		return returnString;
	}

	private static String getValideVarName(String varName)
	{
		String returnString = varName.replace(".", "$");
		returnString = returnString.replace("-", "$");	
		return "" + returnString; //"X" removed
	}
	
	private static String getValideComputation(String computationString, Map<String, String> varNameMapping)
	{
		String returnString = computationString;
		for (Map.Entry<String, String> entry : varNameMapping.entrySet())
		{
			Matcher matcher = Pattern.compile("(?<![\\w\\d$])" + entry.getKey() + "(?![\\w\\d$])" ).matcher(returnString);
			StringBuffer sb = new StringBuffer();
			while ( matcher.find())
			  matcher.appendReplacement( sb, entry.getValue() );
			matcher.appendTail( sb );
			returnString = sb.toString();
		}
		
		return returnString;
	}










	/**
         * Returns the provenance information in JSON -- NO Tree No References --
	 * 
	 * @param securityMetaData  Identity Management data for SO (JSON)
	 * @param provList	 Contains all information gahtered during runtime
	 * @param VarName_SuPath	 Maping between variable names and SU
	 * @return String containing the provenance data for the new SU
	 */
	public static String buildProvenanceJSONNoTree(String securityMetaData, List<Provelement> provList, Map<String, String> VarName_SuPath)
	{
		// Generate JSON data
		
		// Agent
		String agent = PROVENANCE_ENTRIY[0] + " : \"SO\",\n";
		// Type
		String type = PROVENANCE_ENTRIY[1] + " : \"sensor_update\",\n";
		// Entity
		String entity = PROVENANCE_ENTRIY[2] + " : \"\" ,\n";
		// Activity
		String activity = PROVENANCE_ENTRIY[3] + " : " + buildActivityString(provList) + ",\n"; //" : derived_from,\n";
		// Timestamp
		Date date= new Date();
		long time = date.getTime();
		String timestamp = PROVENANCE_ENTRIY[4] + " : " + time + ",\n";
		// Accessed
		String accessed = PROVENANCE_ENTRIY[5] + " :  [],\n";
		// Onbehalf_of
		String onbehalf = PROVENANCE_ENTRIY[6] + " : " + "\"default.user.1234\"" + ",\n"; //TODO replace acording to the securityMetaData
		// Source
		String source = PROVENANCE_ENTRIY[7] + " : [\n";
			//Find out which provenance data has to be copied into the new SU
			Set<String> usedSU = new TreeSet<String>();
			for(Provelement currentVars : provList)
			{
			// Add provenance data for all written variables
				/*String tempW = "";
				for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
				{
					//if ((getValideVarName(entry.getKey())).equals(currentVars.writeVar)) // Add this code if no JavaScript compliant variable name is passed
					if ((entry.getKey()).equals(currentVars.writeVar))
					{
						tempW = entry.getValue();
						break;
					}						
				}
				//String tempW = VarName_SuPath.get(currentVars.writeVar);
				if (tempW != null && usedSU.contains(tempW) == false )
				{
					String tempString = "";
					if (tempW.equals("return")){continue;}
					tempString = addSource(tempW);
					if (tempString.equals("") == false)
					{
						if (usedSU.size()>= 1) {tempString = ","  + tempString;}
						source += tempString;
					}
					usedSU.add(tempW);
				}*/
				for(String read : currentVars.readVars)
				{
					String tempR = "";
					for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
					{
						//if ((getValideVarName(entry.getKey())).equals(read))	// Add this code if no JavaScript compliant variable name is passed				
						if ((entry.getKey()).equals(read))
						{
							tempR = entry.getValue();
							break;
						}						
					}
					//String tempR =  VarName_SuPath.get(read);
					if (tempR != null && usedSU.contains(tempR) == false )
					{
						String tempString = "";
						tempString = addSourceNoProf(tempR);
						if (tempString.equals("") == false)
						{
							if (usedSU.size()> 0) {
								tempString = "," +  tempString;}
								source += tempString;
						}
						usedSU.add(tempR);
					}
				}
			}
			source += "]\n";
		
		return "{\"provenance\" : {" + agent + type + entity + activity + timestamp + accessed + onbehalf + source + "}}";
	}


/** 
 * For representation with only on layer of provenance information (no tree)
 *
 * @param SU in JSON format 
 * @return String that contains the provenance information 
 */
	public static String addSourceNoProf(String su) 
	{	
                // Get all, get Source, replace source by ""
                // Get list of stuff or hardcode list and go throu it ("provenance: {" + concat + "}"
                

		String returnString = "";
		List<Object>  tempList = new LinkedList<Object>();
		try{
			tempList = JsonPath.read(su, ".provenance");
			//returnString =  "{ \"" + JsonPath.read(su, ".provenance").toString() + "}";
		} catch (Exception e) {
			return "";
		}
		List<Object>  tempList2 = new LinkedList<Object>();
		try{
			tempList2 = JsonPath.read(su, ".provenance.source");
			//returnString =  "{ \"" + JsonPath.read(su, ".provenance").toString() + "}";
		} catch (Exception e) {
			return "";
		}

                String source = "";
		for (Object tempObject : tempList2)
		{
			if (tempObject != null)
			{
				source += tempObject.toString();
			}
		}
		for (Object tempObject : tempList)
		{
			if (tempObject != null)
			{
                                 String sourceProv = tempObject.toString();
                                 // Perform cleansing on source (escape "[" and "]")
                                source = source.replaceAll("\\[", "\\\\\\[");
                                source = source.replaceAll("\\]", "\\\\\\]");
                                // Remove old sources from the input SUs
                                sourceProv = sourceProv.replaceAll("\\s*\"source\"\\s*:\\s*" + source + "\\s*,", "");
                                sourceProv = sourceProv.replaceAll("\\s*\"source\"\\s*:\\s*" + source + "\\s,", "");
				returnString += sourceProv;
			}
		}	
                //returnString = returnString.replaceFirst("^\\{", "\\[");
                //returnString = returnString.replaceFirst("\\}$", "\\]");
		return returnString;
	}


//----------------------------------------- Functions for the on/off switch ----------------------------------------- 

/** 
 * Checks if the provenance collection is active
 *
 * @param Security-Meta-data of the current SO
 * @return true == collect proveance data; false == execute without collecting proveance data
 */
        private static boolean provenanceCollection(String SO_Metadata) throws JsonProcessingException, IOException 
        {
                boolean ret;
                ObjectMapper mapper = new ObjectMapper();
		JsonNode so_data;
		so_data = mapper.readTree(SO_Metadata);
                //System.out.println("SO: " + so_data);
                JsonNode provCollection = so_data.findValue("data_provenance_collection");
                ret = provCollection.asBoolean();
                //System.out.println("Ret: " + provCollection.asText());
                return ret;
        }



/** 
 * Checks if the provenance collection is active and executes the code
 *
 * @param Code full computation string (including variable declarations) 
 * @param Security-Meta-data of the current SO
 * @return List of Provelements (containing the data gathered during runtime and the actual result)
 */
	public static List<Provelement> executeSOcode(String code, String SO_Metadata)
	{
                // Check if the provenanec collection is on
                boolean profOn;
                try{
                profOn = provenanceCollection(SO_Metadata);
                }catch (Exception e){return null;}
	        List<Provelement> provList = null;
                if (profOn == true) 
                {      
                        // Execute with provenance collection on
		        Provenance.init();
		        try
		        {
			        Context cx = Context.enter();

			        Scriptable scope = cx.initStandardObjects();
			        Object apiResult = (Object) cx.evaluateString(scope, code, "<COMPOSE>", 1, null);
			        provList = (List<Provelement>) apiResult;
		        }
		        finally
		        {
			        Context.exit();
		        }
		        return provList;
                }
                else
                {
                        // Execute with NO provenance collection
                        try{
                                javax.script.ScriptEngineManager manager = new javax.script.ScriptEngineManager();
                                javax.script.ScriptEngine engine = manager.getEngineByName("js");
                                Object result = engine.eval(code);
                                // Generate return value with the result of the computation
                                provList = new LinkedList<Provelement>();
                                List<String> tempList = new LinkedList<String>();
			        tempList.add(result.toString());
			        Provelement temp = new Provelement("return", tempList);
			        provList.add(temp);
                        } catch (javax.script.ScriptException e){return null;}
		        return provList;    
                }
	}


/** 
 * Checks if the provenance collection is active and executes the code
 *
 * @param Code full computation string (including variable declarations) 
 * @param Security-Meta-data of the current SO
 * @return List of Provelements (containing the data gathered during runtime and the actual result)
 */
	public static List<Provelement> executeSOcode(String code, List<Provelement> oldElements, String SO_Metadata)
	{
                // Check if the provenance collection is on
                boolean profOn;                
                try{
                profOn = provenanceCollection(SO_Metadata);
                }catch (Exception e){return null;}
                List<Provelement> returnList = new LinkedList<Provelement>();
                if (profOn == true) 
                {       
                        // Execute with proveannce collection on
		        // Adds all alt provenance entries and removes the old result value
		        for (Provelement tempElement : oldElements)
		        {
			        if (!(tempElement.writeVar.equals("return")))
			        {
				        returnList.add(tempElement);
			        }
		        }
		        // Calles the executeWithProv(String code) function
		        returnList.addAll(executeWithProv(code));
                }
                else {
                        // Execute with NO provenance collection
                        try{
                                javax.script.ScriptEngineManager manager = new javax.script.ScriptEngineManager();
                                javax.script.ScriptEngine engine = manager.getEngineByName("js");
                                Object result = engine.eval(code);
                                // Generate return value with the result of the computation
                                List<String> tempList = new LinkedList<String>();
			        tempList.add(result.toString());
			        Provelement temp = new Provelement("return", tempList);
			        returnList.add(temp);
                        } catch (javax.script.ScriptException e){return null;}

                }
		return returnList;
	}




}


