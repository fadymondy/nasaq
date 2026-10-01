{{-- <x-nq::desktop-notification.stack platform="windows" :items="[['id' => 'a', 'appName' => 'Nasaq', 'title' => 'Deploy finished']]" />
     Where the cards land: the top corner on macOS, the bottom corner on Windows, on the inline-end side (the left in Arabic). Newest first on macOS,
     newest last on Windows. items: arrays with id, appName, title, body, time, actions, activatable, dismissAfter; the last `max` (default 3) show.
     placement: absolute (inside a relative parent, default) | fixed. Each card bubbles nq-close / nq-action / nq-activate; the event's target is the card,
     so read its entry with $event.target.closest('[data-stack-entry]'). A closed card (and its slot) is removed. --}}
@props(['items' => [], 'platform' => 'macos', 'max' => 3, 'placement' => 'absolute', 'labels' => [], 'locale' => null])
@include('nasaq::components.desktop-notification._words')
@php
    $locale ??= app()->getLocale();
    $t = nq_dn_words($locale, $labels);
    $mac = $platform === 'macos';
    $shown = array_slice(array_values($items), -$max);
    $ordered = $mac ? array_reverse($shown) : $shown;
@endphp
<div role="region" aria-label="{{ $t['stack'] }}" data-slot="desktop-notification-stack"
    {{ $attributes->cn(['pointer-events-none z-50 flex w-[22rem] max-w-[calc(100%-1.5rem)] flex-col gap-2 p-3', $placement, $mac ? 'end-0 top-0' : 'bottom-0 end-0 justify-end']) }}>
    @foreach ($ordered as $item)
        <div data-stack-entry="{{ $item['id'] }}" x-data="nqDesktopNotificationEntry" x-bind:class="shown ? 'translate-x-0 translate-y-0 opacity-100' : '{{ $mac ? 'opacity-0 ltr:translate-x-6 rtl:-translate-x-6' : 'translate-y-4 opacity-0' }}'"
            class="transition-[opacity,translate] duration-200 ease-nq motion-reduce:transition-none">
            <x-nq::desktop-notification :platform="$platform" :app-name="$item['appName']" :title="$item['title'] ?? null" :body="$item['body'] ?? null" :time="$item['time'] ?? null"
                :actions="$item['actions'] ?? []" :activatable="$item['activatable'] ?? false" :dismiss-after="$item['dismissAfter'] ?? 0" :labels="$labels" :locale="$locale" class="pointer-events-auto w-full" />
        </div>
    @endforeach
</div>
