<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
  xmlns:z="http://www.zdl.org/ns/1.0"
  exclude-result-prefixes="z"
  xpath-default-namespace="http://www.zdl.org/ns/1.0">

<xsl:output
  method="html" media-type="text/html"
  indent="no"
  encoding="UTF-8"/>

<!-- P A G E -->
<xsl:template match="z:WGD">
<html lang="de">
  <head>
    <title>Wortgeschichte</title>
  </head>
  <body>

  <!-- Lemmas -->
  <section id="wgd-lemmas">
    <xsl:for-each select="//z:Lemma[@Typ = 'Hauptlemma']">
      <xsl:if test="position() > 1">
        <xsl:text>|</xsl:text>
      </xsl:if>
      <xsl:variable name="text">
        <xsl:for-each select="z:Schreibung">
          <xsl:if test="position() > 1">
            <xsl:text>/</xsl:text>
          </xsl:if>
          <xsl:call-template name="hidx">
            <xsl:with-param name="schreibung" select="current()"/>
          </xsl:call-template>
          <xsl:value-of select="current()"/>
        </xsl:for-each>
      </xsl:variable>
      <xsl:value-of select="$text"/>
    </xsl:for-each>
  </section>

  <!-- Quotations -->
  <section id="wgd-belegauswahl">
    <xsl:apply-templates select="//z:Belegreihe"/>
  </section>

  <!-- Meanings -->
  <section id="wgd-lesarten">
    <xsl:call-template name="bedeutungsgeruest"/>
  </section>

  </body>
</html>
</xsl:template>
<!-- // P A G E -->

<!-- Q U O T A T I O N S -->
<xsl:template match="z:Belegreihe">
  <xsl:for-each select="z:Beleg">
    <div>
      <xsl:attribute name="id">
        <xsl:value-of select="@xml:id"/>
      </xsl:attribute>
      <xsl:if test="z:Bedeutungen">
        <span class="wgd-bedeutungen">
          <xsl:for-each select="z:Bedeutungen/z:Bedeutung">
            <xsl:if test="position() > 1">
              <xsl:text>|</xsl:text>
            </xsl:if>
            <xsl:value-of select="current()"/>
          </xsl:for-each>
        </span>
      </xsl:if>
      <xsl:call-template name="belegdatum"/>
      <xsl:apply-templates select="z:Belegtext"/>
      <cite>
        <xsl:apply-templates select="z:Fundstelle"/>
      </cite>
    </div>
  </xsl:for-each>
</xsl:template>

<xsl:template name="belegdatum">
  <xsl:variable name="datum" select="z:Fundstelle/z:Datum"/>
  <time>
    <xsl:attribute name="datetime">
      <xsl:call-template name="belegdatum-get">
        <xsl:with-param name="datum" select="$datum"/>
      </xsl:call-template>
    </xsl:attribute>
    <xsl:apply-templates select="$datum"/>
    <xsl:call-template name="belegnummer-im-jahr">
      <xsl:with-param name="jahr" select="substring($datum, string-length($datum) - 3, 4)"/>
      <xsl:with-param name="beleg" select="current()"/>
    </xsl:call-template>
  </time>
</xsl:template>

