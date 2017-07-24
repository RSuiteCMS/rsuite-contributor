package com.reallysi.contributor;

import java.io.File;
import java.io.FileInputStream;
import java.net.URL;

import com.reallysi.contributor.config.ContributorConfig;
import com.reallysi.rsuite.api.RSuiteException;
import com.reallysi.rsuite.api.extensions.Plugin;
import com.reallysi.rsuite.api.extensions.PluginAware;
import com.reallysi.rsuite.api.remoteapi.CallArgumentList;
import com.reallysi.rsuite.api.remoteapi.RemoteApiDefinition;
import com.reallysi.rsuite.api.remoteapi.RemoteApiExecutionContext;
import com.reallysi.rsuite.api.remoteapi.RemoteApiHandler;
import com.reallysi.rsuite.api.remoteapi.RemoteApiResult;
import com.reallysi.rsuite.api.remoteapi.result.RestResult;

public class ContributorConf implements RemoteApiHandler, PluginAware {
	private Plugin self = null;
	@Override public void setPlugin(Plugin plugin) { self = plugin; }
	
	@Override
	public void initialize(RemoteApiDefinition def) { }

	private static final String DEFAULTS_FILE = "defaults.xml";
	RemoteApiExecutionContext context = null;
	@Override
	public RemoteApiResult execute(RemoteApiExecutionContext context, CallArgumentList args) throws RSuiteException {
		RestResult rr = new RestResult();
		this.context = context;
		try { return execute(); } catch (Throwable t) { throw new RSuiteException("Error occurred calling service: " + t.getMessage(), t); }
	}
	public RemoteApiResult execute() throws Throwable {
		ContributorConfig config;
		File localConfigFile = new File(new File(context.getConfigurationProperties().getRSuiteHome()), "./conf/contributor.xml");
		if (localConfigFile.exists()) {
			return new InputStreamResult(new FileInputStream(localConfigFile), "text/xml");
		}
		
		String plugin = self.getLocation().getAbsolutePath();
		String url = "jar:file:///" + plugin.replaceAll("^/", "").replaceAll("\\\\", "/")  + "!/" + DEFAULTS_FILE;
		
		return new InputStreamResult(new URL(url).openStream(), "text/xml");
	}
}
