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
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
//import org.apache.commons.lang3.StringEscapeUtils;


/**
* This class implements the interface to the data management layer
*
*/
public class ProvenanceAPI
{
	static String[] PROVENANCE_ENTRIY = {"\"agent\"", "\"type\"", "\"entity\"", "\"activity\"", "\"timestamp\"", "\"accessed\"", "\"onbehalf-of\"", "\"so-stream\"", "\"source\""};
	public static final String COMPUTATION = "res";
	static ThreadLocal pdp = new ThreadLocal<PolicyMerge>();



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
	* Returns the owner
	*
	* @param securityMetaData  Identity Management data for SO (JSON)
	* @return String containing the owner
	*/
	private static String getOwner(String SecturityMetaData)
	{
		String returnString = "";
		try{
			ObjectMapper mapper = new ObjectMapper();
			JsonNode data;
			data = mapper.readTree(SecturityMetaData);
			JsonNode ownerCollection = data.findValue("owner_id");
			returnString = ownerCollection.toString();
		}catch(Exception e){}
			return returnString;
		}



		/**
		* Returns the id
		*
		* @param securityMetaData  Identity Management data for SO (JSON)
		* @return String containing the id
		*/
		private static String getId(String SecturityMetaData)
		{
			String returnString = "";
			try{
				ObjectMapper mapper = new ObjectMapper();
				JsonNode data;
				data = mapper.readTree(SecturityMetaData);
				JsonNode idCollection = data.findValue("id");
				returnString = idCollection.toString();
			}catch(Exception e){}
				return returnString;
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
				return buildProvenanceJSON(securityMetaData, provList, VarName_SuPath, "");
			}


			/**
			* Returns the provenance information in JSON -- Tree No References --
			*
			* @param securityMetaData  Identity Management data for SO (JSON)
			* @param provList	 Contains all information gahtered during runtime
			* @param VarName_SuPath	 Maping between variable names and SU
			* @param stream Stream of SO that triggers the new SU
			* @return String containing the provenance data for the new SU
			*/
			public static String buildProvenanceJSON(String securityMetaData, List<Provelement> provList, Map<String, String> VarName_SuPath, String stream)
			{
				ObjectMapper mapper = new ObjectMapper();
				ArrayNode policyJSONs = new ArrayNode(mapper.getNodeFactory());
				ObjectMapper mapper2 = new ObjectMapper();
				ArrayNode sourceJSONs = new ArrayNode(mapper2.getNodeFactory());
				// Generate time stamp
				Date date= new Date();
				long time = date.getTime();
				// Get SO_owner
				String so_owner = getOwner(securityMetaData);
				String so_id = getId(securityMetaData);


				// Check the flag if provenance collection is on
				boolean profOn;
				try{
					profOn = provenanceCollection(securityMetaData);
				}catch(Exception e){profOn = true;}

				// Generate JSON data
				String policy = "\"policy\":"; // filed later with the policies of the input SUs
				String payment = "\"payment\": false";
				String su_owener = "\"owner_id\":" + so_owner;
				// Agent
				String agent = PROVENANCE_ENTRIY[0] + " : \"SO\",\n";
				// Type
				String type = PROVENANCE_ENTRIY[1] + " : \"sensor_update\",\n";
				// Entity
				String entity = PROVENANCE_ENTRIY[2] + " : " + so_id + " ,\n";
				// Activity
				String activity = PROVENANCE_ENTRIY[3] + " : " + buildActivityString(provList) + ",\n"; //" : derived_from,\n";
				// Timestamp
				String timestamp = PROVENANCE_ENTRIY[4] + " : " + time + ",\n";
				// Accessed
				String accessed = PROVENANCE_ENTRIY[5] + " :  [],\n";
				// Onbehalf_of
				String onbehalf = PROVENANCE_ENTRIY[6] + " : " + ""+ so_owner + "" + ",\n";
				// Stream
				String so_stream = PROVENANCE_ENTRIY[7] + ":" + "\"" + stream + "\"" + ",\n";
				// Source
				String source = PROVENANCE_ENTRIY[8] + " : \n";

				if (profOn == true){

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
				//String tempString = "";
				JsonNode currentPolicy = getSourcePolicyJSON(tempR);
				//JsonNode currentSource = getSourceProvenanceJSON(tempR);      //tree
				ArrayNode currentSource = getSourceArrayProvenanceJSON(tempR,so_id, time);        // flat tree




				//tempString = addSourceJSON(tempR);   // Gets provenance of the input SU
				if (currentSource != null) //tempString.equals("") == false)
				{
					//if (usedSU.size()> 1) {
					//	tempString = "," +  tempString;}
					//	source += tempString;
					sourceJSONs.addAll(currentSource);
				}
				if (currentPolicy != null)
				{
					policyJSONs.add(currentPolicy);
				}
				usedSU.add(tempR);
			}
		}
	}
}
else { // Provenance flag false
	// Add policies of SUs
	String tempR = "";
	for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
	{
		tempR = entry.getValue();
		JsonNode currentPolicy = getSourcePolicyJSON(tempR);
		if (currentPolicy != null)
		{
			policyJSONs.add(currentPolicy);
		}
	}
}
// Add SO policy to the policies for the new SU
JsonNode soPolicy = getSourcePolicyJSON(securityMetaData);
if (soPolicy != null) {
	/*ArrayNode tempSOPolicy = (ArrayNode) soPolicy;
	Iterator<JsonNode> polIter = tempSOPolicy.elements();
	JsonNode tempNode = null;
	while (polIter.hasNext()){
		tempNode = polIter.next();
		policyJSONs.add(tempNode);
	}*/
	PolicyMerge pdpTemp = (PolicyMerge)pdp.get();
	if (pdpTemp == null){
		pdpTemp = new PolicyMerge();
		pdp.set(pdpTemp);
	}
	JsonNode tempSoNode = pdpTemp.PolicyGetBestMatch(soPolicy, stream, so_id);
	if (tempSoNode != null){
		policyJSONs.add(tempSoNode);
	}

}


