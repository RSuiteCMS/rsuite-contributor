package com.reallysi.contributor.config;

import java.util.HashMap;
import java.util.Map;

import com.reallysi.rsuite.api.remoteapi.serialization.annotations.NoType;

@NoType
public class ActionConfig {
	public String label = null;
	public String name = null;
	public String rule = null;
	public String icon = null;
	public final Map<String, String> properties = new HashMap<String, String>();
}
