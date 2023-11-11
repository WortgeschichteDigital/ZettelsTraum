<?xml version="1.0" encoding="utf-8"?>

<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
  xmlns:t="http://www.tei-c.org/ns/1.0"
  exclude-result-prefixes="t"
  xpath-default-namespace="http://www.tei-c.org/ns/1.0">

<xsl:output
  method="html" media-type="text/html"
  indent="no"
  encoding="utf-8"/>

<!--
  available variables:
    $teiType = "" | dingler | dta | wdb
-->

<xsl:template match="t:TEI/t:text">
  <xsl:apply-templates/>
</xsl:template>

<xsl:template match="t:fw|t:index|t:teiHeader"/>

<xsl:template match="t:cb|t:pb">
  <xsl:text>[:</xsl:text>
    <xsl:choose>
      <xsl:when test="@n">
        <xsl:value-of select="@n"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:text>?</xsl:text>
      </xsl:otherwise>
    </xsl:choose>
  <xsl:text>:]</xsl:text>
</xsl:template>

<xsl:template match="t:byline|t:closer|t:dateline|t:div|t:item|t:lg|t:sp|t:titlePage">
  <div>
    <xsl:apply-templates/>
  </div>
</xsl:template>

<xsl:template match="t:choice">
  <xsl:choose>
    <xsl:when test="$teiType = 'dta'">
      <xsl:apply-templates select="t:abbr|t:corr|t:orig"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:apply-templates select="./*[1]"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="t:ex">
  <xsl:text>[</xsl:text>
    <xsl:apply-templates/>
  <xsl:text>]</xsl:text>
</xsl:template>

<xsl:template match="t:head">
  <div>
    <b>
      <xsl:apply-templates/>
    </b>
  </div>
</xsl:template>

<xsl:template match="t:hi">
  <xsl:variable name="notEmpty" select="./node()"/>
  <xsl:if test="$notEmpty">
    <xsl:choose>
      <xsl:when test="@rend or @rendition">
        <xsl:variable name="currentRendition" select="@rend | @rendition"/>
        <xsl:variable name="renditionHeader">
          <xsl:value-of select="//t:tagsDecl/t:rendition[@xml:id = substring($currentRendition, 2)]"/>
        </xsl:variable>
        <span>
          <xsl:attribute name="data-rendition">
            <xsl:choose>
              <xsl:when test="$teiType = 'dingler' or $teiType = 'dta'">
                <xsl:value-of select="$currentRendition"/>
              </xsl:when>
              <xsl:when test="$renditionHeader != ''">
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

<xsl:template match="t:l">
  <xsl:apply-templates/>
  <br/>
</xsl:template>

<xsl:template match="t:lb">
  <xsl:text> </xsl:text>
</xsl:template>

<xsl:template match="t:note">
  <xsl:variable name="notEmpty" select="./node()"/>
  <xsl:if test="not(@type = 'editorial') and not(@resp) and $notEmpty">
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

<xsl:template match="t:p">
  <xsl:choose>
    <xsl:when test="name(parent::*/*[1]) = 'speaker' and parent::*/*[2] = .">
      <xsl:text> </xsl:text>
      <xsl:apply-templates/>
    </xsl:when>
    <xsl:otherwise>
      <div>
        <xsl:apply-templates/>
      </div>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="t:speaker">
  <b>
    <xsl:apply-templates/>
  </b>
</xsl:template>

<xsl:template match="t:stage">
  <xsl:choose>
    <xsl:when test="(name(parent::*/*[1]) = 'speaker' and parent::*/*[2] = .) or name(parent::*) = 'p'">
      <xsl:text> </xsl:text>
      <i>
        <xsl:apply-templates/>
      </i>
    </xsl:when>
    <xsl:otherwise>
      <div>
        <i>
          <xsl:apply-templates/>
        </i>
      </div>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="t:titlePart">
  <xsl:if test="@type != 'column'">
    <div>
      <b>
        <xsl:choose>
          <xsl:when test="@type = 'main'">
            <span class="tei-groesser">
              <xsl:apply-templates/>
            </span>
          </xsl:when>
          <xsl:otherwise>
            <xsl:apply-templates/>
          </xsl:otherwise>
        </xsl:choose>
      </b>
    </div>
  </xsl:if>
</xsl:template>

</xsl:stylesheet>
