{{-- <x-nq::store-chrome.announcement-bar :items="[['id' => 'ship', 'content' => 'Free shipping over $50'], ['id' => 'ret', 'content' => 'Free returns', 'href' => '/returns']]" />
     A thin bar above the header. Several messages rotate on a timer that stops on hover, focus and reduced motion, and can be stepped by hand.
     Each message can be dismissed. It announces changes politely only when stepped manually. Needs the Alpine runtime (@nasaqScripts).
     items: ['id', 'content', 'href' => makes the message a link, 'from' / 'until' => epoch ms window]. interval: ms each message stays (5000; 0 turns rotation off).
     dismissible: the close button (true). labels: override any string (announcements, dismiss, previousAnnouncement, nextAnnouncement, announcementOf).
     Event: nq-store-dismiss { id }. --}}
@include('nasaq::components.store-chrome._strings')
@props(['items' => [], 'interval' => 5000, 'dismissible' => true, 'labels' => []])
@php
    $L = nq_sch_all((array) $labels);
    $items = array_values(array_map(fn ($i) => (array) $i, (array) $items));
    $first = $items[0] ?? null;
    $many = count($items) > 1;
    $locale = \Nasaq\Nasaq::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale());
    $cfg = ['items' => $items, 'interval' => (int) $interval, 'dismissible' => (bool) $dismissible, 'locale' => $locale, 'labels' => ['announcementOf' => $L['announcementOf']]];
    $icon = 'text-current hover:bg-white/15';
@endphp
@if ($first)
    <div data-slot="{{ $attributes->get('data-slot', 'store-announcement-bar') }}" role="region" aria-roledescription="carousel" aria-label="{{ $L['announcements'] }}"
        x-data="nqStoreAnnouncements(@js($cfg))" x-show="visible" x-on:mouseenter="hold = true" x-on:mouseleave="hold = false" x-on:focusin="hold = true" x-on:focusout="hold = false"
        {{ $attributes->except('data-slot')->cn('flex min-h-9 items-center gap-2 bg-primary px-3 text-body-sm text-primary-foreground') }}>
        <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $L['previousAnnouncement'] }}" class="{{ $icon }}" x-show="many" x-on:click="step(-1)" :style="$many ? null : 'display: none'"><x-lucide-chevron-left class="size-4 rtl:-scale-x-100" /></x-nq::button>
        <span class="size-control-sm shrink-0" aria-hidden="true" x-show="!many" @if ($many) style="display: none" @endif></span>
        <p x-bind:aria-live="manual ? 'polite' : 'off'" aria-atomic="true" class="min-w-0 flex-1 truncate text-center">
            <a x-show="current.href" x-bind:href="current.href" x-text="current.content" class="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                @if (empty($first['href'])) style="display: none" @endif>{{ $first['content'] }}</a>
            <span x-show="!current.href" x-text="current.href ? '' : current.content" @if (! empty($first['href'])) style="display: none" @endif>{{ $first['content'] }}</span>
            <span class="sr-only" x-show="many" x-text="many ? ' (' + position + ')' : ''" @unless ($many) style="display: none" @endunless></span>
        </p>
        <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $L['nextAnnouncement'] }}" class="{{ $icon }}" x-show="many" x-on:click="step(1)" :style="$many ? null : 'display: none'"><x-lucide-chevron-right class="size-4 rtl:-scale-x-100" /></x-nq::button>
        @if ($dismissible)
            <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $L['dismiss'] }}" class="{{ $icon }}" x-on:click="dismiss()"><x-lucide-x class="size-4" /></x-nq::button>
        @else
            <span class="size-control-sm shrink-0" aria-hidden="true"></span>
        @endif
    </div>
@endif