<xsl:template name="belegdatum-get">
  <xsl:param name="datum"/>
  <xsl:choose>
    <xsl:when test="substring($datum, 3, 1) = '.'">
      <!-- day’s date (31.12.2020) -->
      <xsl:value-of select="substring($datum, 7, 4)"/>
      <xsl:text>-</xsl:text>
      <xsl:value-of select="substring($datum, 4, 2)"/>
      <xsl:text>-</xsl:text>
      <xsl:value-of select="substring($datum, 1, 2)"/>
    </xsl:when>
    <xsl:when test="string-length($datum) = 2">
      <!-- century (19 => 1850) -->
      <xsl:value-of select="$datum - 1"/>
      <xsl:text>50</xsl:text>
    </xsl:when>
    <xsl:when test="substring($datum, 1, 4) = '0000' and substring($datum, 5, 1) = '-'">
      <!-- before year -->
      <xsl:value-of select="substring($datum, 6, 4)"/>
    </xsl:when>
    <xsl:when test="substring($datum, 6, 4) = '9999' and substring($datum, 5, 1) = '-'">
      <!-- after year -->
      <xsl:value-of select="substring($datum, 6, 4)"/>
    </xsl:when>
    <xsl:otherwise>
      <!-- year only -->
      <xsl:value-of select="substring($datum, 1, 4)"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="z:Datum">
  <xsl:choose>
    <!-- day’s date (31.12.2020) -->
    <xsl:when test="substring(., 3, 1) = '.'">
      <xsl:value-of select="substring(., 7, 4)"/>
    </xsl:when>
    <!-- before year -->
    <xsl:when test="substring(., 1, 4) = '0000' and substring(., 5, 1) = '-'">
      <xsl:text>vor </xsl:text>
      <xsl:value-of select="substring(., 6, 4)"/>
    </xsl:when>
    <!-- after year -->
    <xsl:when test="substring(., 6, 4) = '9999' and substring(., 5, 1) = '-'">
      <xsl:text>nach </xsl:text>
      <xsl:value-of select="substring(., 1, 4)"/>
    </xsl:when>
    <!-- year range (2019-2020) -->
    <xsl:when test="substring(., 5, 1) = '-'">
      <xsl:call-template name="replace-string">
        <xsl:with-param name="text" select="."/>
        <xsl:with-param name="replace" select="'-'"/>
        <xsl:with-param name="with" select="'–'"/>
      </xsl:call-template>
    </xsl:when>
    <!-- century (19 => 1801) -->
    <xsl:when test="string-length(.) = 2">
      <xsl:value-of select="."/>
      <xsl:text>.&#xA0;Jh.</xsl:text>
    </xsl:when>
    <!-- only year (2020) or year and following year (2019/20) -->
    <xsl:otherwise>
      <xsl:value-of select="."/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template name="belegnummer-im-jahr">
  <xsl:param name="jahr"/>
  <xsl:param name="beleg"/>
  <xsl:if test="string(number($jahr)) != 'NaN'">
    <xsl:variable name="same_year" select="//z:Belegreihe/z:Beleg[substring(z:Fundstelle/z:Datum, string-length(z:Fundstelle/z:Datum) - 3, 4) = $jahr]"/>
    <xsl:if test="count($same_year) > 1">
      <xsl:variable name="alphabet" select="'abcdefghijklmnopqrstuvwxyz'"/>
      <xsl:for-each select="$same_year">
        <xsl:if test="current() = $beleg">
          <sup>
            <xsl:value-of select="substring($alphabet, position(), 1)"/>
          </sup>
        </xsl:if>
      </xsl:for-each>
    </xsl:if>
  </xsl:if>
</xsl:template>

<xsl:template match="z:Belegtext">
  <blockquote>
    <xsl:for-each select="z:Absatz">
      <p>
        <xsl:apply-templates/>
      </p>
    </xsl:for-each>
  </blockquote>
</xsl:template>

<xsl:template match="z:Zeilenumbruch">
  <br/>
</xsl:template>
<!-- // Q U O T A T I O N S -->

<!-- M E A N I N G S -->
<xsl:template name="bedeutungsgeruest">
  <xsl:variable name="anzahlGerueste" select="count(//z:Lesarten)"/>
  <xsl:for-each select="//z:Lesarten">
    <ol>
      <xsl:attribute name="data-lemma">
        <xsl:if test="z:Lemma/z:Schreibung">
          <xsl:call-template name="hidx">
            <xsl:with-param name="schreibung" select="z:Lemma/z:Schreibung"/>
          </xsl:call-template>
          <xsl:value-of select="z:Lemma/z:Schreibung"/>
        </xsl:if>
      </xsl:attribute>
      <xsl:apply-templates select="z:Lesart"/>
    </ol>
  </xsl:for-each>
