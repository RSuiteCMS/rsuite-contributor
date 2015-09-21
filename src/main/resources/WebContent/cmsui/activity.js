Pages.Activity = RSuite.View.extend({
	templateName: RSuite.url('@pluginId@', 'simple-mo-view.hbr'),
	controller: Ember.Object.create({
		model: null
	})
});
Pages.Activity.reopenClass({
	// Provide easy external access to controller.
	controller: Pages.Activity.proto().controller,
	icon: {
		// Ideally, your plugin will provide its own 48x48 icons
		passive: 'metadata',
		active: 'metadataBlue'
	},
	iconTooltip: 'Pages Demo',
	triggerReset: function () {
		//Do something to reload the tab's contents here
	}
});

// Register the URL action to navigate to the tab.
RSuite.controller.activities.registerUrlAction('pages-activity', function () {
	var uri =  [].join.call(arguments, '/'),
		mo = RSuite.model.ManagedObject.get(uri);
	Pages.Activity.controller.set('model', mo);
	// Creates a new tab pointing at your content.
	RSuite.controller.activities.addTab("Pages Demo", 100, Pages.Activity);
	mo.done(function () {
		RSuite.controller.activities.activateTab(Pages.Activity);
	}).fail(function () {
		var error = status;
		if (reason) {
			if (reason.message) {
				error = reason.message;
			} else {
				error = reason.toString();
			}
		}
		RSuite.controller.activities.activateTab(Pages.ErrorView.create({ uri: uri, error: error }));
	});
});

// Create an action so that a menu item can point to the tab.
RSuite.Action({
	id: 'pages:activity',
	invoke: function (context) {
		var managedObject = Ember.get(context, 'managedObject');
		if (Ember.get(context, 'newWindow')) {
			RSuite.openWindow(RSuite.url('/pages-activity/') + managedObject.get('canonicalUri'));
		} else {
			if (!RSuite.controller.activities.findTab(Pages.Activity)) {
				RSuite.controller.activities.addTab("Pages Demo", 100, Pages.Activity);
			}
			Pages.Activity.controller.set('model', managedObject);
			RSuite.controller.activities.activateTab(Pages.Activity);
			history.replaceState({}, "Will I Appear?", RSuite.url('/pages-activity/') + managedObject.get('canonicalUri'));
		}
		return RSuite.success;
	},
	isValid: RSuite.Action.rules.isMO
});
