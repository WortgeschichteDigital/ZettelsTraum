<?php
$maintainerMail = [
	"Nico Dorn" => "ndorn@gwdg.de",
];

$wochentag = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

$format = $argv[1];
if (!preg_match("/^(deb|rpm)$/", $format)) {
	fwrite(STDERR, "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Changlog-Format $format unbekannt");
	exit(1);
}

$outdir = $argv[2] . "/../../build";
if (!file_exists($outdir)) {
	fwrite(STDERR, "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m " . str_replace($argv[2], "", $outdir) . " nicht gefunden");
	exit(1);
}

$html_file = $argv[2] . "/../win/changelog.html";
if (!file_exists($html_file)) {
	fwrite(STDERR, "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m " . str_replace($argv[2], "", $html_file) . " nicht gefunden");
	exit(1);
}

$json = $argv[2] . "/build-changelog-maintainer.json";
if (!file_exists($html_file)) {
	fwrite(STDERR, "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m " . str_replace($argv[2], "", $json) . " nicht gefunden");
	exit(1);
}

// Changelog erstellen
$maintainer = [];
if (file_exists($json)) {
	$maintainer = json_decode(file_get_contents($json), JSON_OBJECT_AS_ARRAY);
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
?>
