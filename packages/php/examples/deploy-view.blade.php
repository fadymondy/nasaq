@php
    $esc = chr(27);
    $steps = [
        ['id' => 'install', 'name' => 'Install dependencies', 'command' => 'pnpm install --frozen-lockfile', 'status' => 'success', 'durationMs' => 8400, 'logs' => "Lockfile is up to date\nPackages: +214\nDone in 8.4s"],
        ['id' => 'build', 'name' => 'Build', 'command' => 'pnpm build', 'status' => 'failed', 'durationMs' => 21300, 'error' => 'The build exited with code 1.', 'logs' => "{$esc}[32mcompiled{$esc}[0m 214 modules\n{$esc}[31merror{$esc}[0m src/app.ts: Type 'string' is not assignable to type 'number'"],
        ['id' => 'ship', 'name' => 'Ship to production', 'command' => 'pnpm deploy', 'status' => 'pending'],
    ];
@endphp
<x-nq::deploy-view title="Deploy api to production" can-retry :steps="$steps"
    x-on:retry="$event.detail.wait(Promise.resolve())"
    x-on:cancel="$event.detail.wait(Promise.resolve())">
    main · 4f2a91c
</x-nq::deploy-view>
