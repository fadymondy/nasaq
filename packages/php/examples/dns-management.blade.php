<x-nq::dns-management zone="example.com"
    :records="[
        ['id' => 'r1', 'type' => 'A', 'name' => '@', 'content' => '203.0.113.10', 'ttl' => 1, 'proxied' => true],
        ['id' => 'r2', 'type' => 'CNAME', 'name' => 'www', 'content' => 'example.com', 'ttl' => 300, 'proxied' => true],
        ['id' => 'r3', 'type' => 'MX', 'name' => '@', 'content' => 'mail.example.com', 'ttl' => 3600, 'priority' => 10],
        ['id' => 'r4', 'type' => 'TXT', 'name' => '@', 'content' => 'v=spf1 include:_spf.example.com ~all', 'ttl' => 3600],
    ]"
    x-on:save="$event.detail.wait(Promise.resolve())"
    x-on:delete="$event.detail.wait(Promise.resolve())"
    x-on:toggle-proxy="$event.detail.wait(Promise.resolve())" />
