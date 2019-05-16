var CONTIRUBUTOR_ROLE = 'Contributor';
(function () {
	var tabs = RSuite.Tab.get('tabs'),
		defaultTabs;
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
			'rsuite:workflow:removeAttachment': true,
			'rsuite:advanceTask': true,
			'rsuite:acceptTasks': true,
			'rsuite:acceptTask': true,
			'rsuite:workflow:setPool': true,
			'rsuite:workflow:comment': true,
			'rsuite:destroySession': true,
			'rsuite:openWindow': true,
			'rsuite:preview': true,
			'rsuite:previewAsset': true,
			'rsuite:uploadFiles': true,
			'rsuite:inspect': true,
			'rsuite:locales': true,
			'rsuite:setLocale': true
		};
	var removeUrls = ["inspect/**", "admin", "admin/**", "inspect/user:*", "inspect/plugin:*", "workflowAdmin", "workflowAdmin/*", "content", "content/*", "content/Browse/**", "browseFrom/**", "content/Search/*", "browse/**", "reports", "reports/*", "dashboard"];
	function clearTabs() {
		tabs.replace(0, tabs.length, []);
		removeUrls.forEach(function (pattern) {
			RSuite.Tab.removePattern(pattern);
		});
		removeUrls.forEach(function (pattern) {
			RSuite.Tab.urlAction(pattern, null, function () {
				RSuite.Tab.activate(Contributor.Activity);
				setTimeout(function () {
					RSuite.notify({
						title: "Not allowed",
						message: "As a Contributor, you are not permitted to view RSuite outside of the Contributor Inbox",
						icon: 'dialog_failure'
					});
				}, 2000);
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
	Contributor.actionsDisabled = true;
	RSuite.model.session.on('key:change', function () {
		if (this.get('key') && !this.get('user.roles.' + CONTIRUBUTOR_ROLE)) {
			$('html').removeClass('contributor');
		} else {
			
			//Default sort
			RSuite.model.TaskResultSet.reopen({
				sort: 'currentTask.dueDate:asc'
			});
			
			$('html').addClass('contributor');
			if (window.Workflow.Inspect) {
				// Add class so 5.3+ styles get hit.
				$('html').addClass('contributor-5-3');
			}
			// Remove non-contributor inspectors
			if (Workflow.Inspect) {
				Inspect.controller.titleViews.length = 0;
				Inspect.registerTitleView(Contributor.Workflow.TitleView);
				Inspect.controller.inspectors.length = 0;
				Inspect.registerInspector(Contributor.Workflow.CommentsAndAttachmentsInspector);
			} else {
				var insp = RSuite.component.WorkflowInspect.controller.inspectors;
				// Replace the inspectors list with just the one
				insp.replace(0, insp.length, ['CommentsAndAttachments']);
				// Disable the panel buttons when just one inspector available.
				RSuite.component.WorkflowInspect.proto().bodyView.reopen({ showOne: false });
			}
			// Cancel some Workflow stuff.
			RSuite.controller.reopen({
				supportEnabled: function () {}.property()
			});
			RSuite.Action.rules.isFullUser = new RSuite.Action.Rule(function (context) {
				return !RSuite.session.get('user.roles.Contributor');
			});
			addTabs(contributorTabs);

			//Disable non-contributor actions
			RSuite.Action.getAll().forEach(function (action) {
				if (/^rsuite:/.test(action.id) && !allowedContributorActions[action.id]) {
					action.reopen({ isValid: function () {
						console.info("Action " + action.id + " denied to contributor");
						if (Contributor.actionsDisabled) {
							return false;
						} else {
							return this._super.apply(this, arguments);
						}
					} });
				} else {

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
			RSuite.Action.get('rsuite:advanceTask').reopen({
				invoke: function (context) {
					var taskId = context.get('task.id');
					var wfId = context.get('task.workflowInstanceId');
					var wdoTaskId = RSuite.controller.get("detailsObject.currentTaskId");
					var wdoWfId = RSuite.controller.get("detailsObject.workflowInstanceId");
					return this._super.call(this, context).then(function () {
						if (wdoTaskId === taskId && wdoWfId === wfId) {
							RSuite.controller.set('detailsEnabled', false);
							RSuite.controller.set('detailsObject', null);
							RSuite.controller.set('detailsObjectData', null);
							RSuite.controller.set('detailsView', null);
							RSuite.controller.set('detailsObjectId', null);
						}
					});
				}
			});
		}
		RSuite.Tab.setDefault(Contributor.Activity);
		//RSuite.Tab.activate(Contributor.Activity);
		RSuite.Tab.Workflow.Controller.proto().navigationControls[0].reopen({ rsuiteRole: 'action-menu' });
		RSuite.component.ManagedObjectTools.reopen({
			ObjectIconView:  RSuite.component.ManagedObjectTools.proto().ObjectIconView.extend({
				clickable: false,
				click: null
			})
		});
	}.bind(RSuite.model.session));
	//Hotfix for core code.
	if (!/tasks/.test(String(RSuite.Action.get('rsuite:workflow:attachContent').addAttachments))) {
		RSuite.Action.get('rsuite:workflow:attachContent').reopen({
			addAttachments: function (context) {
				var mos = Ember.Set.create(),
					newList = [];
				context.get('managedObjects').forEach(function (mo) {
					mos.push(mo.get('finalManagedObject.canonicalId'));
				});
				var task = context.get('tasks.0') || context.get('task');
				var ids = (Ember.get(task, 'managedObjectIds') || []);
				ids.forEach(function (id) {
					mos.push(id);
				});
				mos = mos.toArray();
				Ember.set(task, 'managedObjectIds', mos);
				mos = mos.map(function (id) {
					return { name: 'id', value: id };
				});
				return new Promise(function (resolve, reject) {
					RSuite.services({
						type: 'post',
						service: 'workflow/task/' + Ember.get(task, 'id') + '/content',
						data: mos,
						json: true
					})
					.done(function () {
						resolve();
						task.notifyPropertyChange("managedObjectIds");
					}).fail(reject);
				});
			}
		});
		RSuite.Action.get('rsuite:workflow:removeAttachment').reopen({
			invoke: function (context) {
				var mos = Ember.Set.create(),
					toRemove = context.get('managedObjects') || [ context.get('managedObject') ];
				context.get('task.managedObjectIds').forEach(function (id) {
					mos.push(id);
				});

				toRemove.forEach(function (mo) {
					mos.removeObject(mo.get('finalManagedObject.canonicalId'));
					mos.removeObject(mo.get('referenceManagedObject.canonicalId'));
				});
				mos = mos.toArray().map(function (id) {
					return { name: 'id', value: id };
				});
				var task = context.get('task');
				return new Promise(function (resolve, reject) {
					RSuite.services({
						type: 'post',
						service: 'workflow/task/' + Ember.get(task, 'id') + '/content',
						data: mos,
						json: true
					})
					.done(function () {
						resolve();
						task.notifyPropertyChange("managedObjectIds");
					}).fail(reject);
				});
			}
		});
		RSuite.Action.get('rsuite:preview').reopen({
			invoke: function (context) {
				var mo = Ember.get(context, 'managedObject'),
					revision = Ember.get(context, 'revision'),
					apiUrl = RSuite.model.ManagedObject.proto().uri.call(mo, Ember.merge({}, context.propertyMap || {}, context));
				if (revision) {
					if (apiUrl.includes("?")) {
						apiUrl += '&revision=' + revision;
					} else {
						apiUrl += '?revision=' + revision;
					}
				}
				if(!apiUrl.includes("skey")) {
					if (apiUrl.includes("?")) {
						apiUrl = apiUrl + "&skey=" + RSuite.model.get('session.key');
					} else {
						apiUrl = apiUrl + "?skey=" + RSuite.model.get('session.key');
					}
				}

				
				RSuite.openWindow(apiUrl, Object.assign({
					title: (Ember.get(context, 'label') || RSuite.messageTable.get("actions/id/rsuite/preview/label")) + " " + Ember.get(mo, 'finalManagedObject.id'),
					left: 400,
					top: 0,
					width: 850,
					height: 700
				}, Ember.get(context, 'windowOptions') || {}));
				return RSuite.success;
			}
		});
	}
	//Fix `isXml` rule in CMS
	RSuite.Action.rules.isXml = new RSuite.Action.Rule(function (context) {
		return context.get('managedObject.finalManagedObject.objectType') === 'mo' && !context.get('managedObject.finalManagedObject.nonXml');
	});
	
	RSuite.Action.rules.isXml[Ember.NAME_KEY] = 'isXml';
}());