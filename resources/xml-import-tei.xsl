<?xml version="1.0" encoding="utf-8"?>

<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

<xsl:output
  method="html" media-type="text/html"
  indent="no"
  encoding="utf-8"/>

<!--
  available variables:
    $teiType = "" | "dtabf"
-->

<xsl:template match="TEI/text">
  <xsl:apply-templates/>
</xsl:template>

<xsl:template match="fw|teiHeader"/>

<xsl:template match="cb|pb">
  <xsl:if test="@n">
    <xsl:text>[:</xsl:text>
    <xsl:value-of select="@n"/>
    <xsl:text>:]</xsl:text>
  </xsl:if>
</xsl:template>

<xsl:template match="byline|closer|dateline|head|item|lg|sp|titlePage">
  <p>
    <xsl:apply-templates/>
  </p>
</xsl:template>

<xsl:template match="choice">
  <xsl:choose>
    <xsl:when test="$teiType = 'dtabf'">
      <xsl:apply-templates select="abbr|corr|orig"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:apply-templates select="./*[1]"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="hi">
  <xsl:variable name="notEmpty" select="./node()"/>
  <xsl:if test="$notEmpty">
    <xsl:choose>
      <xsl:when test="@rend or @rendition">
        <xsl:variable name="currentRendition" select="@rend | @rendition"/>
        <xsl:variable name="renditionHeader">
          <xsl:value-of select="//tagsDecl/rendition[@xml:id = substring($currentRendition, 2)]"/>
        </xsl:variable>
        <span>
          <xsl:attribute name="data-rendition">
            <xsl:choose>
              <xsl:when test="$teiType = 'dtabf'">
                <xsl:value-of select="$currentRendition"/>
              </xsl:when>
              <xsl:when test="$renditionHeader">
                <xsl:value-of select="$renditionHeader"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$currentRendition"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:apply-templates/>
        </span>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:if>
</xsl:template>

<xsl:template match="l">
  <xsl:apply-templates/>
  <br/>
</xsl:template>

<xsl:template match="lb">
  <xsl:text> </xsl:text>
</xsl:template>

<xsl:template match="note">
  <xsl:if test="not(@type = 'editorial')">
    <xsl:text>[Anmerkung</xsl:text>
    <xsl:if test="@n">
      <xsl:text> </xsl:text>
      <xsl:value-of select="@n"/>
    </xsl:if>
    <xsl:text>: </xsl:text>
    <xsl:apply-templates/>
    <xsl:text>/Anmerkung] </xsl:text>
  </xsl:if>
</xsl:template>

<xsl:template match="p">
  <xsl:choose>
    <xsl:when test="ancestor::sp">
      <xsl:text> </xsl:text>
      <xsl:apply-templates/>
    </xsl:when>
    <xsl:otherwise>
      <p>
        <xsl:apply-templates/>
      </p>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="speaker">
  <b>
    <xsl:apply-templates/>
  </b>
</xsl:template>

</xsl:stylesheet>
