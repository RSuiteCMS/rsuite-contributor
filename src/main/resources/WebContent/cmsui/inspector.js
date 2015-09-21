RSuite.controller.activities.registerUrlAction('pages-inspector', function () {
	var uri =  [].join.call(arguments, '/'),
		mo = RSuite.model.ManagedObject.get(uri);
	RSuite.set('minimalView', Pages.LoadingView.create({ uri: uri }));
	mo.done(function () {
		RSuite.set('minimalView', Pages.SimpleMoView.create({ controller: { model: mo } }));
	}).fail(function (xhr, status, reason) {
		var error = status;
		if (reason) {
			if (reason.message) {
				error = reason.message;
			} else {
				error = reason.toString();
			}
		}
		RSuite.set('minimalView', Pages.ErrorView.create({ uri: uri, error: error }));
	});
});

RSuite.Action({
	id: 'pages:inspector',
	invoke: function (context) {
		var managedObject = Ember.get(context, 'managedObject');
		RSuite.openWindow(RSuite.url('/pages-inspector/') + managedObject.get('canonicalUri'));
		return RSuite.success;
	},
	isValid: RSuite.Action.rules.isMO
});
