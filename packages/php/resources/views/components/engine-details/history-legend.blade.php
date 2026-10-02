{{-- <x-nq::engine-details.history-legend />
     The three verdicts with their shape and words. Put it under a day strip or chart. labels: array overriding the built-in words. --}}
@include('nasaq::components.engine-card._health')
@include('nasaq::components.engine-details._logic')
@props(['labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ed_words($locale, $labels);
    $cell = [
        'on_protocol' => 'rounded-[3px] border border-nq-success bg-nq-success',
        'off_protocol' => 'rounded-[3px] border border-nq-danger bg-[repeating-linear-gradient(45deg,var(--nq-danger)_0_2px,transparent_2px_5px)]',
        'unevaluated' => 'rounded-full border border-dashed border-muted-foreground bg-transparent',
    ];
    $glyph = ['on_protocol' => ['circle-check', 'text-nq-success-text'], 'off_protocol' => ['circle-x', 'text-nq-danger-text'], 'unevaluated' => ['circle-dashed', 'text-muted-foreground']];
@endphp
<ul data-slot="{{ $attributes->get('data-slot', 'engine-history-legend') }}" aria-label="{{ $t['legend'] }}" {{ $attributes->except('data-slot')->cn('m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground') }}>
    @foreach ($cell as $verdict => $shape)
        <li class="flex items-center gap-1.5">
            <span aria-hidden="true" class="{{ \Nasaq\Cn::merge('size-3', $shape) }}"></span>
            <x-dynamic-component :component="'lucide-'.$glyph[$verdict][0]" aria-hidden="true" class="size-3.5 {{ $glyph[$verdict][1] }}" />
            {{ $t['verdicts'][$verdict] }}
        </li>
    @endforeach
</ul>
