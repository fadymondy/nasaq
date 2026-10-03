@php
    $findings = [
        ['id' => 'CVE-2024-45337', 'severity' => 'critical', 'cvss' => 9.1, 'package' => 'golang.org/x/crypto', 'installedVersion' => '0.30.0', 'fixedVersion' => '0.31.0', 'title' => 'Misuse of ServerConfig.PublicKeyCallback'],
        ['id' => 'CVE-2024-21538', 'severity' => 'high', 'cvss' => 7.7, 'package' => 'cross-spawn', 'installedVersion' => '7.0.3', 'fixedVersion' => '7.0.5', 'title' => 'Regular expression denial of service'],
        ['id' => 'CVE-2024-4067', 'severity' => 'medium', 'cvss' => 5.1, 'package' => 'micromatch', 'installedVersion' => '4.0.5', 'fixedVersion' => '4.0.8'],
        ['id' => 'CVE-2023-26136', 'severity' => 'low', 'cvss' => 3.7, 'package' => 'tough-cookie', 'installedVersion' => '4.0.0'],
    ];
    $history = [
        ['id' => 's1', 'at' => '2026-09-01', 'counts' => ['critical' => 2, 'high' => 3, 'medium' => 4, 'low' => 2]],
        ['id' => 's2', 'at' => '2026-09-08', 'counts' => ['critical' => 1, 'high' => 2, 'medium' => 3, 'low' => 2]],
        ['id' => 's3', 'at' => '2026-09-15', 'counts' => ['critical' => 1, 'high' => 1, 'medium' => 1, 'low' => 1]],
    ];
@endphp
<x-nq::vuln-report :findings="$findings" :history="$history" :last-scan-at="now()->subHours(2)" scannable openable />
