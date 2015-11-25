/* -*- Mode: java; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.javascript;

import java.util.*;

/**
 * This class implements the basic functionality to gather provenance inforamtion during runtime
 *
 */
public  class Provenance {
        static ThreadLocal provEntries = new ThreadLocal<List<Provelement>>();
	//static List<Provelement> provEntries = new ArrayList<Provelement>();
        static ThreadLocal funcStack = new ThreadLocal<Stack<ProvStackElement>>();
	//static Stack<ProvStackElement> funcStack = new Stack<ProvStackElement>();
        static ThreadLocal varNames = new ThreadLocal<HashSet<String>>();
	//static Set<String> varNames = new HashSet<String>(); // Names of all variables that should be tracked



        /**
         * Adds an Provenance ellement to the List (provEntries) which represents the used variables for one statement
         *
         * @param write name of the written variable ("" if no variable is written)
         * @param reads list of the names of all read variable
         */
	public static void addProv(String write, List<String> reads)
	{
		Provelement temp = new Provelement(write, reads);

                ArrayList<Provelement> tempProvList = (ArrayList<Provelement>)provEntries.get();
                tempProvList.add(temp);
                provEntries.set(tempProvList);
		///provEntries.add(temp);

	}


	public static void init()
	{
		provEntries.set(new ArrayList<Provelement>());
		funcStack.set(new Stack<ProvStackElement>());
		varNames.set(new HashSet<String>());
	}

        /**
         * Adds a variable name to the list of variables which are monitored
         *
         * @param name Name of the variable
         */
	public static void addVarName(String name)
	{
                HashSet<String> tempVarNames = (HashSet<String>)varNames.get();
                tempVarNames.add(name);
                varNames.set(tempVarNames);
                ///varNames.add(name);
	}


	/**
	 * Adds the result of the computation to the List of provelements
	 *
	 * @param result The result value of the computation
	 */
	public static void addResult(Object result)
	{
		if (result != null)
		{
			List<String> tempList = new LinkedList<String>();
			tempList.add(result.toString());
			Provelement temp = new Provelement("return", tempList);
                        ArrayList<Provelement> tempProvList = (ArrayList<Provelement>)provEntries.get();
                        tempProvList.add(temp);
                        provEntries.set(tempProvList);
                        ///provEntries.add(temp);
		}
	}


	/**
	 * Adds a read operation for a variable to the stack of operations to genrate the provenance information
	 *
	 * @param read Name of the variable that is read
	 */
	public static void addRead(String read)
	{
		/*if (funcStack.empty() == true)
		{
			List<String> tempList = new LinkedList<String>();
			tempList.add(read);
			Provelement temp = new Provelement("", tempList);
			provEntries.add(temp);
		}
		else
		{
			funcStack.push(new ProvStackElement(read, ProvStackElement.StackType.VAR));
		}*/
		HashSet<String> tempHash = new HashSet<String>();
		tempHash.add(read);
                Stack<ProvStackElement> tempFuncStack = (Stack<ProvStackElement>)funcStack.get();
                tempFuncStack.push(new ProvStackElement(tempHash, ProvStackElement.StackType.VAR));
                funcStack.set(tempFuncStack);
		//funcStack.push(new ProvStackElement(tempHash, ProvStackElement.StackType.VAR));
	}


	/**
	 * Returns the list of provelements
	 *
	 * @return The complete provenance information (list of provelements)
	 */
	public static List<Provelement> getReturnValue()
	{
		return (ArrayList<Provelement>)provEntries.get();
	}


	public static void addBeginFunction(String idCall)
	{
                Stack<ProvStackElement> tempFuncStack = (Stack<ProvStackElement>)funcStack.get();
                tempFuncStack.push(new ProvStackElement(idCall, ProvStackElement.StackType.FUNC));
                funcStack.set(tempFuncStack);
		///funcStack.push(new ProvStackElement(idCall, ProvStackElement.StackType.FUNC));
	}

