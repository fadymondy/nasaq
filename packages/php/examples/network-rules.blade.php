@php
    $firewall = [
        ['id' => 'f1', 'action' => 'allow', 'protocol' => 'tcp', 'port' => '22', 'source' => '203.0.113.0/24', 'note' => 'Office'],
        ['id' => 'f2', 'action' => 'allow', 'protocol' => 'tcp', 'port' => '443', 'source' => 'any', 'note' => 'HTTPS'],
        ['id' => 'f3', 'action' => 'allow', 'protocol' => 'tcp', 'port' => '80', 'source' => 'any'],
        ['id' => 'f4', 'action' => 'deny', 'protocol' => 'tcp', 'port' => '3306', 'source' => 'any', 'note' => 'Database'],
    ];
    $http = [
        ['id' => 'h1', 'type' => 'redirect', 'path' => '/old-shop', 'target' => 'https://example.com/shop', 'status' => 301],
        ['id' => 'h2', 'type' => 'header', 'path' => '/', 'name' => 'X-Frame-Options', 'value' => 'DENY'],
        ['id' => 'h3', 'type' => 'basic-auth', 'path' => '/staging', 'username' => 'team'],
        ['id' => 'h4', 'type' => 'ip-deny', 'path' => '/admin', 'cidr' => '198.51.100.7'],
    ];
@endphp
<x-nq::network-rules :firewall="$firewall" :http="$http"
    x-on:apply-firewall="$event.detail.wait(Promise.resolve())"
    x-on:apply-http="$event.detail.wait(Promise.resolve())" />
