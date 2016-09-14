(function () {
	// Why is this no longer automagical?
	RSuite.component.ManagedObjectTools.component(['content']);
	var forbiddenWfSearches = {
			'rsuite:all-active': true
		};
	var workflowColumns = [];
	var contentColumns = [];

	$.ajax({ url: RSuite.url('@pluginId@', 'contributor-config.xml') }).done(function (xml) {
		$(xml).find('contributor>workflowResults>column').toArray().forEach(function (col) {
			col = $(col);
			workflowColumns.push({ name: col.attr('name'), label: col.attr('label'), sortable: !!col.attr('sortable') });
		});
		$(xml).find('contributor>attachments>column').toArray().forEach(function (col) {
			col = $(col);
			contentColumns.push({ name: col.attr('name'), label: col.attr('label'), sortable: !!col.attr('sortable') });
		});
	});
	window.Contributor = Workflow.constructor.extend({}).create();
	Contributor.workflowColumns = workflowColumns;
	Contributor.contentColumns = contentColumns;

	RSuite.model.tasks.BrowseList.extend()
		.named("Contributor.BrowseModel")
		.reopen({
			fromMap: function (data) {
				if (data.standardSearches) {
					this.set('standardSearches', data.standardSearches.filter(function (search) {
						return !forbiddenWfSearches[search.code];
					}));
				} else {
					this.set('standardSearches', []);
				}
				this.set('savedSearches', []);
				return this;
			}
		});

	Contributor.Activity =  RSuite.Tab.Workflow.extend()
		.named("Contributor.Activity")
		.reopenClass({
			Controller: RSuite.Tab.Workflow.Controller.extend()
				.named("Contributor.Activity.Controller")
				.reopenClass({
					navigators: {
						Browse: RSuite.Tab.Workflow.Controller.navigators.Browse
					},
					viewers: {
						Table: RSuite.Tab.Workflow.Controller.viewers.Table.extend({
							ListView: RSuite.Tab.Workflow.Controller.viewers.Table.proto().ListView.extend({
								// Removes the itemNumber and actionMenu columns
								trailingColumns: [
									{ type: 'completeTask', label: ' ' }
								]
							})
						})
					}
				})
				.reopen({
					formModel: null,
					onSessionResolved: function () {
						if (RSuite.model.session.key && !this.get('browseModel')) {
							this.set('browseModel', Contributor.BrowseModel.load());
						}
					}.on('init').observes('RSuite.model.session.key'),
					contentColumns: workflowColumns,
					getColumnView: function (column) {
						if (column.type === 'completeTask') {
							return Contributor.CompleteTaskView;
						}
						if (column.name === 'attachments') {
							return Contributor.AttachmentsView;
						}
						return this._super.apply(this, arguments);
					},
					actions: {
						contentItemActionMenu: function (anchor, context) {
							context = Ember.Object.create(
								Object.getStaticProperties(this.get('resultSet.actionMenuContext') || {}) || {},
								Object.getStaticProperties(context),
								{ scope: 'taskDetailsNode' }
							);
							var model = RSuite.model.Menu.load(context);
							var view = RSuite.view.Menu.show(model, anchor.find('td.managed-object-tools'));
						}
					}
				})
		});

	Contributor.CompleteTaskView = Ember.ContainerView.extend({
		childViews: [],
		CompletedView: Ember.View.extend(),
		OneTransitionView: RSuite.component.UiButton.extend({
			classNames: ['task-button'],
			iconBinding: 'parentView.oneTransition.icon',
			click: function () {
				RSuite.Action('rsuite:advanceTask', { task: this.get('parentView.task') }).then(function () {
					this.get('controller').reloadResultSet();
				}.bind(this));
				return false;
			},
			labelBinding: 'parentView.oneTransition.label'
		}),
		ClaimView: RSuite.component.UiButton.extend({
			classNames: ['task-button'],
			iconBinding: '',
			label: 'Claim task',
			click: function () {
				RSuite.Action('rsuite:acceptTasks', { task: this.get('parentView.task') }).then(function () {
					this.get('controller').reloadResultSet();
				}.bind(this));
				return false;
			},
			messagePaths: {
				complete: "workflow/inspect/summary/actions/claim"
			}
		}),
		TransitionsMenuView: RSuite.component.MenuButton.extend({
			classNames: ['task-button' ],
			modelBinding: 'parentView.transitions',
			labelBinding: 'messages.complete',
			messagePaths: {
				complete: "workflow/inspect/summary/actions/complete"
			},
			icon: 'dialog_success',
			_refresh: function () {
				this.get('controller').reloadResultSet();
			}.on('actionCompleted')
		}),
		task: function () {
			return this.get('rowView.object.currentTask');
		}.property('rowView.object'),
		transitions: function () {
			var modelTransitions = this.get('task.transitions'),
				context = {
					task: this.get('task'),
					scope: 'inspect'
				};
			if (modelTransitions && modelTransitions.length > 1) {
				return modelTransitions.map(function (transition) {
					return RSuite.model.Menu.Item.extend({
						icon: "workflow_task",
						action: RSuite.Action.get('rsuite:advanceTask'),
						transition: transition,
						labelBinding: 'transition.destinationLabel',
						propertyMap: function () {
							return {
								transition: this.get('transition.destinationId')
							};
						}.property('transition.destinationId'),
						context: context
					}).create();
				});
			} else {
				var action = RSuite.Action.get('rsuite:advanceTask');
				return [
					RSuite.model.Menu.Item.create({
						action: action,
						context: context,
						iconBinding: 'action.icon',
						labelBinding: 'action.label'
					})
				];
			}
		}.property('task'),
		_updateView: function () {

			var repl = Math.min(1, this.get('childViews.length'));
			var isDone = this.get('task.endDate');
			var xct = this.get('transitions.length');
			var isMine = this.get('task.assigneeUserId') === RSuite.model.session.get('user.name');
			if (isDone) {
				this.replace(0, repl, [ this.createChildView(this.CompletedView, {}) ]);
			} else if (isMine) {
				if (xct > 1) {
					this.replace(0, repl, [ this.createChildView(this.TransitionsMenuView, {}) ]);
				} else if (xct <= 1) {
					this.replace(0, repl, [ this.createChildView(this.OneTransitionView, {}) ]);
				} else {
					this.replace(0, repl, [ ]);
				}
			} else {
				this.replace(0, repl, [ this.createChildView(this.ClaimView, {}) ]);
			}
		},
		_selectChildView: function () {
			Ember.run.debounce(this, '_updateView', 125);
		}.on('init').observes('task', 'transitions.length'),
		onlyOneTransition: function () {

		}.property('transitions.length'),
		oneTransition: function () {
			return this.get('transitions').objectAt(0);
		}.property('transitions.0')
	});
	Contributor.AttachmentsView = Ember.CollectionView.extend({
		contentBinding: 'rowView.object.currentTask.managedObjects',
		tagName: 'td',
		itemViewClass: RSuite.component.ManagedObjectTools.extend({
			tagName: 'managed-object',
			actionMenu: false,
			disclosure: false,
			depth: false,
			icon: true,
			status: true,
			label: true,
			isVisible: function () {
				return !!this.get('content');
			}.property('content'),
			ObjectIconView:  RSuite.component.ManagedObjectTools.proto().ObjectIconView.extend({
				clickable: false,
				click: null
			}),
			contentBinding: null
		})
	});
}());
RSuite.Action({
	id: 'contributor:uploadAndAttach',
	icon: 'add',
	Dialog: RSuite.view.Dialog.UploadFiles.extend()
		.reopen({
			setup: function () {
				var myName = this.constructor.toString(),
					menuContext = this.get('menuContext');
				if (!menuContext) {
					console.log(myName + " must be passed a menuContext.");
					this.dialogClose();
				}
			}.on('init')
		}),
	displayDialog: function (context) {
		return new Promise(function (resolve, reject) {
			var dlg = this.Dialog.create({ menuContext: context }).dialogShow();
			dlg.done(function () {
				resolve(dlg);
			})
				.fail(function () {
					dlg.dialogClose();
					reject();
				});
		}.bind(this));
	},
	invoke: function (context) {
		var caType = Ember.get(context, 'caType'),
			dlg = this.Dialog.create({ menuContext: context }),
			xhr;
		return new Promise(function (resolve, reject) {
			this.displayDialog(context).then(function (dlg) {
				var promise = RSuite.Action('rsuite:createContent', context),
					upload = context.upload;
				promise.then(function (resolution) {
					dlg.set('uploadHandle', resolution.upload);
					resolution.request.done(function (result) {
						context.set('managedObjects', Object.keys(result.managedObjects).map(function (moId) {
							// By this point, the MO from the response will have just entered the MO cache.
							return RSuite.model.ManagedObject.getCached(moId);
						}));
						return RSuite.whenAll(context.get('managedObjects')).done(function () {
							return RSuite.Action('rsuite:workflow:attachContent', context).then(function () {
								dlg.dialogClose();
							});
						});
					}).fail(function (xhr, status, error) {
						RSuite.Error.show(error);
						dlg.dialogClose();
					});
				}).catch(function (xhr, status, error) {
					RSuite.Error.show(error);
					dlg.dialogClose();
				}).then(resolve, reject);
			}, reject);
		}.bind(this));
	},
	isValid: 'isMyTask'
});
