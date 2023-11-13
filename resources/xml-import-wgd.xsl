<?xml version="1.0" encoding="utf-8"?>

<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

<xsl:output
  method="html" media-type="text/html"
  indent="no"
  encoding="utf-8"/>

<xsl:template match="Belegtext">
  <xsl:apply-templates/>
</xsl:template>

<xsl:template match="Fundstelle|Stichwort"/>

<xsl:template match="Absatz">
  <div>
    <xsl:apply-templates/>
  </div>
</xsl:template>

<xsl:template match="Autorenzusatz">
  <span class="klammer-autorenzusatz">
    <xsl:apply-templates/>
  </span>
</xsl:template>

<xsl:template match="Hervorhebung">
  <xsl:variable name="tags" select="'#b #i #s #sub #sup #u'"/>
  <xsl:choose>
    <xsl:when test="contains($tags, @Stil)">
      <xsl:variable name="tag">
        <xsl:call-template name="replace-string">
          <xsl:with-param name="text" select="@Stil"/>
          <xsl:with-param name="replace" select="'#'"/>
          <xsl:with-param name="with" select="''"/>
        </xsl:call-template>
      </xsl:variable>
      <xsl:element name="{$tag}">
        <xsl:apply-templates/>
      </xsl:element>
    </xsl:when>
    <xsl:when test="@Stil = '#singleMarks'">
      <xsl:apply-templates/>
    </xsl:when>
    <xsl:when test="@Stil = '#smaller'">
      <small>
        <xsl:apply-templates/>
      </small>
    </xsl:when>
    <xsl:otherwise>
      <span>
        <xsl:attribute name="data-rendition">
          <xsl:value-of select="@Stil"/>
        </xsl:attribute>
        <xsl:apply-templates/>
      </span>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="Loeschung">
  <span class="klammer-loeschung">
    <xsl:apply-templates/>
  </span>
</xsl:template>

<xsl:template match="Markierung">
  <mark class="user">
    <xsl:apply-templates/>
  </mark>
</xsl:template>

<xsl:template match="Streichung">
  <span class="klammer-streichung">
    <xsl:apply-templates/>
  </span>
</xsl:template>

<xsl:template match="Vers">
  <xsl:apply-templates/>
  <br/>
</xsl:template>

<xsl:template match="Zeilenumbruch">
  <br/>
</xsl:template>

<xsl:template name="replace-string">
  <xsl:param name="text"/>
  <xsl:param name="replace"/>
  <xsl:param name="with"/>
  <xsl:choose>
    <xsl:when test="contains($text, $replace)">
      <xsl:value-of select="substring-before($text, $replace)"/>
      <xsl:value-of select="$with"/>
      <xsl:call-template name="replace-string">
        <xsl:with-param name="text" select="substring-after($text, $replace)"/>
        <xsl:with-param name="replace" select="$replace"/>
        <xsl:with-param name="with" select="$with"/>
      </xsl:call-template>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$text"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

</xsl:stylesheet>
