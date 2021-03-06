/* -*- Mode: java; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.javascript;

import java.util.*;

/**
 * This instance of this class represents a piece of provenance information (the provenance information of one executed command)
 *
 */
public class Provelement {

	public enum Operation {ACCESSED, CONDTION, HASH }
		public String writeVar;	// Var name of the written variable for example x in "x = b"
		public List<String> readVars; // List of variables read b in "x = b"
		public Boolean condition; 	// True if the variable is used in a conditon like "if a >2"
		public Operation operation;
		public String activity;


	Provelement(String write, List<String> reads)
	{
		writeVar = write;
		readVars = reads;
		activity = "";
		
	}
	Provelement(String write, List<String> reads, String currentAcctivity)
	{
		writeVar = write;
		readVars = reads;
		activity = currentAcctivity;
	}
}
