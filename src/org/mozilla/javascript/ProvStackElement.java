/* -*- Mode: java; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.javascript;

import java.util.*;


/**
 * This a inistance of the class represents one stack element on the provenance stack. 
 *
 */
	public class ProvStackElement {

		public enum StackType {VAR, FUNC} // Var = variable; func = function
		public String value;	// Used for functions
		public StackType type;
		public HashSet<String> values; // Used for variables


	ProvStackElement(String currentValue, StackType currentType)
	{
		value = currentValue;
		type = currentType;
		values = new HashSet<String>();
	}

	ProvStackElement(HashSet<String> currentValues, StackType currentType)
	{
		value = "";
		type = currentType;
		values = currentValues;
	}
}
