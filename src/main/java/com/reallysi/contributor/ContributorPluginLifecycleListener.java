package com.reallysi.contributor;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import com.reallysi.rsuite.api.RSuiteException;
import com.reallysi.rsuite.api.User;
import com.reallysi.rsuite.api.extensions.ExecutionContext;
import com.reallysi.rsuite.api.extensions.Plugin;
import com.reallysi.rsuite.api.extensions.PluginLifecycleListener;
import com.reallysi.rsuite.api.security.RoleManager;

public class ContributorPluginLifecycleListener implements PluginLifecycleListener {
	private static final Log log = LogFactory.getLog(ContributorPluginLifecycleListener.class);
	@Override
	public void start(ExecutionContext context, Plugin plugin) {
		User system = context.getAuthorizationService().getSystemUser();
		try {
			RoleManager roleMgr = context.getAuthorizationService().getRoleManager(); 
			boolean roleExists = roleMgr.getRole("Contributor") != null;
			if (!roleExists) {
				roleMgr.createRole(system, "Contributor", "Contributors", "Held by external users presented with a simplified CMS interface");
			}
		} catch (RSuiteException rse) {
			log.warn("Couldn't assert presence of `Contributor` role.");
		}
		
	}

	@Override
	public void stop(ExecutionContext arg0, Plugin arg1) { }

}