</xsl:template>

<xsl:template match="z:Lesart">
  <li>
    <xsl:attribute name="id">
      <xsl:value-of select="@xml:id"/>
    </xsl:attribute>
    <xsl:attribute name="data-meaning">
      <xsl:choose>
        <xsl:when test="@ID">
          <xsl:value-of select="@ID"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="@xml:id"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:attribute>
    <xsl:if test="z:Alias/text()">
      <xsl:attribute name="data-alias">
        <xsl:value-of select="z:Alias"/>
      </xsl:attribute>
    </xsl:if>
    <div class="wgd-meaning">
      <span class="wgd-zaehlz">
        <xsl:value-of select="@n"/>
      </span>
      <xsl:call-template name="lesart"/>
    </div>
    <xsl:if test="z:Lesart">
      <ol>
        <xsl:apply-templates select="z:Lesart"/>
      </ol>
    </xsl:if>
  </li>
</xsl:template>

<xsl:template name="lesart">
  <xsl:for-each select="node()[not(self::z:Lesart)]">
    <xsl:choose>
      <!-- remove leading whitespace -->
      <xsl:when test="self::text() and normalize-space(current()) = '' and
        (position() = 1 or
        preceding-sibling::*[1][self::z:Alias] or
        preceding-sibling::*[1][self::z:Diasystematik] and (position() &lt;= 3 or position() &lt;= 6) or
        preceding-sibling::*[1][self::z:Textreferenz])">
        <xsl:value-of select="normalize-space(current())"/>
      </xsl:when>
      <!-- in case the item starts with context information -->
      <xsl:when test="self::text() and normalize-space(current()) != '' and
        (preceding-sibling::*[1][self::z:Alias] or
        preceding-sibling::*[1][self::z:Diasystematik] and (position() &lt;= 3 or position() &lt;= 6) or
        preceding-sibling::*[1][self::z:Textreferenz])">
        <xsl:call-template name="left-trim">
          <xsl:with-param name="string" select="current()"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:if test="name() != 'Diasystematik'">
          <xsl:apply-templates select="current()"/>
        </xsl:if>
        <xsl:if test="name() = 'Diasystematik' and current() != ancestor::z:Lesart[1]/z:Diasystematik[1]">
          <xsl:value-of select="current()"/>
        </xsl:if>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:for-each>
</xsl:template>

<xsl:template match="z:Alias"/>
<!-- // M E A N I N G S -->

<!-- E L E M E N T S -->
<!-- Fundstelle -->
<xsl:template match="z:Fundstelle">
  <xsl:if test="z:unstrukturiert">
    <xsl:apply-templates select="z:unstrukturiert"/>
    <xsl:choose>
      <xsl:when test="not(ancestor::z:Belegreihe)"/>
      <xsl:when test="z:Fundort = 'DWDS' or z:Fundort = 'DWDSi' or z:Fundort = 'IDS' or (z:Fundort = 'DTA' and not(z:URL))">
        <xsl:text> </xsl:text>
        <span>
          <xsl:text>[</xsl:text>
          <xsl:value-of select="z:Fundort"/>
          <xsl:text>]</xsl:text>
        </span>
      </xsl:when>
    </xsl:choose>
  </xsl:if>
</xsl:template>

<!-- Abkürzung -->
<xsl:template match="z:Abkuerzung">
  <abbr>
    <xsl:attribute name="title">
      <xsl:value-of select="@Expansion"/>
    </xsl:attribute>
    <xsl:apply-templates/>
  </abbr>
</xsl:template>

<!-- Autorenzusatz -->
<xsl:template match="z:Autorenzusatz">
  <span class="wgd-autorenzusatz">
    <xsl:text>[</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>]</xsl:text>
  </span>
</xsl:template>

