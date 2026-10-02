{{-- <x-nq::deploy-view title="Deploy api to production" :steps="$steps" can-retry @retry="$event.detail.wait(…)" @cancel="$event.detail.wait(…)">main · 4f2a91c</x-nq::deploy-view>
     A deploy run: ordered steps with a status glyph, live durations, expandable logs and retry for a failed step.
     steps: [['id', 'name', 'command', 'status' => pending|running|success|failed|skipped|cancelled, 'durationMs', 'startedAt' => ms since epoch (a running step counts up), 'logs', 'error']].
     title, status (default: derived from the steps), expanded (step ids open at the start; default failed and running), max-log-lines (500), log-height ("14rem").
     The default slot is the meta line under the title. can-cancel shows Cancel while running; can-retry shows Retry on failed and cancelled steps.
     Events on the root with detail { …, wait(promise) }; resolve, or resolve { error } to show the message (a rejection shows a generic one):
       cancel   detail {}               cancel the run
       retry    detail.stepId           retry one failed or cancelled step
     Differences from the React component: logs show without ANSI colours (the codes are removed on the server) and the log area does not follow the tail.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['title' => null, 'steps' => [], 'status' => null, 'expanded' => null, 'maxLogLines' => 500, 'logHeight' => '14rem', 'canCancel' => false, 'canRetry' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $statusLabels = [
        'pending' => $t::t('Queued', 'في الانتظار'), 'running' => $t::t('Running', 'قيد التنفيذ'), 'success' => $t::t('Succeeded', 'نجح'),
        'failed' => $t::t('Failed', 'فشل'), 'skipped' => $t::t('Skipped', 'تم تخطيه'), 'cancelled' => $t::t('Cancelled', 'أُلغي'),
    ];
    $units = $ar ? ['ms' => 'مث', 's' => 'ث', 'm' => 'د', 'h' => 'س'] : ['ms' => 'ms', 's' => 's', 'm' => 'm', 'h' => 'h'];
    $now = (int) (now()->getTimestamp() * 1000);
    $ms = function ($step) use ($now) {
        if (($step['status'] ?? '') === 'running' && isset($step['startedAt'])) return max(0, $now - (int) $step['startedAt']);
        return isset($step['durationMs']) ? (int) $step['durationMs'] : null;
    };
    $fmt = function ($v) use ($units) {
        if ($v < 1000) return round($v).$units['ms'];
        $s = $v / 1000;
        if (round($s) < 60) return ($s < 10 ? number_format($s, 1, '.', '') : (string) round($s)).$units['s'];
        $tm = (int) floor($s / 60); $rest = (int) round($s - $tm * 60);
        [$m, $sec] = $rest === 60 ? [$tm + 1, 0] : [$tm, $rest];
        if ($m < 60) return $m.$units['m'].' '.str_pad((string) $sec, 2, '0', STR_PAD_LEFT).$units['s'];
        return intdiv($m, 60).$units['h'].' '.str_pad((string) ($m % 60), 2, '0', STR_PAD_LEFT).$units['m'];
    };
    $list = array_values($steps);
    $derived = function ($l) {
        $st = array_column($l, 'status');
        if (! $st) return 'pending';
        if (in_array('failed', $st, true)) return 'failed';
        if (in_array('running', $st, true)) return 'running';
        if (in_array('cancelled', $st, true)) return 'cancelled';
        if (count(array_unique($st)) === 1 && $st[0] === 'pending') return 'pending';
        if (! array_diff($st, ['success', 'skipped'])) return 'success';
        return 'running';
    };
    $status ??= $derived($list);
    $done = count(array_filter($list, fn ($s) => in_array($s['status'], ['success', 'skipped'], true)));
    $total = array_sum(array_map(fn ($s) => $ms($s) ?? 0, $list));
    $progressText = $t::t("{$done} of ".count($list).' steps', "{$done} من ".count($list).' خطوات');
    $open = $expanded ?? array_map(fn ($s) => (string) $s['id'], array_filter($list, fn ($s) => in_array($s['status'], ['failed', 'running'], true)));
    $badge = ['pending' => 'neutral', 'running' => 'info', 'success' => 'success', 'failed' => 'danger', 'skipped' => 'neutral', 'cancelled' => 'warning'];
    $progressTone = ['pending' => 'default', 'running' => 'info', 'success' => 'success', 'failed' => 'danger', 'skipped' => 'default', 'cancelled' => 'warning'];
    $icons = ['pending' => 'circle-dashed', 'success' => 'circle-check', 'failed' => 'circle-x', 'skipped' => 'circle-minus', 'cancelled' => 'ban'];
    $text = ['pending' => 'text-muted-foreground', 'running' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'failed' => 'text-nq-danger-text', 'skipped' => 'text-muted-foreground', 'cancelled' => 'text-nq-warning-text'];
    $config = [
        'units' => $units, 'genericError' => $t::t('Could not retry. Try again.', 'تعذرت إعادة المحاولة. حاول مرة أخرى.'),
        'steps' => array_map(fn ($s) => ['id' => (string) $s['id'], 'status' => $s['status'], 'startedAt' => $s['startedAt'] ?? null, 'durationMs' => $s['durationMs'] ?? null], $list),
    ];
    $title ??= $t::t('Deploy', 'النشر');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'deploy-view') }}" data-status="{{ $status }}" aria-label="{{ $title }}" x-data="nqDeployView(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card text-start') }}>
    <header class="flex flex-col gap-3 border-b border-border p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-h3 text-foreground">{{ $title }}</h3>
                    <x-nq::badge :variant="$badge[$status]">
                        @if ($status === 'running')<x-nq::spinner class="size-3" />@else<x-dynamic-component :component="'lucide-'.$icons[$status]" aria-hidden="true" class="size-3 {{ $text[$status] }}" />@endif
                        {{ $statusLabels[$status] }}
                    </x-nq::badge>
                </div>
                @if (trim((string) $slot) !== '')<div class="text-body-sm text-muted-foreground">{{ $slot }}</div>@endif
            </div>
            <div class="flex items-center gap-3">
                <span class="text-body-sm text-muted-foreground">
                    {{ $t::t('Duration', 'المدة') }} <bdi dir="ltr" data-deploy-total class="font-mono text-foreground tabular-nums">{{ $fmt($total) }}</bdi>
                </span>
                @if ($canCancel && $status === 'running')
                    <x-nq::button type="button" size="sm" variant="secondary" x-on:click="cancel()" x-bind:aria-busy="cancelling ? 'true' : null" x-bind:data-disabled="cancelling ? '' : null">
                        <x-lucide-square aria-hidden="true" />
                        {{ $t::t('Cancel deploy', 'إلغاء النشر') }}
                    </x-nq::button>
                @endif
            </div>
        </div>
        <x-nq::progress :value="count($list) ? ($done / count($list)) * 100 : 0" :tone="$progressTone[$status]" size="sm" :label="$progressText" :show-value="false" :value-text="$progressText" />
    </header>
    <ol aria-label="{{ $t::t('Deploy steps', 'خطوات النشر') }}" class="m-0 flex list-none flex-col p-0">
        @foreach ($list as $i => $step)
            @php
                $sid = (string) $step['id'];
                $st = $step['status'];
                $lines = isset($step['logs']) && $step['logs'] !== '' ? explode("\n", rtrim(preg_replace('/\e\[[0-9;?]*[ -\/]*[@-~]/', '', $step['logs']), "\n")) : null;
                $hidden = $lines && count($lines) > $maxLogLines ? count($lines) - $maxLogLines : 0;
                if ($hidden) $lines = array_slice($lines, -$maxLogLines);
                $d = $ms($step);
                $stLabel = $statusLabels[$st];
                $jsid = \Illuminate\Support\Js::from($sid);
            @endphp
            <li data-slot="deploy-step" data-status="{{ $st }}" class="border-b border-border last:border-b-0">
                <x-nq::collapsible :open="in_array($sid, $open, true)">
                    <div class="flex items-center gap-1 pe-2">
                        <x-nq::collapsible.trigger variant="ghost"
                            aria-label="{{ $t::t('Step '.($i + 1).': '.$step['name'].', '.$stLabel, 'الخطوة '.($i + 1).': '.$step['name'].'، '.$stLabel) }}"
                            class="group/step h-auto min-w-0 flex-1 justify-start gap-3 rounded-none px-4 py-3 text-start font-normal">
                            <x-lucide-chevron-right aria-hidden="true" class="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[panel-open]/step:rotate-90 rtl:-scale-x-100 rtl:group-data-[panel-open]/step:-rotate-90" />
                            @if ($st === 'running')<x-nq::spinner class="size-4 shrink-0 {{ $text['running'] }}" />@else<x-dynamic-component :component="'lucide-'.$icons[$st]" aria-hidden="true" class="size-4 shrink-0 {{ $text[$st] }}" />@endif
                            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span class="truncate text-label text-foreground">{{ $step['name'] }}</span>
                                @if (! empty($step['command']))<bdi dir="ltr" class="truncate text-start font-mono text-caption text-muted-foreground">{{ $step['command'] }}</bdi>@endif
                            </span>
                            <span class="hidden shrink-0 text-caption text-muted-foreground sm:inline">{{ $stLabel }}</span>
                            <bdi dir="ltr" data-step-duration="{{ $sid }}" class="w-16 shrink-0 text-end font-mono text-caption text-muted-foreground tabular-nums">{{ $d === null ? '' : $fmt($d) }}</bdi>
                        </x-nq::collapsible.trigger>
                        @if ($canRetry && in_array($st, ['failed', 'cancelled'], true))
                            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="retry({!! $jsid !!})" x-bind:aria-busy="retrying[{!! $jsid !!}] ? 'true' : null" x-bind:data-disabled="retrying[{!! $jsid !!}] ? '' : null">
                                <x-lucide-rotate-ccw aria-hidden="true" class="rtl:-scale-x-100" />
                                {{ $t::t('Retry step', 'إعادة محاولة الخطوة') }}
                            </x-nq::button>
                        @endif
                    </div>
                    <x-nq::collapsible.panel>
                        <div class="flex flex-col gap-2 px-4 pb-4 ps-11">
                            @if (! empty($step['error']))
                                <x-nq::alert tone="danger" role="alert">{{ $step['error'] }}</x-nq::alert>
                            @endif
                            <template x-if="errors[@js($sid)]"><x-nq::alert tone="danger" role="alert"><span x-text="errors[@js($sid)]"></span></x-nq::alert></template>
                            <div class="relative overflow-hidden rounded-control border border-border bg-nq-surface-soft" dir="ltr">
                                @if ($hidden)<p class="border-b border-border px-3 py-1 text-caption text-muted-foreground">{{ $hidden === 1 ? $t::t('1 earlier line hidden', 'أُخفي سطر سابق واحد') : $t::t("{$hidden} earlier lines hidden", "أُخفيت {$hidden} أسطر سابقة") }}</p>@endif
                                <pre role="log" aria-label="{{ $t::t('Logs for '.$step['name'], 'سجلات '.$step['name']) }}" aria-live="off" tabindex="0" style="max-height: {{ $logHeight }}"
                                    class="m-0 overflow-auto p-3 font-mono text-code text-nq-fg-body outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">@if ($lines)<code class="block w-max min-w-full">{{ implode("\n", $lines) }}</code>@else<span class="text-muted-foreground">{{ $st === 'running' ? $t::t('Waiting for output...', 'بانتظار المخرجات...') : $t::t('No output for this step.', 'لا توجد مخرجات لهذه الخطوة.') }}</span>@endif</pre>
                            </div>
                        </div>
                    </x-nq::collapsible.panel>
                </x-nq::collapsible>
            </li>
        @endforeach
    </ol>
</section>