	public static void addEndFunctionOld(String idCall, String name)
	{
                Stack<ProvStackElement> tempFuncStack = (Stack<ProvStackElement>)funcStack.get();
		String activity = "";
		List<ProvStackElement> tempElements = new LinkedList<ProvStackElement>();
		while (tempFuncStack.empty() == false)
		{
			ProvStackElement lastElement = tempFuncStack.pop();
			if (lastElement.type == ProvStackElement.StackType.VAR)
			{
				// Store them in a list to output them and to add them again if the list is not empty for nested functions
				tempElements.add(lastElement);
			}
			else if(ProvStackElement.StackType.FUNC == lastElement.type && lastElement.value.equals(idCall) == true)
			{
				activity = name;
				break;
			}
		}
		if (!(activity.equals("") && tempElements.isEmpty())) // avoids empty provenance entries
		{
			List<String> tempList = new LinkedList<String>();
			for(ProvStackElement tempElement : tempElements)
			{
				tempList.add(tempElement.value);
				if (tempFuncStack.empty() == false)
				{
					tempFuncStack.push(tempElement);
				}
			}
			Provelement temp = new Provelement("", tempList, activity);
                        ArrayList<Provelement> tempProvList = (ArrayList<Provelement>)provEntries.get();
                        tempProvList.add(temp);
                        provEntries.set(tempProvList);
                        ///provEntries.add(temp);
		}
                funcStack.set(tempFuncStack);
	}

	public static void addEndInfixFunction(String name)
	{
                Stack<ProvStackElement> tempFuncStack = (Stack<ProvStackElement>)funcStack.get();
		List<ProvStackElement> tempElements = new LinkedList<ProvStackElement>();
		// Get last two variables
		while((tempElements.size() < 2) && (tempFuncStack.empty() == false))
		{
			ProvStackElement lastElement = tempFuncStack.pop();
			if (ProvStackElement.StackType.VAR == lastElement.type)
			{
				tempElements.add(lastElement);
			}
		}
		// Build list with all consumed variables
		HashSet<String> tempHash = new HashSet<String>();
		for(ProvStackElement tempElement : tempElements)
		{
			for(String tempString : tempElement.values)
			{
				tempHash.add(tempString);
			}
		}
		// Add compined variable to the funcStack
		tempFuncStack.push(new ProvStackElement(tempHash, ProvStackElement.StackType.VAR));
		// Generate Provelement
		LinkedList<String> tempList = new LinkedList<String>();
		tempList.addAll(tempHash);
		Provelement temp = new Provelement("", tempList, "\"" + name + "\"");
		ArrayList<Provelement> tempProvList = (ArrayList<Provelement>)provEntries.get();
                tempProvList.add(temp);
                provEntries.set(tempProvList);
                ///provEntries.add(temp);
                funcStack.set(tempFuncStack);
	}

	public static void addEndFunction(String idCall, String name)
	{
                Stack<ProvStackElement> tempFuncStack = (Stack<ProvStackElement>)funcStack.get();
		String activity = "";
		List<ProvStackElement> tempElements = new LinkedList<ProvStackElement>();
		// Get all parameters for the function call
		while (tempFuncStack.empty() == false)
		{
			ProvStackElement lastElement = tempFuncStack.pop();
			if (lastElement.type == ProvStackElement.StackType.VAR)
			{
				// Store them in a list to output them and to add them again
				tempElements.add(lastElement);
			}
			else if(ProvStackElement.StackType.FUNC == lastElement.type && lastElement.value.equals(idCall) == true)
			{
				activity = "\"" + name + "\"";
				break;
			}
		}
		// Build list with all consumed variables
		HashSet<String> tempHash = new HashSet<String>();
		for(ProvStackElement tempElement : tempElements)
		{
			for(String tempString : tempElement.values)
			{
				tempHash.add(tempString);
			}
		}
		// Add consumed variables to the stack again
		tempFuncStack.push(new ProvStackElement(tempHash, ProvStackElement.StackType.VAR));
		// Add provelement if function beginning was found
		if (activity.equals("") == false) // avoids empty provenance entries
		{
			LinkedList<String> tempList = new LinkedList<String>();
			tempList.addAll(tempHash);
			Provelement temp = new Provelement("", tempList, activity);
                        ArrayList<Provelement> tempProvList = (ArrayList<Provelement>)provEntries.get();
                        tempProvList.add(temp);
                        provEntries.set(tempProvList);
                        ///provEntries.add(temp);
		}
                funcStack.set(tempFuncStack);
	}

	public static void endProgram()
	{
                Stack<ProvStackElement> tempFuncStack = (Stack<ProvStackElement>)funcStack.get();
		//Add remaining reads from the funcStack
		LinkedList<String> tempList = new LinkedList<String>();
		while (tempFuncStack.empty() == false)
		{
			ProvStackElement lastElement = tempFuncStack.pop();
			if (lastElement.type == ProvStackElement.StackType.VAR)
			{
				// Store them in a list to output them and to add them again
				tempList.addAll(lastElement.values);
			}
		}

		Provelement temp = new Provelement("", tempList, "");
                ArrayList<Provelement> tempProvList = (ArrayList<Provelement>)provEntries.get();
                tempProvList.add(temp);
                provEntries.set(tempProvList);
                ///provEntries.add(temp);
                funcStack.set(tempFuncStack);

	}


}
