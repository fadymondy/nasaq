{{-- <x-nq::text-utilities.progressive-list :items="['One', 'Two', 'Three', 'Four']" :initial="3" :step="3" />
     A list that shows its first few items and reveals step more on each press, with the count left.
     items: an array of strings (escaped). Or give <li> elements as the slot and omit items. initial and step default to 3.
     Fires "reveal" with the number visible. class styles the <ul>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => null, 'initial' => 3, 'step' => 3])
@php
    $items = $items === null ? null : array_values((array) $items);
    $total = $items === null ? 0 : count($items);
    $shown = min((int) $initial, $total);
    $left = max(0, $total - $shown);
    $next = min($left, max(1, (int) $step));
    $t = \Nasaq\Nasaq::class;
@endphp
<div data-slot="progressive-list" x-data="nqProgressiveList({{ (int) $initial }}, {{ (int) $step }}, {{ $total }})" class="flex flex-col items-start gap-2">
    <ul x-ref="list" {{ $attributes->cn('flex w-full flex-col gap-2') }}>
        @if ($items !== null)
            @foreach ($items as $i => $item)<li class="min-w-0" @if ($i >= $shown) hidden @endif>{{ $item }}</li>@endforeach
        @else
            {{ $slot }}
        @endif
    </ul>
    <x-nq::button variant="ghost" size="sm" x-bind="button" :style="$left <= 0 && $items !== null ? 'display: none' : null">
        <x-lucide-chevron-down aria-hidden="true" />
        <span x-text="moreText">{{ $t::t("Show {$next} more", "عرض {$next} أخرى") }}</span>
        <span class="text-muted-foreground" x-text="leftText">{{ $t::t("{$left} left", "متبقٍ {$left}") }}</span>
    </x-nq::button>
</div>
