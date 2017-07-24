package com.reallysi.contributor.config;

import java.util.ArrayList;
import java.util.List;

import com.reallysi.rsuite.api.remoteapi.serialization.annotations.NoType;

@NoType
public class WorkflowResultsConfig {
	public final List<Column> columns = new ArrayList<Column>();
}
