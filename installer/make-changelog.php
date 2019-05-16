<?php
$maintainer = [
	"Nico Dorn" => "ndorn@gwdg.de",
];

$wochentag = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

$format = "deb";
if (isset($argv[1]) && $argv[1] == "rpm") {
	$format = $argv[1];
}

$outdir = "../../build";
if (isset($argv[2])) {
	$outdir = $argv[2];
}
if (!file_exists($outdir)) {
	die("\nFEHLER!\nVerzeichnis $outdir nicht gefunden.");
}

$html_file = "../win/changelog.html";
if (!file_exists($html_file)) {
	die("\nFEHLER!\n$html_file nicht gefunden.");
}

// Changelog erstellen
$cl = "";
$html = file($html_file);
for ($i = 0; $i < count($html); $i++) {
	if (preg_match('/<h2/', $html[$i])) {
		// Version und Datum ermitteln
		preg_match('/data-maintainer="(.+?)"/', $html[$i], $m);
		preg_match('/Version (.+?)</', $html[$i], $v);
		preg_match('/datetime="(.+?)"/', $html[$i], $d);
		$datum = new DateTime($d[1]);
		// Eintrag zusammenbauen
		if ($format == "deb") {
			$datum_cl = $wochentag[$datum -> format("w")] . ", " . $datum -> format("d M Y H:i:s P");
			$cl_tmp = "zettelstraum (" . $v[1] . ") whatever; urgency=medium";
			$cl_tmp .= "\n\n";
			$cl_tmp .= "  * neue Version von \"Zettel’s Traum\"; Hilfe > Changelog für Details";
			$cl_tmp .= "\n\n";
			$cl_tmp .= " -- " . $m[1] . " <" . $maintainer[$m[1]] . ">  " . $datum_cl . "\n";
		} else if ($format == "rpm") {
			$datum_cl = $wochentag[$datum -> format("w")] . " " . $datum -> format("M d Y");
			$cl_tmp = "* " . $datum_cl . " " . $m[1] . " <" . $maintainer[$m[1]] . "> - " . $v[1] . "\n";
			$cl_tmp .= "- neue Version von \"Zettel’s Traum\"; Hilfe > Changelog für Details\n";
		}
		// zum Changelog hinzufügen
		if (!empty($cl)) {
			$cl .= "\n";
		}
		$cl .= $cl_tmp;
	}
}

// Changelog auswerfen
$datei = fopen("$outdir/changelog", "w");
fwrite($datei, $cl);
fclose($datei);

// ggf. Rückmeldung
if (!isset($argv[3]) || $argv[3] !== "silent") {
	echo "Changelog erstellt.\n";
}
?>
