<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                version="2.0"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:r="http://www.rsuitecms.com/rsuite/ns/metadata"
                exclude-result-prefixes="r" >
	<xsl:param name="rsuite.managedObjectId" select="'{undefined}'"/>
	<xsl:output method="html"
	            doctype-public="XSLT-compat"
	            omit-xml-declaration="yes"
	            encoding="UTF-8"
	            indent="yes"
	/>
	<xsl:template match="/">
		<html>
			<head>
				<meta charset="utf-8" />
				<title>RSI Test Transform</title>
				<meta data-context-path="/rsuite-cms/" />
				<script src="/rsuite-cms/rsuite.js"></script>
				<link type="text/css"
				      rel="stylesheet/less"
				      href="/rsuite/rest/v2/stylesheets?contextPath=/rsuite-cms"
				/>
				<script src="/rsuite-cms/scripts/lib/less-1.5.1.js"></script>
			</head>
			<body>
				Same as the static page, except that, as XSL, we have the ability to pass in some request-specific data.
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
