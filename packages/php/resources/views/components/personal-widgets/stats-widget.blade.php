{{-- <x-nq::personal-widgets.stats-widget :stats="[['label' => 'Projects', 'value' => 42], ['label' => 'Stars', 'value' => 12400, 'compact' => true, 'suffix' => '+']]" />
     Headline numbers: years of experience, projects shipped, articles written. stats: each ['label', 'value', 'suffix' (optional), 'compact' (optional, 12K)].
     title: default "By the numbers". Numbers use Latin digits in both languages. --}}
@props(['stats' => [], 'title' => null])
<div data-slot="{{ $attributes->get('data-slot', 'stats-widget') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4"><div data-slot="card-title" class="text-label text-foreground">{{ $title ?? \Nasaq\Nasaq::t('By the numbers', 'بالأرقام') }}</div></div>
    <div data-slot="card-content" class="px-4">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            @foreach ((array) $stats as $s)
                @php $s = (array) $s; @endphp
                <div class="flex flex-col">
                    <dd class="order-first text-h1 text-foreground"><x-nq::numeric :value="$s['value'] ?? 0" :compact="! empty($s['compact'])" />{{ $s['suffix'] ?? '' }}</dd>
                    <dt class="text-caption text-muted-foreground">{{ $s['label'] ?? '' }}</dt>
                </div>
            @endforeach
        </dl>
    </div>
</div>
