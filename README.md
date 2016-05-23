RSuite Contributor
------------------

Simple plugin for creating a role-based contributing author/editor page, with
little access to the wider world of RSuite functionality.

Requirements:

This should be developed as a demo plugin, and not expected to last as "real code". We should avoid worrying about the engineering design and implementation details and instead focus on user experience.

Contributor experience should be a pared down workflow page:

1. ~~Use the "Contributor" role to determine whether the user gets the Contributor experience ~~
1. ~~All top navigation components should be removed except the RSuite logo and the user name/user menu.~~
1. ~~Only the workflow page should be present (no Contents, Reports, or Dashboard page)~~
1. ~~Workflow search form should be removed. (In future version can add this back in with limited set of fields.)~~
1. ~~Workflow "browse" should include all the preconfigured searches except All Active Tasks~~
1. ~~Workflow sidebar menu should not be present~~
1. ~~Workflow results should include these columns~~
	* ~~Line Number~~
	* ~~Content Title~~
	* ~~Task Name~~
	* ~~Task Description~~
	* ~~Priority~~
	* ~~Start~~
	* ~~Due~~
	* ~~Completed~~
1. ~~Workflow results should NOT include workflow name, ids, the menu gear, or the assignee~~
1. The Inspect panel should not contain the following:
	* ~~Task summary view~~
	* ~~Workflow summary view~~

Key changes for more intuitive UI for less expert users:

1. ~~Each workflow results should include a "Complete Task" button. Clicking it should do the same thing as clicking the Complete Task button in Inspect.~~
1. It should be possible to interact with attachments through workflow results. However, the features are not exactly the same as for Inspect.
	* ~~The user should be able to remove an attachment.~~
	* The user should be able to upload a new attachment from the file system.
	* The user should be able to upload a new version of an attachment from the file system.
	* The user should NOT be able to create a new attachment by attaching existing RSuite objects to the task
	* The user should be able to download an attachment
	* The user should be able to edit an attachment if it is an XML MO; for the initial spike, this will mean launching the oXygen WebApp editor


