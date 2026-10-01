{{-- <x-nq::mobile-nav-kit.swipe-action-row :end-actions="[['id' => 'archive', 'label' => 'Archive', 'icon' => 'archive']]"> <div class="p-4">Design review moved to 3 PM</div> </x-nq::mobile-nav-kit.swipe-action-row>
     A list row that slides sideways to reveal actions, the way phone lists do (touch and pen; a mouse never drags it). The swipe direction follows the reading direction.
     start-actions: revealed by swiping toward the inline end (rightward in LTR): a pin, a read toggle. end-actions: toward the inline start: archive, delete.
     An action: id, label, icon (a lucide name), tone (default | primary | warning | danger), disabled. Pressing one fires a bubbling "nq-swipe-action" { id } and closes the row;
     opening or closing fires "nq-swipe-change" { state: closed | start | end }. disabled: turns swiping off.
     Not ported: the context menu with the same actions (use the events from a menu of your own). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['startActions' => [], 'endActions' => [], 'disabled' => false])
@php
    $tones = [
        'default' => 'bg-secondary text-foreground',
        'primary' => 'bg-primary text-primary-foreground',
        'warning' => 'bg-nq-warning text-background',
        'danger' => 'bg-nq-danger text-background',
    ];
    $panels = [['side' => 'start', 'list' => array_values($startActions)], ['side' => 'end', 'list' => array_values($endActions)]];
@endphp
<div data-slot="swipe-action-row" x-data="nqSwipeRow({{ count($startActions) }}, {{ count($endActions) }}, {{ $disabled ? 'true' : 'false' }})"
    x-bind:data-state="state" x-on:pointerdown.document="away($event)" x-on:click.capture="clickCapture($event)"
    {{ $attributes->cn('relative overflow-hidden bg-card') }}>
    @foreach ($panels as $panel)
        @if (count($panel['list']))
            <div data-slot="swipe-actions" data-side="{{ $panel['side'] }}" x-bind:inert="state !== '{{ $panel['side'] }}'"
                class="absolute inset-y-0 flex {{ $panel['side'] === 'start' ? 'start-0' : 'end-0' }}" style="width: {{ count($panel['list']) * 76 }}px">
                @foreach ($panel['list'] as $action)
                    <button type="button" @disabled(! empty($action['disabled'])) x-on:click="run($el.dataset.action)" data-action="{{ $action['id'] }}"
                        class="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-caption outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50 {{ $tones[$action['tone'] ?? 'default'] ?? $tones['default'] }}">
                        <x-dynamic-component :component="'lucide-'.($action['icon'] ?? 'circle')" aria-hidden="true" class="size-5" />
                        <span class="max-w-full truncate">{{ $action['label'] }}</span>
                    </button>
                @endforeach
            </div>
        @endif
    @endforeach
    <div data-slot="swipe-surface" x-on:pointerdown="down($event)" x-on:pointermove="move($event)" x-on:pointerup="up()" x-on:pointercancel="up()"
        x-bind:style="{ transform: 'translateX(' + px() + 'px)' }" x-bind:class="drag === null ? 'transition-transform duration-200 ease-nq' : ''"
        class="relative bg-card [touch-action:pan-y]">
        {{ $slot }}
    </div>
</div>
