(function () {
	var ZD = Ember.Object.create({
		present: false
	});
	$(function () {
		RSuite.model.session.done(function () {
			ZD.set('present', !!RSuite.model.serverConfig.plugins.find(function (plugin) {
				return plugin.name === 'rsuite-zip-downloader-plugin';
			}));
		});
	});
	var Attachments = RSuite.component.WorkflowInspect.AttachmentsView;
	var EditButton = RSuite.view.Icon.extend({
		ok: false,
		modelIfOK: 'edit',
		titleIfOk: "Edit",
		title: function () {
			return this.get('ok') ? this.get('titleIfOk') : '';
		}.property('ok', 'titleIfOk'),
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
							{ type: 'view', label: ' ' },
							{ type: 'download', label: ' ' },
							{ type: 'edit', label: ' ' },
							{ type: 'upload', label: ' ' },
							{ type: 'remove', label: ' ' }
						],
						getColumnView: function (column) {
							if (column.type === 'view') { return C_A.ViewButton; }
							if (column.type === 'download') { return C_A.DownloadButton; }
							if (column.type === 'edit') { return C_A.EditButtons; }
							if (column.type === 'upload') { return C_A.UploadButton; }
							return this._super(column);
						}
					})
				})
			}),
			ViewButton: RSuite.view.Icon.extend({
				ok: function () {
					var ot = this.get('rowView.object.finalManagedObject.objectType');
					if (ot === 'ca' || ot === 'canode') {
						return true;
					}
					return false;
				}.property('rowView.object.finalManagedObject.objectType'),
				title: function () {
					return this.get('ok') ? "Preview" : '';
				}.property('ok'),
				model: "preview",
				size: 24,
				click: function () {
					if (this.get('ok')) {
						RSuite.Action('rsuite:preview', { managedObject: this.get('rowView.object') });
					}
					return false;
				}
			}),
			DownloadButton: RSuite.view.Icon.extend({
				zipDownloader: ZD,
				mode: function () {
					var ot = this.get('rowView.object.finalManagedObject.objectType');
					if (ot === 'ca' || ot === 'canode') {
						return this.get('zipDownloader.present') ? 'ca' : undefined;
					}
					if (ot === 'mo' || ot === 'mononxml') {
						return 'mo';
					}
					return;
				}.property('rowView.object.finalManagedObject.objectType', 'zipDownloader.present'),
				title: function () {
					switch(this.get('mode')) {
						case 'mo': return "Download";
						case 'ca': return this.get('zipDownloader.present') ? 'Download as zip' : '';
					}
				}.property('mode'),
				model: function () {
					switch (this.get('mode')) {
						case 'mo': return "download";
						case 'ca': return this.get('zipDownloader.present') ? 'download_as_zip' : '';
					}
				}.property('mode', 'zipDownloader.present'),
				size: 24,
				click: function () {
					var manObj = this.get('rowView.object');
					switch (this.get('mode')) {
						case 'mo':
							RSuite.Action('rsuite:download', { managedObject: this.get('rowView.object') });
							break;
						case 'ca':
							if (!this.get('zipDownloader.present')) {
								break;
							}
							RSuite.Action("rsuite:invokeWebservice",{
								managedObject: manObj,
								propertyMap: {
									useTransport: "iframe",
									type: "get",
									timeout: 0,
									remoteApiName: "rsuite.downloadAsZip"
								}
							});
							break;
					}
					return false;
				}
			}),
			WebEditButton: EditButton.extend({
				titleIfOk: "Edit XML with Oxygen Web Editor",
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
				modelIfOK: function () {
					return RSuite.Action.get(this.actionSpec.actionName).icon;
				}.property(),
				size: 16,
				actionSpec: {
					actionName: 'oxygen:editOxygen'
				},
				ok: function () {
					return RSuite.Action.get('oxygen:editOxygen');
				}.property('RSuite.model.session.key'),
				titleIfOk: "Edit with Oxygen (desktop)"
			}),
			UploadButton: RSuite.view.Icon.extend({
				mode: function () {
					var ot = this.get('rowView.object.finalManagedObject.objectType');
					if (ot === 'ca' || ot === 'canode') {
						return 'ca';
					}
					if (ot === 'mo' || ot === 'mononxml') {
						return 'mo';
					}
					return;
				}.property('rowView.object.finalManagedObject.objectType'),
				model: function () {
					switch (this.get('mode')) {
						case 'ca': return 'upload';
						case 'mo': return 'upload_new_version';
					}
				}.property('mode'),
				title: function () {
					switch(this.get('mode')) {
						case 'ca': return "Upload file";
						case 'mo': return 'Upload new version';
					}
				}.property('mode'),
				size: 24,
				click: function () {
					var manObj = this.get('rowView.object');
					switch (this.get('mode')) {
						case 'mo':
							RSuite.Action('rsuite:replace', { managedObject: manObj });
							break;
						case 'ca':
							RSuite.Action('rsuite:uploadFiles', { managedObject: manObj });
							break;
					}
					return false;
				}
			})
		});
	C_A.EditButtons = Ember.CollectionView.extend({
		classNames: 'edit-buttons',
		childViews: [ C_A.WebEditButton, C_A.DeskEditButton ]
	});
	RSuite.component.WorkflowInspect.reopen({
		CommentsAndAttachments: RSuite.component.NavigableSection.Navigator.extend({
			icon: 'attachments',
			bodyView: C_A,
			tooltipBinding: 'RSuite.messageTable.workflow/inspect/comments-and-attachments/title',
			labelBinding: 'RSuite.messageTable.workflow/inspect/comments-and-attachments/title'
		}).create()
	});
}());
