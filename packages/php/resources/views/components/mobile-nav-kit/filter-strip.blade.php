{{-- <x-nq::mobile-nav-kit.filter-strip :items="[['value' => 'all', 'label' => 'All', 'count' => 12], ['value' => 'open', 'label' => 'Open', 'icon' => 'circle-dot']]" value="all" />
     A horizontally scrolling row of filter chips. The active chip scrolls into view; the ends fade instead of clipping.
     items: value, label, icon (a lucide name), count (shown after the label). value: the selected value, or with multiple an array
     (x-modelable: x-model="$wire.filter"). Fires a bubbling "nq-change" { value }. labels: ['filters']. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'value' => null, 'multiple' => false, 'labels' => []])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $label = $labels['filters'] ?? \Nasaq\Nasaq::t('Filters', 'التصفية');
    $initial = $multiple ? array_values((array) ($value ?? [])) : (string) ($value ?? '');
    $on = 'border-primary bg-primary text-primary-foreground';
    $off = 'border-border bg-card text-foreground hover:bg-nq-hover';
@endphp
<div data-slot="filter-strip" role="group" aria-label="{{ $label }}" x-data="nqFilterStrip({!! $js($initial) !!}, {!! $js((bool) $multiple) !!})" x-modelable="value" {{ $attributes->cn('relative') }}>
    <div data-filter-scroller class="flex snap-x gap-2 overflow-x-auto px-4 py-1 [mask-image:linear-gradient(90deg,transparent,black_1rem,black_calc(100%-1rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        @foreach (array_values($items) as $item)
            @php $v = $js($item['value']); @endphp
            <button type="button" x-on:click="toggle({!! $v !!})" x-bind:aria-pressed="pressed({!! $v !!})" x-bind:class="pressed({!! $v !!}) ? '{{ $on }}' : '{{ $off }}'"
                class="inline-flex h-control shrink-0 snap-center items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-label outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                @if (! empty($item['icon']))<x-dynamic-component :component="'lucide-'.$item['icon']" aria-hidden="true" class="size-4" />@endif
                {{ $item['label'] }}
                @if (isset($item['count']))<span x-bind:class="pressed({!! $v !!}) ? 'text-primary-foreground/80' : 'text-muted-foreground'" class="tabular-nums">{{ $item['count'] }}</span>@endif
            </button>
        @endforeach
    </div>
</div>
