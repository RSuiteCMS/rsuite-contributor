package pages;

import java.net.URI;

import javax.xml.transform.Transformer;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;

import com.reallysi.rsuite.api.ManagedObject;
import com.reallysi.rsuite.api.RSuiteException;
import com.reallysi.rsuite.api.extensions.ExecutionContext;
import com.reallysi.rsuite.api.extensions.Plugin;
import com.reallysi.rsuite.api.extensions.PluginAware;
import com.reallysi.rsuite.api.transformation.ManagedObjectTransformer;

public class DemoTransformer implements ManagedObjectTransformer, PluginAware {
	private ManagedObject mo = null;
	private ExecutionContext context = null;
	private Plugin plugin = null;
	
	public DemoTransformer(ManagedObject mo, ExecutionContext context) {
		this.mo = mo;
		this.context = context;
	}
	
	@Override
	public String getMimeType() {
		return "text/html";
	}

	@Override
	public String getName() {
		try {
			return mo.getDisplayName();
		} catch (RSuiteException rse) {
			return "<Error: " + rse.getMessage() + ">";
		}
	}

	@Override
	public String getSuggestedFileName() {
		return "demo-transformation-" + mo.getId() + ".html";
	}
	
	@Override
	public void setPlugin(Plugin plugin) {
		this.plugin = plugin;
	}

	@Override
	public void transform(StreamSource src, StreamResult result) throws RSuiteException {
		try {
			// Apparently, PluginAware DOES NOTHING in 4.1.x.
			if (this.plugin == null) {
				this.plugin = context.getPluginManager().get("pages");
			}
			URI xslPath = new URI("rsuite:/res/plugin/" + plugin.getId() + "/xslt-transformation-demo.xsl");
			
			Transformer transformer = context.getXmlApiManager().getTransformer(xslPath);
			transformer.setParameter("managedObjectId", mo.getId());
			transformer.transform(src, result);
		} catch (Throwable t) {
			throw new RSuiteException(RSuiteException.ERROR_INTERNAL_ERROR, "Couldn't transform ManagedObject " + mo.getId(), t);
		}
	}
}
