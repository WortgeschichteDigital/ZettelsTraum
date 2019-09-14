<?php
$maintainerMail = [
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
$maintainer = [];
if (file_exists("maintainer.json")) {
	$maintainer = json_decode(file_get_contents("maintainer.json"), JSON_OBJECT_AS_ARRAY);
}
$cl = "";
$html = file($html_file);
for ($i = 0; $i < count($html); $i++) {
	if (preg_match('/<h2/', $html[$i])) {
		// Version und Datum ermitteln
		preg_match('/Version (.+?)</', $html[$i], $v);
		preg_match('/datetime="(.+?)"/', $html[$i], $d);
		$datum = new DateTime($d[1]);
		// Maintainer und Adresse ermitteln
		$m = "N. N.";
		$mMail = "adresse@unbekannt.de";
		if (isset($maintainer[$v[1]])) {
			$m = $maintainer[$v[1]];
			if (isset($maintainerMail[$m])) {
				$mMail = $maintainerMail[$m];
			}
		}
		// Eintrag zusammenbauen
		if ($format == "deb") {
			$datum_cl = $wochentag[$datum -> format("w")] . ", " . $datum -> format("d M Y H:i:s P");
			$cl_tmp = "zettelstraum (" . $v[1] . ") whatever; urgency=medium";
			$cl_tmp .= "\n\n";
			$cl_tmp .= "  * neue Version von \"Zettel’s Traum\"; Hilfe > Changelog für Details";
			$cl_tmp .= "\n\n";
			$cl_tmp .= " -- " . $m . " <" . $mMail . ">  " . $datum_cl . "\n";
		} else if ($format == "rpm") {
			$datum_cl = $wochentag[$datum -> format("w")] . " " . $datum -> format("M d Y");
			$cl_tmp = "* " . $datum_cl . " " . $m . " <" . $mMail . "> - " . $v[1] . "\n";
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
