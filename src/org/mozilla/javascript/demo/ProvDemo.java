package org.mozilla.javascript.demo;	

	import java.util.HashMap;
	import java.util.List;
	import java.util.Map;

	import org.mozilla.javascript.Provelement;
	import org.mozilla.javascript.ProvenanceAPI;
	import org.mozilla.javascript.ProvenanceRefAPI;

	public class ProvDemo {
		
		
	public static void main(String[] args) {
		// Build input 
			// Map: Variables (name) and there value; value come normally from the input SUs
			HashMap<String, String> inputVar = new HashMap<String, String>();
			inputVar.put("a", "\"420\"");
			inputVar.put("b", "1");
			inputVar.put("c", "\"test\"");
			//inputVar.put(ProvenanceAPI.COMPUTATION, "b = 3; a; a = b + 9; a == b ? c + b : c + a");
			inputVar.put(ProvenanceAPI.COMPUTATION, "function test(z){var x = 10; return x + Math.sqrt(z);} a = test(c); for(var i = 0; i<10;i++){a = Math.sqrt(i);}if(a == \"420\"){var b = 5;}b");
			
			// Map: Variables and the JSON of the SU where the corresponding current-value and provenance data is
			Map<String, String> mapVarSU = new HashMap<String, String>();
			mapVarSU.put("a", "{\"provenance\" : {\"entity\" : \"SU-A-ID\", \"source\" : [\"xx-a\"]} }"); 
			mapVarSU.put("b", "{\"provenance\" : {\"entity\" : \"SU-B-ID\", \"source\" : [\"xx-b\"]} }"); 
			mapVarSU.put("c", "{\"provenance\" : {\"entity\" : \"SU-C-ID\", \"source\" : [\"xx-c\"]} }"); 


			// Map: Variables and the JSON of the SU where the corresponding current-value and provenance data is
			Map<String, String> mapVarSU2 = new HashMap<String, String>();
			mapVarSU2.put("a", "SU-A-ID"); 
			mapVarSU2.put("b", "SU-B-ID"); 
			mapVarSU2.put("c", "SU-C-ID");
			
			// Build complete computation String
			String fullComputationString = ProvenanceAPI.buildString(inputVar);
			System.out.println("Computation String: " + fullComputationString);
		// Execute String with the modified Rhino version 
			List<Provelement> provList = (List<Provelement>)ProvenanceAPI.executeWithProv(fullComputationString);
		// Get the result value of the computation
			System.out.println("The result is: " + ProvenanceAPI.getResultValue(provList));
		// Print gathered data (only for illustration purposes)
			printProvList(provList);
		// Get provenance information in JSON format
			System.out.println("There are: " + provList.size() + " provenance elements gathered");
			System.out.println("The provenance information for the new SU:\n" + ProvenanceAPI.buildProvenanceJSON("", provList, mapVarSU));
			System.out.println("The provenance information for the new SU:\n" + ProvenanceAPI.buildProvenanceJSONNoTree("", provList, mapVarSU));
			System.out.println("The provenance information for the new SU:\n" + ProvenanceRefAPI.buildProvenanceJSON("", provList, mapVarSU, "Resulting-SU-ID"));
			System.out.println("The provenance information for the new SU:\n" + ProvenanceRefAPI.buildProvenanceJSONNoTree("", provList, mapVarSU, "Resulting-SU-ID"));
		}

	
		private static void printProvList(List<Provelement> provList) {
			System.out.println("Provenance information gathered during runtime:");
			for(Provelement element : provList)
			{
				if (element.writeVar.equals("return"))
				{
					System.out.print("   Return value: ");
					for (String read: element.readVars)
					{
						System.out.println(read);				
					}
				}
				else {
					System.out.print("   Write: " + element.writeVar + " Reads:");

					//System.out.print("Reads:");
					for (String read: element.readVars)
					{
						System.out.print(" " + read);				
					}
					System.out.print(" Activity: " + element.activity);
					System.out.println();
				}
			}
			System.out.println();
	
		}

	}
