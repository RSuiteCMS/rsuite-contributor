(function () {
	if (Workflow.Inspect) { // 5.3 Inspect.
		// Add the class so the 5.3 style mods are hit.
		Workflow.Inspect.TitleView.extend()
			.named("Contributor.Workflow.TitleView")
			.reopen({
				isValidFor: function (model, user) {
					return this._super(model, user) && user.roles.Contributor;
				}
			});
		var AddButton = Workflow.Inspect.AttachmentsInspector.proto().titleView.proto().AddButton.extend()
			.named("Contributor.Workflow.AddAttachmentButton")
			.extend({
				isVisible: true,
				isEnabled: function () {
					var startDate = this.get('inspector.task.startDate'),
						endDate = this.get('inspector.task.endDate');
					return !!startDate && !endDate;
				}.property('inspector.task', 'inspector.task.startDate', 'inspector.task.endDate'),
				// Button always present, just grayed out if invalid; logic copied from original `isVisible`.
				style: function () {
					var enabled = this.get('isEnabled'),
						style = 'width: 1em; height: 1em; font-size: ' + this.get('size') + 'px';
					if (!enabled) {
						style += '; opacity: 0.5; color: #333; cursor: default; pointer-events: none';
					}
					return style;
				}.property('size', 'isEnabled'),
				actionName: 'contributor:uploadAndAttach',
				actionMenuContext: function () {
					return { 'task': this.get("inspector.task") };
				}.property('inspector.task'),
				_click: function () {
					if (!this.get('isEnabled')) {
						return false;
					}
					return this._super.apply(this, arguments);
				}
			});
		
		var AttachmentsView = Workflow.Inspect.AttachmentsView.extend()
			.named("Contributor.Workflow.AttachmentsView")
			.reopen({
				TaskManagedObjectsView: Workflow.Inspect.AttachmentsView.proto().TaskManagedObjectsView.extend({
					rowClick: function () {},
					columnsBinding: null,
					columns: Contributor.attachmentConfig.columns,
					clickRow: function () {},
					leadingColumns: [],
					trailingColumns: [],
					getColumnView: function (column) {
						if (column.name === 'actions') { return ActionButtonsView; }
						return this._super(column);
					},
					model: function () {
						var task = this.get('inspector.task');
						if (!task) {
							return RSuite.model.BlankResultSet.create({
								content: [],
								loadState: 'pending',
								loaded: false
							});
						}
						task.addObserver('loadState', this, function () {
							var tmp = task.get('loaded');
							task.set('loaded', !tmp);
							setTimeout(function () {
								task.set('loaded', task.get('loadState') === 'loaded');
							}, 50);
						});
						return RSuite.model.BlankResultSet.create({
							task: task,
							contentBinding: 'task.managedObjects',
							lengthBinding: 'content.length',
							loadStateBinding: 'task.loadState',
							loadedBinding: 'task.loaded'
						});
					}.property('inspector.task', 'inspector.task.loadState')
				})
			});
		var CommentsView = Workflow.Inspect.CommentsView.extend()
			.named("Contributor.Workflow.CommentsView")
			.reopen({
				//Fixes Markdown comments in 5.1.x-5.2
				showdown: new Showdown.converter(),
				isEnabled: function () {
					var startDate = this.get('inspector.task.startDate'),
						endDate = this.get('inspector.task.endDate');
					return !!startDate && !endDate;
				}.property('inspector.task.currentTask', 'inspector.task.startDate', 'inspector.task.endDate'),
				addComment: function () {
					RSuite.Action('rsuite:workflow:comment', { 
						workflow: this.get('workflow.id'), 
						comment: this.showdown.makeHtml(this.get('localComment'))
					});
					this.set('localComment', '');
					return false;
				},
				classNameBindings: ['isEnabled::task-comments-disabled']
			});
		var ActionButtonsView = Ember.ContainerView.extend()
			.named("Contributor.Workflow.ActionButtonsView")
			.reopen({
				classNames: [ 'action-buttons' ],
				content: null,
				menuContext: function () {
					if (this.get('content.loadState') !== 'loaded') { return; }
					return this.get('content.actionMenuContext');
				}.property('content', 'content.loadState'),
				updateContent: function () {
					var no = this.get('rowView.object');
					if (!no) { return; }
					this.set('content', no);
				}.on('init').observes('tableView.model', 'rowView.object', 'rowView.object.loadState'),
				childViews: [
					Ember.CollectionView.extend({
						content: Contributor.attachmentConfig.buttons,
						cellViewBinding: 'parentView',
						itemViewClass: RSuite.view.Icon.extend({
							classNames: [ 'action-button' ],
							childViews: [],
							cellViewBinding: 'parentView.cellView',
							objectBinding: 'cellView.content',
							validateAction: function () {
								if (!this.get('object')) { return; }
								if (this.get('object.loadState') !== 'loaded') { return; }
								var context = this.get('parentView.parentView.menuContext');
								var actions = this.get('content').slice();
								if (!actions.length) {
									this.set('disabledAction', '$blank');
								}
								var defaultIcon = actions[0] && actions[0].icon;
								var testAction = function () {
									if (this.isDestroying || this.isDestroyed) { return; }
									if (actions.length) {
										var action = actions.shift();
										action.rule(context).then(function () {
											this.set('validAction', action);
											this.set('disabledAction', null);
										}.bind(this), testAction);
									} else {
										this.set('disabledAction', defaultIcon);
										this.set('validAction', null);
									}
								}.bind(this);
								testAction();
								this.set('title', RSuite.messageTable.get('contributor/attachments/disabled'));
							}.on('init').observes('parentView.parentView.menuContext', 'content', 'object.loadState'),
							validAction: null,
							disabledAction: null,
							size: 24,
							model: '$blank',
							finalMenuContext: function () {
								return Object.assign({}, this.get('parentView.parentView.menuContext'), this.get('validAction'));
							}.property('parentView.parentView.menuContext', 'validAction','object'),
							style: function () {
								var style = 'width: 1em; height: 1em; font-size: ' + this.get('size') + 'px';
								if (this.get('disabledAction')) {
									style += '; opacity: 0.5; color: #333; cursor: default';
								}
								return style;
							}.property('size', 'disabledAction'),
							setModels: function () {
								if (this.isDestroying || this.isDestroyed) { return; }
								
								var disabled = this.get('disabledAction');
								if (disabled) {
									this.set('model', disabled);
									this.set('disabled', true);
									this.set('title', RSuite.messageTable.get('contributor/attachments/disabled'));
									return; 
								}
								
								var action = this.get('validAction');
								var ctx = this.get('object.actionMenuContext');
								
								if (!action || !ctx) { return; }
								if (action.action.adjust) {
									var mi = RSuite.model.Menu.Item.create({
										label: action.get('label'),
										icon: action.get('icon')
									});	
									if (action.action.adjust) {
										action.action.adjust(RSuite.Action.Context.create(ctx), mi);
									}
									var icon = mi.get('icon');
									if (typeof icon === 'string') {
										icon = icon.split(',');
									}
									icon = icon.filter(function (a) { return !!a; });
									this.set('model', icon[0]);
									this.set('title', mi.get('label'));
								} else {
									this.set('model', action.get('icon'));
									this.set('title', action.get('label'));
								}
								this.set('disabled', false);
							}.observes('validAction', 'disabledAction', 'object.actionMenuContext'),
							click: function () {
								if (!this.get('disabledAction') && this.get('validAction') && this.get('object.actionMenuContext')) {
									this.get('validAction.action').invoke(RSuite.Action.Context.create(this.get('finalMenuContext')));
								}
							},
							clickable: function () {
								return !this.get('disabledAction');
							}.property('disabledAction')
						})
					})
				]
			});
		Ember.ContainerView.extend()
			.named("Contributor.Workflow.CommentsAndAttachmentsView")
			.reopen({
				createChildView: function (View, ext) {
					ext = ext || {};
					ext.inspector = this.get('inspector');
					return this._super(View, ext);
				},
				childViews: [ 'attachmentsView', 'commentsView' ],
				commentsView: function () { 
					return this.createChildView(this.constructor.CommentsView); 
				}.property(),
				attachmentsView: function () {
					return this.createChildView(this.constructor.AttachmentsView);
				}.property(),
				preloadModel: function () {
					var wdo = this.get('inspector.model');
					wdo.set('currentTask', Workflow.Task.getCached(wdo.get('currentTaskId')).load(true));
					wdo.set('workflowInstance', Workflow.Instance.getCached(wdo.get('workflowInstanceId')).load(true));
				}.on('willInsertElement')
			}).reopenClass({
				CommentsView: CommentsView,
				AttachmentsView: AttachmentsView,
				ActionButtonsView: ActionButtonsView
			});
			Workflow.Inspect.AttachmentsInspector.proto().titleView.extend()
				.named("Contributor.Workflow.CommentsAndAttachmentsTitle")
				.reopen({
					AddButton: AddButton
				});
			Inspect.Inspector.extend()
				.named("Contributor.Workflow.CommentsAndAttachmentsInspector")
				.reopen({
					titleView: Contributor.Workflow.CommentsAndAttachmentsTitle,
					bodyView: Contributor.Workflow.CommentsAndAttachmentsView,
					isValid: function () {
						var model = this.get('model');
						return Workflow.DisplayObject.detectInstance(model);
					}.property('model'),
					taskBinding: 'model.currentTask',
					workflowBinding: 'model.workflowInstance',
					displayObjectBinding: 'model',
					showdown: new Showdown.converter(),
					AddButton: Workflow.Inspect.CommentsInspector.proto().AddButton,
					HelpButton: Workflow.Inspect.CommentsInspector.proto().HelpButton,
					addComment: Workflow.Inspect.CommentsInspector.proto().addComment
				});
	} else { // 5.2 Inspect
		var Attachments = RSuite.component.WorkflowInspect.AttachmentsView.extend();
		Attachments.reopen({
			headerViews: Attachments.proto().headerViews.slice().replace(0, 1, [
				Attachments.proto().headerViews[0].extend({ 
					AddButton: Attachments.proto().headerViews[0].proto().AddButton.extend({ 
						isVisible: true,
						isEnabled: function () {
							var startDate = this.get('sectionView.content.currentTask.startDate'),
								endDate = this.get('sectionView.content.currentTask.endDate');
							return !!startDate && !endDate;
						}.property('sectionView.content.currentTask', 'sectionView.content.currentTask.startDate', 'sectionView.content.endDate'),
						// Button always present, just grayed out if invalid; logic copied from original `isVisible`.
						style: function () {
							var enabled = this.get('isEnabled'),
								style = 'width: 1em; height: 1em; font-size: ' + this.get('size') + 'px';
							if (!enabled) {
								style += '; opacity: 0.5; color: #333; cursor: default; pointer-events: none';
							}
							return style;
						}.property('size', 'isEnabled'),
						actionName: 'contributor:uploadAndAttach',
						_click: function () {
							if (!this.get('isEnabled')) {
								return false;
							}
							return this._super.apply(this, arguments);
						}
					})
				})
			])
		});
		var C_A = Ember.ContainerView.extend()
			.named('RSuite.component.WorkflowInspect.CommentsAndAttachmentsView')
			.reopen({
				childViews: [ 'attachmentsView', 'commentsView' ],
				commentsView: function () { 
					return this.createChildView(this.constructor.CommentsView); 
				}.property(),
				attachmentsView: function () {
					return this.createChildView(this.constructor.AttachmentsView);
				}.property(),
				preloadModel: function () {
					var wdo = this.get('sectionView.sectionView.content');
					wdo.set('currentTask', Workflow.Task.getCached(wdo.get('currentTaskId')).load(true));
					wdo.set('workflowInstance', Workflow.Instance.getCached(wdo.get('workflowInstanceId')).load(true));
				}.on('willInsertElement')
			})
			.reopenClass({
				CommentsView: RSuite.component.WorkflowInspect.CommentsView.extend({
					//Fixes Markdown comments in 5.1.x-5.2
					showdown: new Showdown.converter(),
					isEnabled: function () {
						var startDate = this.get('sectionView.sectionView.content.currentTask.startDate'),
							endDate = this.get('sectionView.sectionView.content.currentTask.endDate');
						return !!startDate && !endDate;
					}.property('sectionView.sectionView.content.currentTask', 'sectionView.sectionView.content.currentTask.startDate', 'sectionView.sectionView.content.endDate'),
					addComment: function () {
						RSuite.Action('rsuite:workflow:comment', { 
							workflow: this.get('workflow.id'), 
							comment: this.showdown.makeHtml(this.get('localComment'))
						});
						this.set('localComment', '');
						return false;
					},
					classNameBindings: ['isEnabled::task-comments-disabled']
				}),
				AttachmentsView: Attachments.extend({
					bodyView: Attachments.proto().bodyView.extend({
						TaskManagedObjectsView: Attachments.proto().bodyView.proto().TaskManagedObjectsView.extend({
							rowClick: function () {},
							columnsBinding: null,
							columns: Contributor.attachmentConfig.columns,
							clickRow: function () {},
							leadingColumns: [],
							trailingColumns: [],
							getColumnView: function (column) {
								if (column.name === 'actions') { return C_A.ActionButtonsView; }
								return this._super(column);
							},
							model: function () {
								var task = this.get('sectionView.content.currentTask');
								if (!task) {
									return RSuite.model.BlankResultSet.create({
										content: [],
										loadState: 'pending',
										loaded: false
									});
								}
								task.addObserver('loadState', this, function () {
									var tmp = task.get('loaded');
									task.set('loaded', !tmp);
									setTimeout(function () {
										task.set('loaded', task.get('loadState') === 'loaded');
									}, 50);
								});
								return RSuite.model.BlankResultSet.create({
									task: task,
									contentBinding: 'task.managedObjects',
									lengthBinding: 'content.length',
									loadStateBinding: 'task.loadState',
									loadedBinding: 'task.loaded'
								});
							}.property('sectionView.content.currentTask', 'sectionView.content.currentTask.loadState')
						})
						
					})
				}),
				ActionButtonsView: Ember.ContainerView.extend({
					classNames: [ 'action-buttons' ],
					content: null,
					menuContext: function () {
						if (this.get('content.loadState') !== 'loaded') { return; }
						return this.get('content.actionMenuContext');
					}.property('content', 'content.loadState'),
					updateContent: function () {
						var no = this.get('rowView.object');
						if (!no) { return; }
						this.set('content', no);
					}.on('init').observes('tableView.model', 'rowView.object', 'rowView.object.loadState'),
					childViews: [
						Ember.CollectionView.extend({
							content: Contributor.attachmentConfig.buttons,
							cellViewBinding: 'parentView',
							itemViewClass: RSuite.view.Icon.extend({
								classNames: [ 'action-button' ],
								childViews: [],
								cellViewBinding: 'parentView.cellView',
								objectBinding: 'cellView.content',
								validateAction: function () {
									if (!this.get('object')) { return; }
									if (this.get('object.loadState') !== 'loaded') { return; }
									var context = this.get('parentView.parentView.menuContext');
									var actions = this.get('content').slice();
									if (!actions.length) {
										this.set('disabledAction', '$blank');
									}
									var defaultIcon = actions[0] && actions[0].icon;
									var testAction = function () {
										if (this.isDestroying || this.isDestroyed) { return; }
										if (actions.length) {
											var action = actions.shift();
											action.rule(context).then(function () {
												this.set('validAction', action);
												this.set('disabledAction', null);
											}.bind(this), testAction);
										} else {
											this.set('disabledAction', defaultIcon);
											this.set('validAction', null);
										}
									}.bind(this);
									testAction();
									this.set('title', RSuite.messageTable.get('contributor/attachments/disabled'));
								}.on('init').observes('parentView.parentView.menuContext', 'content', 'object.loadState'),
								validAction: null,
								disabledAction: null,
								size: 24,
								model: '$blank',
								finalMenuContext: function () {
									return Object.assign({}, this.get('parentView.parentView.menuContext'), this.get('validAction'));
								}.property('parentView.parentView.menuContext', 'validAction','object'),
								style: function () {
									var style = 'width: 1em; height: 1em; font-size: ' + this.get('size') + 'px';
									if (this.get('disabledAction')) {
										style += '; opacity: 0.5; color: #333; cursor: default';
									}
									return style;
								}.property('size', 'disabledAction'),
								setModels: function () {
									if (this.isDestroying || this.isDestroyed) { return; }
									
									var disabled = this.get('disabledAction');
									if (disabled) {
										this.set('model', disabled);
										this.set('disabled', true);
										this.set('title', RSuite.messageTable.get('contributor/attachments/disabled'));
										return; 
									}
									
									var action = this.get('validAction');
									var ctx = this.get('object.actionMenuContext');
									
									if (!action || !ctx) { return; }
									if (action.action.adjust) {
										var mi = RSuite.model.Menu.Item.create({
											label: action.get('label'),
											icon: action.get('icon')
										});	
										if (action.action.adjust) {
											action.action.adjust(RSuite.Action.Context.create(ctx), mi);
										}
										var icon = mi.get('icon');
										if (typeof icon === 'string') {
											icon = icon.split(',');
										}
										icon = icon.filter(function (a) { return !!a; });
										this.set('model', icon[0]);
										this.set('title', mi.get('label'));
									} else {
										this.set('model', action.get('icon'));
										this.set('title', action.get('label'));
									}
									this.set('disabled', false);
								}.observes('validAction', 'disabledAction', 'object.actionMenuContext'),
								click: function () {
									if (!this.get('disabledAction') && this.get('validAction') && this.get('object.actionMenuContext')) {
										this.get('validAction.action').invoke(RSuite.Action.Context.create(this.get('finalMenuContext')));
									}
								},
								clickable: function () {
									return !this.get('disabledAction');
								}.property('disabledAction')
							})
						})
					]
				})
			});
		RSuite.component.WorkflowInspect.reopen({
			CommentsAndAttachments: RSuite.component.NavigableSection.Navigator.extend({
				icon: 'attachments',
				bodyView: C_A,
				tooltipBinding: 'RSuite.messageTable.workflow/inspect/comments-and-attachments/title',
				labelBinding: 'RSuite.messageTable.workflow/inspect/comments-and-attachments/title'
			}).create()
		});
		
		if (!RSuite.isPopup) {
			RSuite.component.WorkflowInspect.controller.reopen({
				taskChanged: function () {
					var task = this.get('task');
					if (task.get('loadState') === 'new') {
						task.load(true);
						var onLoad = function () { 
							Ember.removeObserver(task, 'loadState', task, onLoad); 
							// Dunno why the double-tap matters, but it seems to.
							setTimeout(function () {
								task.set('loadState', 'jiggling');
								setTimeout(function () {
									task.set('loadState', 'loaded');
								}, 125);
							}, 125);
						};
						Ember.addObserver(task, 'loadState', task, onLoad);
					}
				}.observes('task')
			});
		}
	}
}());
