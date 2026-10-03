@php
    $services = [
        ['id' => 'nginx', 'name' => 'nginx.service', 'description' => 'A high performance web server', 'state' => 'active', 'enabled' => true, 'memoryBytes' => 48234496, 'since' => '3 days ago'],
        ['id' => 'redis', 'name' => 'redis-server.service', 'description' => 'Advanced key-value store', 'state' => 'inactive', 'enabled' => false, 'since' => '1 hour ago'],
        ['id' => 'worker', 'name' => 'queue-worker.service', 'description' => 'Background job worker', 'state' => 'failed', 'enabled' => true, 'since' => '5 minutes ago'],
    ];
    $packages = [
        ['name' => 'openssl', 'currentVersion' => '3.0.2', 'newVersion' => '3.0.13', 'kind' => 'security', 'sizeBytes' => 1200000],
        ['name' => 'linux-image-generic', 'currentVersion' => '5.15.0', 'newVersion' => '5.15.1', 'kind' => 'kernel', 'sizeBytes' => 9400000],
        ['name' => 'curl', 'currentVersion' => '7.81.0', 'newVersion' => '7.81.1', 'kind' => 'regular', 'sizeBytes' => 300000],
    ];
    $servers = [['id' => 'web1', 'name' => 'web-1'], ['id' => 'web2', 'name' => 'web-2']];
    $keys = [
        ['id' => 'k1', 'name' => 'Laptop', 'type' => 'ssh-ed25519', 'fingerprint' => 'SHA256:abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', 'comment' => 'fady@laptop', 'addedAt' => 'Jan 5', 'lastUsedAt' => 'Today', 'installedOn' => ['web1']],
        ['id' => 'k2', 'name' => 'CI', 'type' => 'ssh-rsa', 'fingerprint' => 'SHA256:zyxwvutsrqponmlkjihgfedcba9876543210ZYXWVUT', 'addedAt' => 'Feb 1', 'installedOn' => ['web1', 'web2']],
    ];
    $jobs = [
        ['id' => 'j1', 'name' => 'SendInvoice', 'queue' => 'mail', 'status' => 'failed', 'attempts' => 3, 'maxAttempts' => 3, 'at' => '2 min ago', 'error' => "SMTP timeout\n  at send (mail.ts:12)", 'payload' => '{"invoice":42}'],
        ['id' => 'j2', 'name' => 'ResizeImage', 'queue' => 'media', 'status' => 'active', 'attempts' => 1, 'at' => 'now'],
        ['id' => 'j3', 'name' => 'Backup', 'queue' => 'media', 'status' => 'waiting', 'attempts' => 0, 'at' => 'in 1 min'],
    ];
@endphp
<div class="flex flex-col gap-6">
    <x-nq::server-admin.service-units-list :services="$services"
        x-on:action="$event.detail.wait(Promise.resolve())" x-on:view-logs="$event.detail.wait(Promise.resolve())" />
    <x-nq::server-admin.package-updates-panel :packages="$packages" reboot-required last-checked="2 hours ago"
        x-on:check="$event.detail.wait(Promise.resolve())" x-on:update="$event.detail.wait(Promise.resolve())" x-on:reboot="$event.detail.wait(Promise.resolve())" />
    <x-nq::server-admin.ssh-key-manager :servers="$servers" :keys="$keys"
        x-on:install-change="$event.detail.wait(Promise.resolve())" x-on:add="$event.detail.wait(Promise.resolve())" x-on:remove="$event.detail.wait(Promise.resolve())" />
    <x-nq::server-admin.job-queue-monitor :jobs="$jobs"
        x-on:retry="$event.detail.wait(Promise.resolve())" x-on:forget="$event.detail.wait(Promise.resolve())" />
</div>