/*    // String converstion of source
String tempSources = sourceJSONs.toString();
tempSources = tempSources.replace("\\", "");
tempSources = tempSources.replace("\"", "\\\"");
source += "\"" + tempSources + "\"\n";*/
/*String tempSources = sourceJSONs.toString();
tempSources = StringEscapeUtils.unescapeEcmaScript(tempSources);
String results = StringEscapeUtils.escapeEcmaScript(tempSources);
source += "\"" +results + "\"";*/

// Add all sources
source += sourceJSONs;


System.out.println("IIII Merge in: " + policyJSONs);
policy += dummyMergeNew(policyJSONs); //soPolicy;
System.out.println("OOOO Merge out: " + policy);
String ret  = "";
if (profOn == true){


	ret = "{" + su_owener + ","+ policy + "," + payment + "," + "\"provenance\" : {" + agent + type + entity + activity + timestamp + accessed + onbehalf + so_stream + source + "}}";
}
else
{
	ret = "{" + policy + "," + payment + "," + su_owener + "}";
}

return ret;
}


/*
* Simple dummy merge works only with public and private policy
*
*/
private static String dummyMergeNew(ArrayNode policyJSONs){
	String tempPol = null;

	// Get and init pdp if required
	PolicyMerge pdpTemp = (PolicyMerge)pdp.get();
	if (pdpTemp == null){
		pdpTemp = new PolicyMerge();
		pdp.set(pdpTemp);
	}

	tempPol = pdpTemp.PolicyMerge(policyJSONs);
	/*// Goes through all flows and checks if it is private or public
	Iterator<JsonNode> polIter = policyJSONs.elements();
	while (polIter.hasNext()){
		tempNode = polIter.next();
		System.out.println("Merging: " + tempNode);
		if (isPrivate(tempNode) == true){
			System.out.println("This is private (found in merge): " + tempNode);
			break;
		}
	}*/
	/*// Only the flows should be returned
	if (tempNode == null){
		System.out.println("XXX null");
		return null;
	}
	if (tempNode.findValue("flows") != null)
	{
		System.out.println("XXX: " + tempNode.findValue("flows").toString());
		return tempNode.findValue("flows").toString();
	} else {
		System.out.println("XXX2: " + tempNode.toString());
		return tempNode.toString();
	}*/
	System.out.println("XXX2: " + tempPol);
	return tempPol;
}


/*
* Checks if this is the private policy
*
*/
private static boolean isPrivate(JsonNode currentNode){
	// Get target and source
	List<JsonNode> target = currentNode.findValues("target");
	List<JsonNode> source = currentNode.findValues("source");

	// Check if lists have right size
	System.out.println("Size: " + target.size() + " " + source.size()) ;
	if (target.size() == 2 && source.size() == 2)
	{
		return true;
	}
	return false;
}




