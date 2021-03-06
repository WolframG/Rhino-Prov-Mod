package org.mozilla.javascript.demo;	

	import java.util.HashMap;
	import java.util.LinkedList;
	import java.util.List;
	import java.util.Map;
	import com.jayway.jsonpath.Criteria;
	import com.jayway.jsonpath.Filter;
	import com.jayway.jsonpath.JsonPath;
import java.nio.charset.Charset;


	import org.mozilla.javascript.Provelement;
	import org.mozilla.javascript.ProvenanceAPI;
	import java.io.File;
	import java.io.IOException;

	public class PerformanceTest {
		
		
	public static void main(String[] args) {
		// Load Test file
		/*Charset charset = Charset.forName("US-ASCII");
		try {
		BufferedReader reader = Files.newBufferedReader(args[0], charset);
		    String line = null;
		    while ((line = reader.readLine()) != null) {
			System.out.println(line);
		    }
		} catch (IOException x) {
		    System.err.format("IOException: %s%n", x);
		}
		// Extrect variables and the three computations (build three maps)

		// Generate fake SU provenance 

		// Build input	
		boolean bPath = false;	
		File f = new File(args[0]);
		try {
		f.getCanonicalPath();
		bPath =  true;
		}
		catch (IOException e) {
		bPath =  false;
		}
		System.out.println("This is a valide path: " + bPath);
		if (1 == 1) return;



		// Build input 
			// Map: Variables (name) and there value; value come normally from the input SUs
			HashMap<String, String> inputVar = new HashMap<String, String>();
			inputVar.put("a", "\"420\"");
			inputVar.put("b", "1");
			inputVar.put("c", "\"test\"");
			//inputVar.put(ProvenanceAPI.COMPUTATION, "b = 3; a; a = b + 9; a == b ? c + b : c + a");
			inputVar.put(ProvenanceAPI.COMPUTATION, "function test(z){var x = 10; return x + Math.sqrt(z);} a = test(c);if(a == \"420\"){var b = 5;}b");
			
			// Map: Variables and the JSON of the SU where the corresponding current-value and provenance data is
			Map<String, String> mapVarSU = new HashMap<String, String>();
			mapVarSU.put("a", "{\"provenance\" : {\"prov\" : \" of a...\"} }"); 
			mapVarSU.put("b", "{\"provenance\" : {\"prov\" : \" of b...\"} }"); 
			mapVarSU.put("c", "{\"provenance\" : {\"prov\" : \" of c...\"} }"); 
			
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
			System.out.println("The provenance information for the new SU:\n" + ProvenanceAPI.buildProvenanceJSON("", provList, mapVarSU));
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
			System.out.println();*/
	
		}

/** Obsolete 
 * 
 * @param SU to the SU file 
 * @return String that contains the provenance information 
 */
	public static String getJSONValue(String su) 
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

		return returnString;
	}

	}




