var Pages = this.Pages || Ember.Namespace.create({});
// Stub view to indicate MO load
Pages.LoadingView = Ember.View.extend({
	template: Ember.Handlebars.compile("Loading object {{view.uri}}...")
});

// Stub view to indicate problem loading MO
Pages.ErrorView = Ember.View.extend({
	uri: null,
	error: null,
	template: Ember.Handlebars.compile("Managed object {{view.uri}} failed to load with an error: {{view.error}}")
});

//Using RSuite.View so we have access to remote templates
Pages.SimpleMoView = RSuite.View.extend({
	templateName: RSuite.url('@pluginId@', 'simple-mo-view.hbr'),
	controller: null
});
