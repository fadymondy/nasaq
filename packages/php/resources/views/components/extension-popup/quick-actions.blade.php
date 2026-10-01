{{-- <x-nq::extension-popup.quick-actions :actions="[['id' => 'open', 'label' => 'Open app', 'icon' => 'globe', 'external' => true]]" />
     A grid of icon-over-label shortcuts. actions: id, label, icon (a Lucide name), disabled?, external? (shows an external-link mark).
     A click dispatches a bubbling "nq-action" event with detail { id }. columns: 2 | 3. --}}
@props(['actions' => [], 'columns' => 2, 'label' => null])
<div data-slot="extension-quick-actions" role="group" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Quick actions', 'إجراءات سريعة') }}" {{ $attributes->cn(['grid gap-2', 'grid-cols-3' => (int) $columns === 3, 'grid-cols-2' => (int) $columns !== 3]) }}>
    @foreach ($actions as $action)
        <button type="button" x-data x-on:click="$dispatch('nq-action', { id: @js($action['id']) })" @if (! empty($action['disabled'])) disabled @endif
            class="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-2 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50">
            <span aria-hidden="true" class="text-primary [&_svg]:size-5"><x-dynamic-component :component="'lucide-'.($action['icon'] ?? 'circle')" /></span>
            <span class="max-w-full truncate">{{ $action['label'] }}</span>
            @if (! empty($action['external']))<span aria-hidden="true" class="absolute top-1.5 end-1.5 text-muted-foreground rtl:-scale-x-100 [&_svg]:size-3"><x-lucide-external-link /></span>@endif
        </button>
    @endforeach
</div>
