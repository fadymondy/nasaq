{{-- <x-nq::product-card.list-item name="Reports" description="One line; truncates."> <x-slot:icon>…</x-slot:icon> <x-slot:price>…</x-slot:price> <x-slot:action>…</x-slot:action> </x-nq::product-card.list-item>
     A compact product row for long lists (modules, integrations, add-ons). Goes inside product-card.list. --}}
@props(['icon' => null, 'name' => null, 'description' => null, 'price' => null, 'action' => null])
@php($has = fn ($v) => $v !== null && trim((string) $v) !== '')
<li data-slot="product-list-item" {{ $attributes->cn('flex min-w-0 items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-nq-hover') }}>
    {{ $icon }}
    <div class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-label text-foreground">{{ $name }}</span>
        @if ($has($description))
            <span class="truncate text-caption text-muted-foreground">{{ $description }}</span>
        @endif
    </div>
    {{ $price }}
    {{ $action }}
</li>
