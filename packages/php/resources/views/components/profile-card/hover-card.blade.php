{{-- <x-nq::profile-card.hover-card :person="$sara" message view-profile><span>@sara</span></x-nq::profile-card.hover-card>
     Wraps any trigger so that hovering, focusing or tapping it opens the person's profile card.
     The slot is the trigger's content, rendered inside a button (as="span" for inline text such as a mention chip; then it is focusable with role="button").
     person, viewer-time-zone, now, message, mention, view-profile, labels: as on <x-nq::profile-card>.
     delay (default 300) and close-delay (default 150): ms. side (default bottom) and align (default start) place the card.
     Touch: a tap toggles it; a tap outside closes it. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.profile-card._profile')
@props(['person', 'as' => 'button', 'delay' => 300, 'closeDelay' => 150, 'side' => 'bottom', 'align' => 'start', 'viewerTimeZone' => null, 'now' => null, 'message' => false, 'mention' => false, 'viewProfile' => false, 'labels' => [], 'open' => false])
@php
    $t = nq_profile_t($labels);
    $placement = $align === 'center' ? $side : $side.'-'.$align;
    $name = $person['name'] ?? '';
@endphp
<div data-slot="profile-hover-card" x-data="nqProfileHoverCard(@js((int) $delay), @js((int) $closeDelay), @js((bool) $open))" class="contents">
    <{{ $as }} x-ref="trigger" x-bind="trigger"
        @if ($as === 'button') type="button" @else tabindex="0" role="button" @endif
        {{ $attributes->merge(['data-slot' => 'profile-hover-card-trigger']) }}>{{ $slot }}</{{ $as }}>
    <template x-teleport="body">
        <div data-slot="profile-hover-card-content" role="dialog" aria-label="{{ nq_profile_fill($t['profileOf'], ['name' => $name]) }}"
            x-bind="popup" x-nq-presence="open" x-anchor.{{ $placement }}.offset.6="$refs.trigger"
            class="z-50 w-80 max-w-[var(--available-width)] rounded-floating border border-border bg-popover p-4 text-body-sm text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
            <x-nq::profile-card :person="$person" :viewer-time-zone="$viewerTimeZone" :now="$now" :message="$message" :mention="$mention" :view-profile="$viewProfile" :labels="$labels" />
        </div>
    </template>
</div>
