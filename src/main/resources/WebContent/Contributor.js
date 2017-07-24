(function () {
	// Why is this no longer automagical?
	RSuite.component.ManagedObjectTools.component(['content']);
	var ZD = Ember.Object.create({
		present: false
	});
	$(function () {
		RSuite.model.session.done(function () {
			ZD.set('present', !!RSuite.model.serverConfig.plugins.find(function (plugin) {
				return /^rsuite-zip-downloader(?:-plugin)?$/.test(plugin.name);
			}));
		});
	});
	RSuite.Action.rules.zipDownloaderInstalled = new RSuite.Action.Rule(function (context) {
		return ZD.present;
	});
	RSuite.Action.rules.o2webEditorInstalled = new RSuite.Action.Rule(function (context) {
		return false;
	});
	var o2DesktopPlugin = null;
	RSuite.model.session.done(function () {
		o2DesktopPlugin = RSuite.model.serverConfig.plugins.filter(function (plug) { return /oxygen/.test(plug.name) && /integration/.test(plug.name); });
		if (o2DesktopPlugin.length === 1) {
			o2DesktopPlugin = o2DesktopPlugin[0];
		} else {
			o2DesktopPlugin = o2DesktopPlugin.find(function (plug) { return /desktop/.test(plug.name); });
		}
	});
	RSuite.Action.rules.o2desktopEditorInstalled = new RSuite.Action.Rule(function (context) {
		return !!o2DesktopPlugin && !!RSuite.Action.get('oxygen:editOxygen');
	});	
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
									var task = (context.get('tasks') || [ context.get('task') ])[0];
									if (task) {
										task.notifyPropertyChange('managedObjectIds');
									}
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
	['zipDownloaderInstalled', 'o2webEditorInstalled', 'o2desktopEditorInstalled'].forEach(function (ruleName) {
		Object.defineProperty(RSuite.Action.rules[ruleName], Ember.NAME_KEY, Object.asPropertyDescriptor(ruleName));
	});

	var forbiddenWfSearches = {
			'rsuite:all-active': true
		};
	var workflowColumns = [];
	var contentColumns = [];
	var attachmentButtons = [];
	var nativeSortable = [
		"workflowInstance.id",
		"workflowInstance.workflowDefinitionName",
		"workflowInstance.startDate",
		"workflowInstance.dateCompleted",
		"currentTask.id",
		"currentTask.name",
		"currentTask.description",
		"currentTask.assigneeUserId",
		"currentTask.startDate",
		"currentTask.dueDate",
		"currentTask.endDate",
		"currentTask.workflowInstanceId",
		"currentTask.workflowDefinitionName"
	].reduce(function (o, i) { o[i] = true; return o; }, {});
	RSuite.model.session.addObserver('key', null, function () {
		if (RSuite.model.session.key) {
			$.ajax({ url: RSuite.restUrl(1, 'api/@pluginId@:ContributorConf') }).done(function (xml) {
				$(xml).find('contributor>workflowResults>column').toArray().forEach(function (col) {
					col = $(col);
					var name = col.attr('name').trim();
					workflowColumns.push({ name: name, label: col.attr('label'), sortable: !!col.attr('sortable') || nativeSortable[name] });
				});
				$(xml).find('contributor>attachments>column').toArray().forEach(function (col) {
					col = $(col);
					contentColumns.push({ name: col.attr('name'), label: col.attr('label') });
				});
				attachmentButtons.replace(0, 0, $(xml).find('contributor>attachments>button').toArray().map(function (button) {
					return $(button).find('action').toArray().map(function (action) {
						var props = {};
						[].forEach.call(action.attributes, function (attribute) {
							props[attribute.nodeName] = attribute.nodeValue;
						});
						if (typeof props.rule === 'string') {
							props.ruleText = props.rule;
							props.rule = new RSuite.Action.Rule(props.rule);
						}
						if (typeof props.name === 'string') {
							props.action = RSuite.Action.get(props.name);
							if (!props.action) {
								console.warn("No action by the name " + props.name);
								return null;
							}
							if (props.rule && props.action && props.action.isValid) {
								props.rule = RSuite.Action.rules.all(props.rule, props.action.isValid);
							}
						}
						if (typeof props.label === 'string' && props.label.charAt(0) === '/') {
							props.labelBinding = 'RSuite.messageTable.' + props.label.substr(1);
							props.label = null;
						}
						if (!props.label && !props.labelBinding && props.action.label) {
							props.labelBinding = 'action.label';
						}
						if (!props.icon && props.action.icon) {
							props.iconBinding = 'action.icon';
						}
						return Ember.Object.create(props);
					}).filter(function (a) { return !!a; });
				}));
			}).fail(function (xhr, status, reason) {
				RSuite.Error.displayError(reason);
			});
		}
	});
	window.Contributor = Workflow.constructor.extend({}).create();
	
	Contributor.workflowColumns = workflowColumns;
	Contributor.attachmentConfig = {
		columns: contentColumns,
		buttons: attachmentButtons
	};
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
								leadingColumns: [
									{ type: 'itemNumber' }
								],
								trailingColumns: [
									{ type: 'viewTask', label: ' ' },
									{ type: 'completeTask', label: ' ' }
								],
								clickRow: function () {
									return;
								}
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
						if (column.type === 'viewTask') {
							return Contributor.ViewTaskView;
						}
						if (column.type === 'completeTask') {
							return Contributor.CompleteTaskView;
						}
						if (column.name === 'attachments') {
							return Contributor.AttachmentsView;
						}
						if (column.name === 'comments') {
							return Contributor.CommentsView;
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
					},
					ContentHeader: RSuite.Tab.Workflow.Controller.proto().ContentHeader.extend({
						contains: RSuite.Tab.Workflow.Controller.proto().ContentHeader.proto().contains.slice().replace(-1, 1, [])
					})
				})
		});
	Contributor.CommentsView = Ember.ContainerView.extend({
		childViews: [
			Ember.View.extend({
				template: Ember.Handlebars.compile("{{{view.sanitizedComment}}}"),
				sanitizedComment: function () {
					var wf = this.get('parentView.parentView.rowView.object.workflowInstance');
					var comment = null;
					if (wf) {
						if (wf.loadState === 'new') {
							wf.load();
							return '';
						}
						comment = wf.get('comments.0');
					}
					if (!comment) { return ''; }
					return '<em>' + comment.userId.sanitize() + '</em> ' + comment.date.toRSuiteDateString() + ': <div>' + comment.message.sanitize() + '</div>';
				}.property('parentView.parentView.rowView.object.workflowInstance.comments')
			})
		]
	});
	Contributor.ViewTaskView = Ember.ContainerView.extend({
		classNames: [ 'view-task-view' ],
		childViews: [
			RSuite.component.UiButton.extend({
				classNames: ['preview-button'],
				icon: null,
				click: function () {
					var object = this.get('parentView.rowView.object');
					RSuite.controller.send('inspect', Workflow.DisplayObject.create({
						currentTaskId: object.currentTaskId,
						workflowInstanceId: object.workflowInstanceId
					}));
				},
				labelBinding: 'RSuite.messageTable.workflow/view-task'
			})
		]
		
	});
	Contributor.CompleteTaskView = Ember.ContainerView.extend({
		childViews: [],
		classNames: [ 'complete-task-view' ],
		CompletedView: Ember.View.extend(),
		OneTransitionView: RSuite.component.UiButton.extend({
			classNames: ['task-button'],
			icon: null,
			click: function () {
				var task = this.get('parentView.task');
				var taskId = task.get('id');
				var wfId = task.get('workflowInstanceId');
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
			icon: '',
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
		style: 'max-width: 20vw; overflow: hidden',
		attributeBindings: ['style'],
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
