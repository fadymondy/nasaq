@php
    $hosts = [
        ['id' => 'h1', 'hosts' => ['app.example.com', 'www.example.com'], 'upstream' => 'http://10.0.0.5:3000', 'tlsMode' => 'auto', 'websockets' => true, 'enabled' => true, 'status' => 'online'],
        ['id' => 'h2', 'hosts' => ['api.example.com'], 'upstream' => 'https://api.internal', 'tlsMode' => 'custom', 'websockets' => false, 'enabled' => true, 'status' => 'unknown'],
        ['id' => 'h3', 'hosts' => ['old.example.org'], 'upstream' => 'http://localhost:8080', 'tlsMode' => 'off', 'websockets' => false, 'enabled' => false, 'status' => 'offline'],
        ['id' => 'h4', 'hosts' => ['shop.example.com', 'store.example.com', 'cdn.example.com', 'img.example.com', 'static.example.com'], 'upstream' => 'http://10.0.0.9:4000', 'tlsMode' => 'auto', 'websockets' => false, 'enabled' => true, 'status' => 'online'],
    ];
@endphp
<x-nq::proxy-hosts :hosts="$hosts"
    x-on:save-host="$event.detail.wait(Promise.resolve({}))"
    x-on:delete-host="$event.detail.wait(Promise.resolve())"
    x-on:toggle-host="$event.detail.wait(Promise.resolve())" />
