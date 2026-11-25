<?php
header('Content-Type: application/json');

if (!file_exists('config.php')) {
    http_response_code(500);
    echo json_encode(["error" => "Serveris puudub config.php fail!"]);
    exit;
}

require_once 'config.php';

$DATA_FAIL = "projektid.json";
$SKRIPTIDE_KAUST = "skriptid/";

if (!is_dir($SKRIPTIDE_KAUST)) {
    @mkdir($SKRIPTIDE_KAUST, 0755, true);
}

if (!file_exists($DATA_FAIL)) {
    $algne = [
        [
            "nimi" => "Guessr OP SKRIPT!",
            "kategooria" => "JavaScript",
            "kirjeldus" => "Täisfunktsionaalne abiskript, mis töötab nii OpenGuessr kui ka GeoGuessr keskkonnas.",
            "fail" => "guessr.js",
            "patched" => false
        ]
    ];
    @file_put_contents($DATA_FAIL, json_encode($algne, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_exists($DATA_FAIL) ? file_get_contents($DATA_FAIL) : "[]";
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sisend = json_decode(file_get_contents('php://input'), true);

    if (!isset($ADMIN_PAROOL) || !isset($sisend['parool']) || (string)$ADMIN_PAROOL !== (string)$sisend['parool']) {
        http_response_code(403);
        echo json_encode(["error" => "Vale admin parool!"]);
        exit;
    }

    $tegevus = isset($sisend['tegevus']) ? $sisend['tegevus'] : '';

    if ($tegevus === 'kontrolli') {
        echo json_encode(["ok" => true]);
        exit;
    }

    $projektid = file_exists($DATA_FAIL) ? (json_decode(file_get_contents($DATA_FAIL), true) ?: []) : [];

    if ($tegevus === 'lisa') {
        $nimi = trim(isset($sisend['nimi']) ? $sisend['nimi'] : '');
        $kategooria = trim(isset($sisend['kategooria']) ? $sisend['kategooria'] : 'JavaScript');
        $kirjeldus = trim(isset($sisend['kirjeldus']) ? $sisend['kirjeldus'] : '');
        $fail = basename(trim(isset($sisend['fail']) ? $sisend['fail'] : ''));
        $kood = isset($sisend['kood']) ? $sisend['kood'] : '';

        if (!$nimi || !$fail || !$kood) {
            http_response_code(400);
            echo json_encode(["error" => "Nimi, failinimi ja kood on kohustuslikud!"]);
            exit;
        }

        if (@file_put_contents($SKRIPTIDE_KAUST . $fail, $kood) === false) {
            http_response_code(500);
            echo json_encode(["error" => "Ei suutnud skriptifaili serverisse salvestada!"]);
            exit;
        }

        $leitud = false;
        foreach ($projektid as &$p) {
            if ($p['fail'] === $fail) {
                $p['nimi'] = $nimi;
                $p['kategooria'] = $kategooria;
                $p['kirjeldus'] = $kirjeldus;
                $p['patched'] = false;
                $leitud = true;
                break;
            }
        }
        unset($p);

        if (!$leitud) {
            array_unshift($projektid, [
                "nimi" => $nimi,
                "kategooria" => $kategooria,
                "kirjeldus" => $kirjeldus,
                "fail" => $fail,
                "patched" => false
            ]);
        }
    } elseif ($tegevus === 'staatus') {
        $fail = isset($sisend['fail']) ? $sisend['fail'] : '';
        foreach ($projektid as &$p) {
            if ($p['fail'] === $fail) {
                $p['patched'] = (bool)$sisend['patched'];
                break;
            }
        }
        unset($p);
    } elseif ($tegevus === 'kustuta') {
        $fail = basename(isset($sisend['fail']) ? $sisend['fail'] : '');
        $uusNimekiri = [];
        foreach ($projektid as $p) {
            if ($p['fail'] !== $fail) {
                $uusNimekiri[] = $p;
            }
        }
        $projektid = $uusNimekiri;
        if ($fail && file_exists($SKRIPTIDE_KAUST . $fail)) {
            @unlink($SKRIPTIDE_KAUST . $fail);
        }
    }

    if (@file_put_contents($DATA_FAIL, json_encode($projektid, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        http_response_code(500);
        echo json_encode(["error" => "Ei suutnud projektid.json faili salvestada!"]);
        exit;
    }

    echo json_encode(["ok" => true, "projektid" => $projektid]);
    exit;
}