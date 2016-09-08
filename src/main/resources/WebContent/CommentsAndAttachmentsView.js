(function () {
	var Attachments = RSuite.component.WorkflowInspect.AttachmentsView;
	var EditButton = RSuite.view.Icon.extend({
		ok: false,
		modelIfOK: 'edit',
		actionSpec: {},
		editable: function () {
			return this.get('parentView.rowView.object.finalManagedObject.objectType') === 'mo';
		}.property('parentView.rowView.object.finalManagedObject.objectType'),
		model: function () {
			var s = this.get('actionSpec');
			if (!this.get('ok') || !this.get('editable') || !s.actionName) {
				return 'blank';
			}
			return this.get('modelIfOK');
		}.property('parentView.rowView.object.finalManagedObject.objectType', 'actionSpec'),
		size: 24,
		mousedown: function (e) {
			return false;
		},
		click: function (e) {
			var s = this.get('actionSpec');
			if (!this.get('editable') || !this.get('ok') || !s.actionName) { return; }
			var context = Object.assign({}, s.context || {}, { managedObject: this.get('parentView.rowView.object') });
			console.log(context);
			RSuite.Action(s.actionName, context);
			return false;
		},
		title: "Edit",
	});
	var C_A = Ember.ContainerView.extend()
		.named('RSuite.component.WorkflowInspect.CommentsAndAttachmentsView')
		.reopen({
			childViews: [ 'attachmentsView', 'commentsView' ],
			commentsView: function () { return this.createChildView(this.constructor.CommentsView); }.property(),
			attachmentsView: function () {
				return this.createChildView(this.constructor.AttachmentsView);
			}.property()
		})
		.reopenClass({
			CommentsView: RSuite.component.WorkflowInspect.CommentsView,
			AttachmentsView: Attachments.extend({
				bodyView: Attachments.proto().bodyView.extend({
					TaskManagedObjectsView: Attachments.proto().bodyView.proto().TaskManagedObjectsView.extend({
						rowClick: function () {},
						columnsBinding: null,
						columns: Contributor.contentColumns,
						leadingColumns: [],
						trailingColumns: [
							{ type: 'edit', label: ' ' },
							{ type: 'upload', label: ' ' },
							{ type: 'remove', label: ' ' }
						],
						getColumnView: function (column) {
							if (column.type === 'edit') { return C_A.EditButtons; }
							if (column.type === 'upload') { return C_A.UploadButton; }
							return this._super(column);
						}
					})
				})
			}),
			WebEditButton: EditButton.extend({
				title: "Edit XML with Oxygen Web Editor",
				actionSpec: {
					actionName: 'rsuite:invokeWebservice',
					context: {
						propertyMap: {
							remoteApiName: 'rsuite-oxygen-webeditor-plugin.EditXML',
							useTransport: 'window'
						}
					}
				},
				ok: function () {
					return !!RSuite.model.serverConfig.plugins.find(function (plugin) { return plugin.name === "rsuite-oxygen-webeditor-plugin" });
				}.property('RSuite.model.session.key'),
			}),
			DeskEditButton: EditButton.extend({
				title: "Edit with Oxygen (desktop)",
				modelIfOK: function () {
					return RSuite.Action.get(this.actionSpec.actionName).icon;
				}.property(),
				size: 16,
				actionSpec: {
					actionName: 'oxygen:editOxygen'
				},
				ok: function () {
					return RSuite.Action.get('oxygen:editOxygen');
				}.property('RSuite.model.session.key')
			}),
			UploadButton: RSuite.view.Icon.extend({
				model:function () {
					var ot = this.get('rowView.object.finalManagedObject.objectType');
					if (ot !== 'mo' && ot !== 'mononxml') {
						return 'blank';
					}
					return 'upload_new_version';
				}.property('rowView.object.finalManagedObject.objectType', 'actionSpec'),
				size: 24,
				click: function () {
					RSuite.Action('rsuite:replace', { managedObject: this.get('rowView.object') });
					return false;
				}
			})
		});
	C_A.EditButtons = Ember.CollectionView.extend({ childViews: [ C_A.WebEditButton, C_A.DeskEditButton ] });
	RSuite.component.WorkflowInspect.reopen({
		CommentsAndAttachments: RSuite.component.NavigableSection.Navigator.extend({
			icon: 'attachments',
			bodyView: C_A,
			tooltipBinding: 'RSuite.messageTable.workflow/inspect/comments-and-attachments/title',
			labelBinding: 'RSuite.messageTable.workflow/inspect/comments-and-attachments/title'
		}).create()
	});
}());