/**
*
* @param SU in JSON format
* @return JsonNode that contains the provenance information
*/
public static JsonNode getSourceProvenanceJSON(String su)
{
	String returnString = "";
	JsonNode provCollection = null;
	try{
		ObjectMapper mapper = new ObjectMapper();
		JsonNode data;
		data = mapper.readTree(su);
		provCollection = data.findValue("provenance");
	}catch(Exception e){}
		return provCollection;
	}


	/**
	*
	* @param SU in JSON format
	* @return ArrayNode that contains a list of provenance sources
	*/
	public static ArrayNode getSourceArrayProvenanceJSON(String su, String so_entity, long so_timestamp)
	{
		String returnString = "";
		ObjectMapper mapperRet = new ObjectMapper();
		ArrayNode ret = new ArrayNode(mapperRet.getNodeFactory());
		JsonNode provCollection = null;
		JsonNode provCollectionSource = null;
		try{
			// Parse SU string to JsonNode
			ObjectMapper mapper = new ObjectMapper();
			JsonNode data;
			data = mapper.readTree(su);
			// Get provenance
			provCollection = data.findValue("provenance");

			/*
			// Get ID of this SU
			JsonNode currentSuId = provCollection.findValue("entity");
			// Get time of this SU
			JsonNode currentSuTime = provCollection.findValue("timestamp");
			*/


			// Ger sources of the this SU
			provCollectionSource = provCollection.findValue("source"); //findValues
			if (provCollectionSource.isArray() == true){
				for ( Iterator<JsonNode> iterator = provCollectionSource.iterator(); iterator.hasNext(); ){
					//ObjectMapper mapperTemp = new ObjectMapper();
					//ArrayNode tempSource = new ObjectNode(mapperRet.getNodeFactory());

					JsonNode tempSource = iterator.next();
					//((ObjectNode) tempSource).put("parent_entity", currentSuId);
					//((ObjectNode) tempSource).put("parent_time", currentSuTime);
					// Add depth level?
					ret.add((JsonNode)tempSource);
				}
			}
			// Get data of current SU (remove source, add parent filds)
			((ObjectNode) provCollection).put("parent_entity", so_entity);
			((ObjectNode) provCollection).put("parent_time", so_timestamp);
			((ObjectNode) provCollection).remove("source");
			ret.add((JsonNode)provCollection);

		}catch(Exception e){System.out.println("Error: " + e);}
		return ret;
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
		*
		* @param SU in JSON format
		* @return JsonNode that contains the provenance information
		*/
		public static JsonNode getSourcePolicyJSON(String su)
		{
			String returnString = "";
			JsonNode provCollection = null;
			try{
				ObjectMapper mapper = new ObjectMapper();
				JsonNode data;
				data = mapper.readTree(su);
				provCollection = data.findValue("policy");
			}catch(Exception e){return null;}
			return provCollection;
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


			// -----------------
			/*String tempSources = returnString.toString();
			tempSources = StringEscapeUtils.unescapeEcmaScript(tempSources);
			String results = StringEscapeUtils.escapeEcmaScript(tempSources);
			returnString = "\"" +results    + "\"";*/

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
		public static String buildProvenanceJSONNoTree(String securityMetaData, List<Provelement> provList, Map<String, String> VarName_SuPath, String stream)
		{
			ObjectMapper mapper = new ObjectMapper();
			ArrayNode policyJSONs = new ArrayNode(mapper.getNodeFactory());
			ObjectMapper mapper2 = new ObjectMapper();
			ArrayNode sourceJSONs = new ArrayNode(mapper2.getNodeFactory());
			// Generate time stamp
			Date date= new Date();
			long time = date.getTime();
			// Get SO_owner
			String so_owner = getOwner(securityMetaData);
			String so_id = getId(securityMetaData);


			// Check the flag if provenance collection is on
			boolean profOn;
			try{
				profOn = provenanceCollection(securityMetaData);
			}catch(Exception e){profOn = true;}

			// Generate JSON data
			String policy = "\"policy\":"; // filed later with the policies of the input SUs
			String payment = "\"payment\": false";
			String su_owener = "\"owner_id\":" + so_owner;
			// Agent
			String agent = PROVENANCE_ENTRIY[0] + " : \"SO\",\n";
			// Type
			String type = PROVENANCE_ENTRIY[1] + " : \"sensor_update\",\n";
			// Entity
			String entity = PROVENANCE_ENTRIY[2] + " : " + so_id + " ,\n";
			// Activity
			String activity = PROVENANCE_ENTRIY[3] + " : " + buildActivityString(provList) + ",\n"; //" : derived_from,\n";
			// Timestamp
			String timestamp = PROVENANCE_ENTRIY[4] + " : " + time + ",\n";
			// Accessed
			String accessed = PROVENANCE_ENTRIY[5] + " :  [],\n";
			// Onbehalf_of
			String onbehalf = PROVENANCE_ENTRIY[6] + " : " + ""+ so_owner + "" + ",\n";
			// Stream
			String so_stream = PROVENANCE_ENTRIY[7] + ":" + "\"" + stream + "\"" + ",\n";
			// Source
			String source = PROVENANCE_ENTRIY[8] + " : [\n";

			//Find out which provenance data has to be copied into the new SU
			if (profOn == true){
				Set<String> usedSU = new TreeSet<String>();
				for(Provelement currentVars : provList)
				{
					for(String read : currentVars.readVars)
					{
						String tempR = "";
						for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
						{
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
							tempString = addSourceTreeRef(tempR); //addSourceNoSourceRef addSourceNoProf addSourceTreeRef
							if (tempString.equals("") == false)
							{
								if (usedSU.size()> 0) {
									tempString = "," +  tempString;}
									source += tempString;
								}
								//Get Policy
								JsonNode currentPolicy = getSourcePolicyJSON(tempR);
								if (currentPolicy != null)
								{
									policyJSONs.add(currentPolicy);
								}
								usedSU.add(tempR);
							}
						}
					}
					source += "]\n";
				}
				else { // Provenance flag false
					// Add policies of SUs
					String tempR = "";
					for (Map.Entry<String, String> entry : VarName_SuPath.entrySet())
					{
						tempR = entry.getValue();
						JsonNode currentPolicy = getSourcePolicyJSON(tempR);
						if (currentPolicy != null)
						{
							policyJSONs.add(currentPolicy);
						}
					}
				}
				// Add SO policy to the policies for the new SU
				JsonNode soPolicy = getSourcePolicyJSON(securityMetaData);
				if (soPolicy != null) {
					policyJSONs.add(soPolicy);
				}



				//return "{\"provenance\" : {" + agent + type + entity + activity + timestamp + accessed + onbehalf + so_stream + source + "}}";
				policy += policyJSONs;
				String ret  = "";
				if (profOn == true){


					ret = "{" + su_owener + ","+ policy + "," + payment + "," + "\"provenance\" : {" + agent + type + entity + activity + timestamp + accessed + onbehalf + so_stream + source + "}}";
				}
				else
				{
					ret = "{" + policy + "," + payment + "," + su_owener + "}";
				}

				return ret;
			}




			/**
			* For representation with only on layer of provenance information (no tree)
			*
			* @param SU in JSON format
			* @return String that contains the provenance information
			*/
			public static String addSourceNoProf(String su)
			{
				String ret = "";
				JsonNode provCollection = null;
				try{
					// Parse SU string to JsonNode
					ObjectMapper mapper = new ObjectMapper();
					JsonNode data;
					data = mapper.readTree(su);
					// Get provenance
					provCollection = data.findValue("provenance");

					// Get data of current SU (remove source, add parent filds)
					((ObjectNode) provCollection).remove("source");
					ret = provCollection.toString();

				}catch(Exception e){System.out.println("Error: " + e);}
				return ret;
			}


			//----------------------------------------- Build provenace JSON with references -----------------------------------------

			/**
			* For representation with only on layer of provenance information with references (no tree)
			*
			* @param SU in JSON format
			* @return String that contains the provenance information (reference + no tree)
			*/
			public static String addSourceNoSourceRef(String su)
			{
				JsonNode provCollection = null;
				JsonNode provEntity = null;
				JsonNode provTimeStamp = null;
				try{
					// Parse SU string to JsonNode
					ObjectMapper mapper = new ObjectMapper();
					JsonNode data;
					data = mapper.readTree(su);
					// Get provenance
					provCollection = data.findValue("provenance");
					// Get entity
					provEntity = provCollection.get("entity");
					provTimeStamp = provCollection.get("timestamp");

					//ret = provCollection.toString();

				}catch(Exception e){System.out.println("Error: " + e);}
				if (provEntity != null && provTimeStamp != null){
					return "{\"entity\":"+provEntity.toString() + ",\"timestamp\":" + provTimeStamp.toString() + "}";
				} else {
					return "";
				}
			}


			/**
			* For representation with only on layer of provenance information with references (no tree)
			*
			* @param SU in JSON format
			* @return String that contains the provenance information (reference + no tree)
			*/
			public static String addSourceTreeRef(String su)
			{
				JsonNode provCollection = null;
				JsonNode provEntity = null;
				JsonNode provTimeStamp = null;
				JsonNode provSource = null;
				try{
					// Parse SU string to JsonNode
					ObjectMapper mapper = new ObjectMapper();
					JsonNode data;
					data = mapper.readTree(su);
					// Get provenance
					provCollection = data.findValue("provenance");
					// Get entity
					provEntity = provCollection.get("entity");
					provTimeStamp = provCollection.get("timestamp");
					provSource = provCollection.get("source");


					//ret = provCollection.toString();

				}catch(Exception e){System.out.println("Error: " + e);}
				if (provEntity != null && provTimeStamp != null){
					return "{\"entity\":"+provEntity.toString() + ",\"timestamp\":" + provTimeStamp.toString() + ",\"source\":" + provSource.toString() + "}";
				} else {
					return "";
				}
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
