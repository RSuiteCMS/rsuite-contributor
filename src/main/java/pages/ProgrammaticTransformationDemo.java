package pages;

import java.util.ArrayList;
import java.util.List;

import com.reallysi.rsuite.api.ManagedObject;
import com.reallysi.rsuite.api.RSuiteException;
import com.reallysi.rsuite.api.transformation.ManagedObjectTransformer;
import com.reallysi.rsuite.api.transformation.TransformationContext;
import com.reallysi.rsuite.api.transformation.TransformationProvider;

public class ProgrammaticTransformationDemo implements TransformationProvider {
	@Override
	public List<ManagedObjectTransformer> getTransformsForMo(ManagedObject mo, TransformationContext ctx) throws RSuiteException {
		List<ManagedObjectTransformer> transformers = new ArrayList<ManagedObjectTransformer>();
		transformers.add(new DemoTransformer(mo, ctx));
		return transformers;
	}
}
