(function () {
	var forbiddenWfColumns = {
			"workflowInstance.id": true,
			"workflowInstance.workflowDefinitionName": true,
			"currentTask.id": true,
			"currentTask.assigneeUserId": true,
			'currentTask.endDate': true
		},
		forbiddenWfSearches = {
			'rsuite:all-tasks': true
		};
	window.Contributor = Workflow.constructor.extend({}).create();
	Contributor.Activity =  RSuite.Tab.Workflow.extend()
		.named("Contributor.Activity")
		.reopenClass({
			Controller: RSuite.Tab.Workflow.Controller.extend()
				.named("Contributor.Activity.Controller")
				.reopenClass({
					navigators: {
						Browse: RSuite.Tab.Workflow.Controller.navigators.Browse.extend({
							bodyView: RSuite.Tab.Workflow.TaskBrowse.extend({
								modelBinding: null,
								model: function () {
									var browseModel = this.get('controller.browseModel');
									//Copy constructor
									browseModel = browseModel.constructor.create(browseModel.toJSON());
									browseModel.reopen({
										standardSearches: browseModel.standardSearches.filter(function (search) {
											return !forbiddenWfSearches[search.code];
										})
									});
									return browseModel;
								}.property('controller.browseModel', 'controller.browseModel.loadState')
							})
						})
					},
					viewers: {
						Table: RSuite.Tab.Workflow.Controller.viewers.Table.extend({
							ListView: RSuite.Tab.Workflow.Controller.viewers.Table.proto().ListView.extend({
								// Removes the itemNumber and actionMenu columns
								leadingColumns: [
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
							this.set('browseModel', RSuite.model.tasks.BrowseList.load());
						}
					}.on('init').observes('RSuite.model.session.key'),
					contentColumns: function () {
						var cols = this.get('resultSet.config.columns') || [];
						cols = cols.filter(function (column) {
							//Remove columns: workflow name, ids, assignee
							return !forbiddenWfColumns[column.name];
						});
						return cols;
					}.property('resultSet.config.columns'),
					getColumnView: function (column) {
						if (column.type === 'completeTask') {
							return Contributor.CompleteTaskView;
						}
						return this._super.apply(this, arguments);
					}
				})
		});
	Contributor.CompleteTaskView = Ember.ContainerView.extend({
		childViews: [],
		OneTransitionView: RSuite.component.UiButton.extend({
			classNames: ['task-button'],
			iconBinding: 'parentView.oneTransition.icon',
			click: function () {
				RSuite.Action('rsuite:advanceTask', { task: this.get('parentView.task') });
			},
			labelBinding: 'parentView.oneTransition.label'
		}),
		TransitionsMenuView: RSuite.component.MenuButton.extend({
			classNames: ['task-button' ],
			modelBinding: 'parentView.transitions',
			labelBinding: 'messages.complete',
			messagePaths: {
				complete: "workflow/inspect/summary/actions/complete"
			},
			icon: 'dialog_success'
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
			var repl = Math.min(1, this.get('childViews.length')),
				xct = this.get('transitions.length');
			if (xct > 1) {
				this.replace(0, repl, [ this.createChildView(this.TransitionsMenuView, {}) ]);
			} else if (xct <= 1) {
				this.replace(0, repl, [ this.createChildView(this.OneTransitionView, {}) ]);
			} else {
				this.replace(0, repl, [ ]);
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
}());
RSuite.Action({
	id: 'rsuite:contributor:uploadAndAttach',
	invoke: function () {
		debugger
	}
});
