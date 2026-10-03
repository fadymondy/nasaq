{{-- <x-nq::glance-surfaces.tray-popover title="Today" :actions="[['id' => 'open', 'label' => 'Open app', 'icon' => 'external-link', 'shortcut' => 'Ctrl+O']]"> rows </x-nq::glance-surfaces.tray-popover>
     The popover under a menu-bar or system-tray icon: caret, header, glance rows, footer commands.
     caret: start | center | end (default) | false.   <x-slot:header-end> sits at the inline end of the header.
     actions: arrays with id, label, icon (lucide name), shortcut, danger. Choosing one dispatches a bubbling "nq-action" event with { id }. --}}
@props(['title', 'subtitle' => null, 'caret' => 'end', 'actions' => [], 'headerEnd' => null])
<div data-slot="{{ $attributes->get('data-slot', 'tray-popover') }}" role="group" aria-label="{{ $title }}" {{ $attributes->except('data-slot')->cn('relative w-80 max-w-full rounded-xl border border-border bg-card text-foreground shadow-lg') }}>
    @if ($caret && $caret !== 'false')
        <span aria-hidden="true" class="{{ \Nasaq\Cn::merge('absolute -top-1.5 size-3 rotate-45 border-t border-s border-border bg-card', ['start' => 'start-5', 'end' => 'end-5', 'center' => 'start-1/2 -ms-1.5'][$caret] ?? '') }}"></span>
    @endif
    <header class="relative flex items-center gap-3 px-4 pt-3.5 pb-2">
        <div class="min-w-0 flex-1">
            <h2 class="truncate text-label font-semibold">{{ $title }}</h2>
            @if ($subtitle)<p class="truncate text-caption text-muted-foreground">{{ $subtitle }}</p>@endif
        </div>
        {{ $headerEnd }}
    </header>
    @if (! $slot->isEmpty())
        <div class="flex flex-col px-1 pb-1">{{ $slot }}</div>
    @endif
    @if (count($actions))
        <footer class="flex flex-col gap-0.5 border-t border-border p-1">
            @foreach ($actions as $action)
                <button type="button" x-on:click="$dispatch('nq-action', { id: @js($action['id']) })"
                    class="{{ \Nasaq\Cn::merge('flex h-8 items-center gap-2 rounded-control px-3 text-label outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', ! empty($action['danger']) ? 'text-nq-danger-text' : 'text-foreground') }}">
                    @if (! empty($action['icon']))<x-dynamic-component :component="'lucide-'.$action['icon']" aria-hidden="true" class="size-4 text-current opacity-70" />@endif
                    <span class="flex-1 text-start">{{ $action['label'] }}</span>
                    @if (! empty($action['shortcut']))<kbd dir="ltr" class="text-caption text-muted-foreground">{{ $action['shortcut'] }}</kbd>@endif
                </button>
            @endforeach
        </footer>
    @endif
</div>
