{{-- <x-nq::desktop-notification platform="windows" app-name="Nasaq" title="Deploy finished" body="Production is on v1.4.2." :actions="[['id' => 'open', 'label' => 'Open']]" :dismiss-after="6000" />
     A notification card drawn in the style of the system's own (macos | windows), for Electron apps, previews and tutorials. It does not raise a real
     system notification: use new Notification() for that. app-name: the sender. title / body: text (or the default slot for the title).
     time: when it arrived (omit for "now"). actions: [['id' => ..., 'label' => ...]]. activatable: the card body is a live button. dismiss-after: ms before it
     closes itself (hover or focus pauses; 0 keeps it). Slots: app-icon (replaces the first-letter tile), image.
     Events (bubbling, from the card): nq-close, nq-action {id}, nq-activate. nq-close removes the card unless you preventDefault it. --}}
@props(['platform' => 'macos', 'appName', 'title' => null, 'body' => null, 'time' => null, 'actions' => [], 'activatable' => false, 'dismissAfter' => 0, 'labels' => [], 'locale' => null, 'appIcon' => null, 'image' => null])
@include('nasaq::components.desktop-notification._words')
@php
    $locale ??= app()->getLocale();
    $t = nq_dn_words($locale, $labels);
    $mac = $platform === 'macos';
    $heading = $title ?? ($slot->isEmpty() ? '' : $slot);
    $hasImage = $image && ! $image->isEmpty();
    $hasIcon = $appIcon && ! $appIcon->isEmpty();
    $timeText = $time === null
        ? $t['now']
        : null;
@endphp
<div role="alert" data-slot="{{ $attributes->get('data-slot', 'desktop-notification') }}" data-platform="{{ $platform }}"
    x-data="nqDesktopNotification({{ (int) $dismissAfter }})"
    x-on:mouseenter="pause()" x-on:mouseleave="resume()" x-on:focusin="pause()" x-on:focusout="resume()"
    {{ $attributes->except('data-slot')->cn(['group/dn relative flex w-[22rem] max-w-full gap-2 border border-border text-foreground shadow-floating', 'flex-col p-3', $mac ? 'rounded-[1.1rem] bg-popover/90 backdrop-blur-xl' : 'rounded-card bg-card']) }}>
    <div class="flex min-w-0 flex-1 gap-3 {{ $mac ? '' : 'items-start' }}">
        <span class="shrink-0 self-start {{ $mac ? 'size-10' : 'size-6' }}">
            @if ($hasIcon)
                {{ $appIcon }}
            @else
                <span aria-hidden="true" class="grid size-full place-items-center bg-primary text-label text-primary-foreground {{ $mac ? 'rounded-[22%]' : 'rounded-control' }}">{{ mb_strtoupper(mb_substr($appName, 0, 1)) }}</span>
            @endif
        </span>
        <button type="button" @unless ($activatable) disabled @endunless x-on:click="activate()"
            class="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus {{ $activatable ? 'cursor-default' : 'cursor-default disabled:opacity-100' }}">
            @unless ($mac)
                <span class="flex w-full items-center gap-2 text-caption text-muted-foreground"><span class="truncate">{{ $appName }}</span></span>
            @endunless
            <span dir="auto" class="w-full truncate text-label">{{ $heading }}</span>
            @if ($body)<span dir="auto" class="line-clamp-3 w-full text-body-sm text-nq-fg-body">{{ $body }}</span>@endif
        </button>
        @if ($mac)
            <span class="flex shrink-0 flex-col items-end gap-1 text-caption text-muted-foreground">
                <span>@if ($timeText){{ $timeText }}@else<x-nq::numeric.date-time :value="$time" time-style="short" :locale="$locale" />@endif</span>
                @if ($hasImage)<span class="size-10 overflow-hidden rounded-control">{{ $image }}</span>@endif
            </span>
        @else
            <span class="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                <span class="me-1 text-caption">@if ($timeText){{ $timeText }}@else<x-nq::numeric.date-time :value="$time" time-style="short" :locale="$locale" />@endif</span>
                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['options'] }}" tabindex="-1"><x-lucide-ellipsis aria-hidden="true" class="size-4" /></x-nq::button>
                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['close'] }}" x-on:click="close()"><x-lucide-x aria-hidden="true" class="size-4" /></x-nq::button>
            </span>
        @endif
    </div>
    @if (! $mac && $hasImage)<div class="overflow-hidden rounded-control">{{ $image }}</div>@endif
    @if (count($actions))
        <div class="flex gap-2 {{ $mac ? 'ps-[3.25rem]' : '' }}" role="group" aria-label="{{ $appName }}">
            @foreach ($actions as $a)
                <x-nq::button variant="secondary" size="sm" class="{{ $mac ? '' : 'flex-1' }}" data-action="{{ $a['id'] }}" x-on:click="act($el.dataset.action)">{{ $a['label'] }}</x-nq::button>
            @endforeach
        </div>
    @endif
    @if ($mac)
        <x-nq::button variant="secondary" size="icon-sm" aria-label="{{ $t['close'] }}" x-on:click="close()"
            class="absolute -start-2 -top-2 size-5 rounded-full opacity-0 transition-opacity duration-150 ease-nq focus-visible:opacity-100 group-hover/dn:opacity-100"><x-lucide-x aria-hidden="true" class="size-3" /></x-nq::button>
    @endif
</div>
