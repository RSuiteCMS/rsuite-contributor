var CONTIRUBUTOR_ROLE = 'Contributor';
(function () {
	var tabs = RSuite.Tab.get('tabs'),
		defaultTabs = tabs.slice();
		contributorTabs = [
			Contributor.Activity
		];

	function clearTabs() {
		/* Wipe out default config */
		tabs.replace(0, tabs.length, []);
		RSuite.Tab.get('tabs').forEach(function (tab) {
			Object.keys(tab).forEach(function (pattern) {
				delete RSuite.Tab.get('urlActions')[pattern];
			});
		});
	}
	function addTabs(tabArray) {
		clearTabs();
		tabArray.forEach(function (tab) {
			RSuite.Tab.enable(tab);
		});
	};
	$('html').addClass('contributor');
	RSuite.Tab.Workflow.Controller.reopen({
		onSessionResolved: function () {},
		formModel: null,
		model: function () {
			if (!RSuite.model.session.key) { return; }
			var controller = RSuite.controller.activity.tasks;
			return new Promise(function (resolve, reject) {
				RSuite.whenAll(RSuite.model.tasks.FacetedForm.getList()).done(function (facets) {
					var allForms = {},
						firstFacet = facets && facets.length && facets[0].id,
						searchFormId = RSuite.model.session.get('user.defaultTasksForm') || firstFacet;
					if (facets) {
						facets.forEach(function (facetForm) {
							allForms[facetForm.id] = RSuite.model.tasks.FacetedForm;
						});
					}
					if (searchFormId && allForms[searchFormId]) {
						//controller.set('formModel', allForms[searchFormId].load(searchFormId));
					}
					resolve(allForms);
				});
				try {
					var browseModel = controller.get('browseModel');
					if (RSuite.model.session.key && !browseModel) {
						var browseModel = RSuite.model.tasks.BrowseList.load();
						controller.set('browseModel', browseModel);
					}
					browseModel.andThen(function (model) {
						controller.send('publishBrowseCode');
					});
				} catch (e) {
					console.log(e);
				}
			});
		}.property('RSuite.model.session.key'),
	});

	RSuite.model.session.on('key:change', function () {
		var tabs = RSuite.Tab.get('tabs');
		if (this.get('key') && !this.get('user.roles.' + CONTIRUBUTOR_ROLE)) {
			addTabs(defaultTabs);
			$('html').removeClass('contributor');
		} else {
			$('html').addClass('contributor');
			// Cancel bunches of Workflow stuff.
			var insp = RSuite.component.WorkflowInspect.proto().controller.inspectors;
			insp.replace(0, insp.length, ['Comments', 'Attachments']);
			RSuite.controller.reopen({
				supportEnabled: function () {}.property()
			});
			RSuite.component.WorkflowInspect.AttachmentsView.proto().headerViews[0].proto().AddButton.reopen({
				actionName: 'contributor:uploadAndAttach'
			});
			addTabs(contributorTabs);
			// Remove non-contributor inspectors
		}
	}.bind(RSuite.model.session));
	RSuite.Tab.Workflow.Controller.proto().navigationControls[0].reopen({ role: 'action-menu' });

	// Disable the inspect and briefcase panels
}());
