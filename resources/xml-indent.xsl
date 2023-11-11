<?xml version="1.0" encoding="utf-8"?>

<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
  xmlns:t="http://www.tei-c.org/ns/1.0"
  exclude-result-prefixes="t">

  <xsl:output
    omit-xml-declaration="yes"
    indent="yes"
    encoding="utf-8"/>

  <xsl:strip-space elements="t:body t:div t:front t:text"/>

  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