<!-- erwähntes Zeichen -->
<xsl:template match="z:erwaehntes_Zeichen">
  <i class="wgd-ez">
    <xsl:apply-templates/>
  </i>
</xsl:template>

<!-- Hervorhebung -->
<xsl:template match="z:Hervorhebung">
  <xsl:variable name="tags" select="'#b #i #s #sub #sup #u'"/>
  <xsl:choose>
    <!-- @Stil is missing (@Sprache only) -->
    <xsl:when test="not(@Stil)">
      <xsl:apply-templates/>
    </xsl:when>
    <!-- convert @Stil into tag -->
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
    <!-- exception: single marks -->
    <xsl:when test="@Stil = '#singleMarks'">
      <q class="wgd-einfache">
        <xsl:apply-templates/>
      </q>
    </xsl:when>
    <!-- exception: <small> -->
    <xsl:when test="@Stil = '#smaller'">
      <small>
        <xsl:apply-templates/>
      </small>
    </xsl:when>
    <!-- further styles -->
    <xsl:otherwise>
      <span>
        <xsl:attribute name="class">
          <xsl:call-template name="replace-string">
            <xsl:with-param name="text" select="@Stil"/>
            <xsl:with-param name="replace" select="'#'"/>
            <xsl:with-param name="with" select="'wgd-hi-'"/>
          </xsl:call-template>
        </xsl:attribute>
        <xsl:apply-templates/>
      </span>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<!-- Löschung -->
<xsl:template match="z:Loeschung">
  <xsl:text>[…]</xsl:text>
</xsl:template>

<!-- Markierung -->
<xsl:template match="z:Markierung">
  <i class="wgd-mark">
    <xsl:apply-templates/>
  </i>
</xsl:template>

<!-- Paraphrase -->
<xsl:template match="z:Paraphrase">
  <q class="wgd-paraphrase">
    <xsl:apply-templates/>
  </q>
</xsl:template>

<!-- sogenannt -->
<xsl:template match="z:sogenannt">
  <q class="wgd-distanzierung">
    <xsl:apply-templates/>
  </q>
</xsl:template>

<!-- Stichwort -->
<xsl:template match="z:Stichwort">
  <i class="wgd-stichwort">
    <xsl:apply-templates/>
  </i>
</xsl:template>

<!-- Streichung -->
<xsl:template match="z:Streichung">
  <span class="wgd-streichung">
    <xsl:text>[…]</xsl:text>
    <xsl:if test="name(following-sibling::*) = 'Vers'">
      <br/>
    </xsl:if>
  </span>
</xsl:template>

<!-- Vers -->
<xsl:template match="z:Vers">
  <span class="wgd-verse">
    <xsl:apply-templates/>
  </span><br/>
</xsl:template>
<!-- // E L E M E N T S -->

<!-- M I S C E L L A N E O U S -->
<!-- homograph numbering -->
<xsl:template name="hidx">
  <xsl:param name="schreibung"/>
  <xsl:variable name="super" select="'¹²³⁴⁵⁶⁷⁸⁹'"/>
  <xsl:variable name="hidx" select="$schreibung/@hidx"/>
  <xsl:if test="$hidx">
    <xsl:value-of select="substring($super, $hidx, 1)"/>
  </xsl:if>
</xsl:template>

<!-- replacer -->
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

<!-- left trim (https://stackoverflow.com/a/1859953) -->
<xsl:template name="left-trim">
  <xsl:param name="string" select="''"/>
  <xsl:variable name="tmp" select="substring($string, 1, 1)"/>
  <xsl:choose>
    <xsl:when test="$tmp = ' ' or $tmp = '&#xA;'">
      <xsl:call-template name="left-trim">
        <xsl:with-param name="string" select="substring-after($string, $tmp)"/>
      </xsl:call-template>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$string"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>
<!-- // M I S C E L L A N E O U S -->

</xsl:stylesheet>
