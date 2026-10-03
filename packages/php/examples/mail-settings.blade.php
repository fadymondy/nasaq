<div class="flex flex-col gap-6">
    <x-nq::mail-settings.smtp-settings
        default-test-to="you@example.com"
        :value="['host' => 'smtp.example.com', 'port' => 587, 'encryption' => 'starttls', 'username' => 'mailer', 'fromName' => 'Acme', 'fromAddress' => 'hello@example.com', 'passwordSet' => true]" />
    <x-nq::mail-settings.mail-domains :domains="[
        [
            'id' => 'd1',
            'name' => 'example.com',
            'checkedAt' => '2026-09-29T08:00:00Z',
            'checks' => [
                ['kind' => 'spf', 'status' => 'pass', 'name' => 'example.com', 'expected' => 'v=spf1 include:_spf.example.net ~all', 'found' => 'v=spf1 include:_spf.example.net ~all'],
                ['kind' => 'dkim', 'status' => 'missing', 'name' => 'mail._domainkey.example.com', 'expected' => 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN'],
                ['kind' => 'dmarc', 'status' => 'pass', 'name' => '_dmarc.example.com', 'expected' => 'v=DMARC1; p=quarantine', 'found' => 'v=DMARC1; p=quarantine'],
            ],
            'mailboxes' => [
                ['id' => 'm1', 'local' => 'info', 'quotaMb' => 2048, 'usedMb' => 512],
                ['id' => 'm2', 'local' => 'support', 'quotaMb' => 2048, 'usedMb' => 1900],
            ],
            'aliases' => [['id' => 'a1', 'source' => 'sales', 'destination' => 'team@example.com']],
        ],
        [
            'id' => 'd2',
            'name' => 'shop.example.com',
            'checks' => [
                ['kind' => 'spf', 'status' => 'fail', 'name' => 'shop.example.com', 'expected' => 'v=spf1 include:_spf.example.net ~all', 'found' => 'v=spf1 +all'],
                ['kind' => 'dkim', 'status' => 'pass', 'name' => 'mail._domainkey.shop.example.com', 'expected' => 'v=DKIM1; k=rsa; p=ABCDEF', 'found' => 'v=DKIM1; k=rsa; p=ABCDEF'],
                ['kind' => 'dmarc', 'status' => 'fail', 'name' => '_dmarc.shop.example.com', 'expected' => 'v=DMARC1; p=quarantine', 'found' => 'v=DMARC1; p=none'],
            ],
            'mailboxes' => [],
            'aliases' => [],
        ],
    ]" />
</div>
