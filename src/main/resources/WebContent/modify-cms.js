var CONTIRUBUTOR_ROLE = 'Contributor';
(function () {
	var tabs = RSuite.Tab.get('tabs'),
		defaultTabs = tabs.slice();
		contributorTabs = [
			Contributor.Activity
		],
		allowedContributorActions = {
			'rsuite:replace': true,
			'rsuite:rename': true,
			'rsuite:checkIn': true,
			'rsuite:checkOut': true,
			'rsuite:download': true,
			'rsuite:downloadConfirm': true,
			'rsuite:reorder': true,
			'rsuite:downloadAsZip': true,
			'rsuite:newFolder': true,
			'rsuite:notify': true,
			'rsuite:invokeWebservice': true,
			'rsuite:messageDialog': true,
			'contributor:uploadAndAttach': true,
			'rsuite:createContent': true,
			'rsuite:newContent': true,
			'rsuite:workflow:attachContent': true,
			'rsuite:advanceTask': true,
			'rsuite:acceptTasks': true,
			'rsuite:acceptTask': true,
			'rsuite:workflow:setPool': true
		};

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
	RSuite.model.session.on('key:change', function () {
		var tabs = RSuite.Tab.get('tabs');
		if (this.get('key') && !this.get('user.roles.' + CONTIRUBUTOR_ROLE)) {
			addTabs(defaultTabs);
			$('html').removeClass('contributor');
		} else {
			$('html').addClass('contributor');
			// Remove non-contributor inspectors
			var insp = RSuite.component.WorkflowInspect.proto().controller.inspectors;
			insp.replace(0, insp.length, ['Comments', 'Attachments']);
			// Cancel some Workflow stuff.
			RSuite.controller.reopen({
				supportEnabled: function () {}.property()
			});
			RSuite.component.WorkflowInspect.AttachmentsView.proto().headerViews[0].proto().AddButton.reopen({
				actionName: 'contributor:uploadAndAttach'
			});
			RSuite.Action.rules.isFullUser = new RSuite.Action.Rule(function (context) {
				return !RSuite.session.get('user.roles.Contributor');
			});
			addTabs(contributorTabs);

			//Disable non-contributor actions
			RSuite.Action.getAll().forEach(function (action) {
				if (!allowedContributorActions[action.id]) {
					action.reopen({ isValid: function () { return false; } });
				}
			});
			Workflow.Task.reopen({
				displayName: function () {
					return this.get('shortDisplayName');
				}.property('shortDisplayName')
			});
			RSuite.view.Menu.Item.reopen({
				click: function (event, view) {
					var item = this.get('item'),
						result = Promise.cast(item.invoke());
					this.get('menuView')
					result = result.catch(function (err) {
						var actionId = item.get('action.id'),
							context = item.get('context'),
							label = item.get('label'),
							message = (actionId ? ("Action \"" + label + '\" <' + actionId + ">") : ("Menu item \"" + label + "\"")) + " failed.",
							properties = {};
						if (context) { properties.context = context; }
						if (err) { properties.response = err; }
						console.groupedInfo({
							message: message,
							properties: properties
						});
					});

					result.then(function () {
						this.get('menu').trigger('actionCompleted');
					}.bind(this));
					result = result.finally(function () {
						RSuite.view.Menu.removeAll();
					});
				}
			});
			RSuite.component.MenuButton.reopen({
				click: function () {
					var scope = this.get('scope'),
						context = this.get('menuContext'),
						model = this.get('model'),
						button = this,
						view = RSuite.view.Menu.extend({
							anchor: this.$('.ui-button-icon-secondary'),
							menuContext: context,
							model: model,
							trigger: function (event, args) {
								if (/^(?:action|item|menu)/.test(event)) {
									button.trigger.apply(button, arguments);
								}
								return this._super.apply(this, arguments);
							}
						}).create(),
						thenFn = null;
					view.show();
					return false;
				}
			});
		}
	}.bind(RSuite.model.session));
	RSuite.Tab.Workflow.Controller.proto().navigationControls[0].reopen({ role: 'action-menu' });
}());
