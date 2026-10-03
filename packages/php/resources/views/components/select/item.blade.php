{{-- <x-nq::select.item value="bug">Bug</x-nq::select.item>
     One choice. value must not be empty. value-expr: an Alpine expression for the value instead of value (an item drawn by x-for, e.g. value-expr="o.value"). --}}
@props(['value' => null, 'disabled' => false, 'valueExpr' => null])
@php $v = $valueExpr !== null ? e($valueExpr) : (string) \Illuminate\Support\Js::from($value); @endphp
<div data-slot="{{ $attributes->get('data-slot', 'select-item') }}" x-bind="item({!! $v !!}, @js((bool) $disabled))"
    {{ $attributes->except('data-slot')->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
    ]) }}>
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <span x-show="isSelected({!! $v !!})" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
    </span>
    <span data-slot="select-item-text" class="min-w-0 flex-1 truncate">{{ $slot }}</span>
</div>
