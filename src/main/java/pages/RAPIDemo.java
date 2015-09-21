package pages;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

import org.apache.commons.io.IOUtils;

import com.reallysi.rsuite.api.RSuiteException;
import com.reallysi.rsuite.api.extensions.Plugin;
import com.reallysi.rsuite.api.extensions.PluginAware;
import com.reallysi.rsuite.api.remoteapi.CallArgumentList;
import com.reallysi.rsuite.api.remoteapi.RemoteApiDefinition;
import com.reallysi.rsuite.api.remoteapi.RemoteApiExecutionContext;
import com.reallysi.rsuite.api.remoteapi.RemoteApiHandler;
import com.reallysi.rsuite.api.remoteapi.RemoteApiResult;
import com.reallysi.rsuite.api.remoteapi.result.HtmlPageResult;


public class RAPIDemo implements RemoteApiHandler, PluginAware {
	private Plugin plugin = null;
	@Override
	public void initialize(RemoteApiDefinition def) { }
	
	@Override
	public RemoteApiResult execute(RemoteApiExecutionContext ctx, CallArgumentList args) throws RSuiteException {
		InputStream pluginPage = plugin.getResourceAsStream("WebContent/simple-page.html");
		HtmlPageResult result = new HtmlPageResult();
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		result.setOutputStream(baos);
		try {
			IOUtils.copyLarge(pluginPage, baos);
		} catch (IOException ioe) {
			throw new RSuiteException(RSuiteException.ERROR_INTERNAL_ERROR, "Couldn't copy HTML stream to result", ioe);
		} finally {
			IOUtils.closeQuietly(pluginPage);
			IOUtils.closeQuietly(baos);
		}
		return result;
	}

	@Override
	public void setPlugin(Plugin plugin) {
		this.plugin = plugin;
	}
	
}