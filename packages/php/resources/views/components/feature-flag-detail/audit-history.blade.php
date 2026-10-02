{{-- <x-nq::feature-flag-detail.audit-history :entries="$audit" />
     Who changed what and when on a flag, newest first: toggles, rollout changes, rule and variant edits, kills and restores.
     entries: [['id' => '1', 'action' => 'created|toggled|rollout|rules|variants|killed|restored', 'actor' => 'Mona', 'at' => ISO date,
     'environment' => 'Production', 'from' => '10', 'to' => 'on' or '20', 'reason' => '...']]. labels: array overriding the built-in words. --}}
@props(['entries' => [], 'labels' => []])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $L = fn (string $k, string $en, string $arText) => $labels[$k] ?? $T($en, $arText);
    $icons = ['created' => 'plus', 'toggled' => 'power', 'rollout' => 'gauge', 'rules' => 'target', 'variants' => 'shapes', 'killed' => 'octagon-x', 'restored' => 'rotate-ccw'];
    $sorted = collect($entries)->map(fn ($e) => (array) $e)->sortByDesc('at')->values()->all();
    $text = function (array $e) use ($L, $ar, $labels): string {
        $env = (string) ($e['environment'] ?? '');
        return match ($e['action']) {
            'created' => $L('created', 'Created the flag', 'أنشأ المفتاح'),
            'toggled' => ($e['to'] ?? '') === 'on'
                ? ($labels['toggledOn'] ?? ($ar ? "شغّله في {$env}" : "Turned on in {$env}"))
                : ($labels['toggledOff'] ?? ($ar ? "أوقفه في {$env}" : "Turned off in {$env}")),
            'rollout' => $ar ? "غيّر الإطلاق في {$env} من ".($e['from'] ?? '0').'% إلى '.($e['to'] ?? '0').'%' : "Changed rollout in {$env} from ".($e['from'] ?? '0').'% to '.($e['to'] ?? '0').'%',
            'rules' => $L('rules', 'Updated targeting rules', 'حدّث قواعد الاستهداف'),
            'variants' => $L('variants', 'Updated variants', 'حدّث المتغيّرات'),
            'killed' => $L('killed', 'Killed the flag', 'أوقف المفتاح طارئًا'),
            'restored' => $L('restored', 'Restored the flag', 'أعاد تشغيل المفتاح'),
            default => '',
        };
    };
@endphp
@if (count($sorted) === 0)
    <x-nq::states.empty icon="history" :title="$L('empty', 'No changes recorded yet', 'لا تغييرات مسجّلة بعد')" {{ $attributes }} />
@else
    <x-nq::timeline data-slot="{{ $attributes->get('data-slot', 'flag-audit-history') }}" aria-label="{{ $L('list', 'Audit history of this flag', 'سجل تدقيق هذا المفتاح') }}" {{ $attributes->except('data-slot') }}>
        @foreach ($sorted as $e)
            <x-nq::timeline.item :title="$text($e)" :description="! empty($e['reason']) ? ($ar ? 'السبب: ' : 'Reason: ').$e['reason'] : null" :time="$e['at']">
                <x-slot:icon><x-dynamic-component :component="'lucide-'.$icons[$e['action']]" aria-hidden="true" /></x-slot:icon>
                <span dir="auto" class="text-caption text-muted-foreground">{{ $e['actor'] ?? '' }}</span>
            </x-nq::timeline.item>
        @endforeach
    </x-nq::timeline>
@endif
