{{-- <x-nq::profile-card.mention-chip name="sara" :person="$sara" />
     An inline @name in a comment or message. With person it opens their profile card on hover, focus and tap.
     kind: person (default) | team | group. Teams and groups get an icon and no card.
     viewer-time-zone, now, message, mention, view-profile, labels: passed to the card. --}}
@props(['name', 'kind' => 'person', 'person' => null, 'viewerTimeZone' => null, 'now' => null, 'message' => false, 'mention' => false, 'viewProfile' => false, 'labels' => []])
@php
    $chip = 'inline-flex max-w-full items-center gap-1 rounded-control bg-nq-selected px-1.5 py-px align-baseline text-body-sm font-medium text-foreground outline-none [&_svg]:size-3.5 [&_svg]:shrink-0';
    $hoverClass = \Nasaq\Cn::merge($chip, 'cursor-pointer hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus', (string) $attributes->get('class'));
@endphp
@if (! $person || $kind !== 'person')
    <span data-slot="{{ $attributes->get('data-slot', 'mention-chip') }}" data-kind="{{ $kind }}" {{ $attributes->except('data-slot')->cn($chip) }}>
        @if ($kind !== 'person')<x-lucide-users aria-hidden="true" />@endif
        <span class="truncate">{{ '@'.$name }}</span>
    </span>
@else
    <x-nq::profile-card.hover-card as="span" :person="$person" :viewer-time-zone="$viewerTimeZone" :now="$now" :message="$message" :mention="$mention" :view-profile="$viewProfile" :labels="$labels"
        data-slot="mention-chip" data-kind="{{ $kind }}"
        :class="$hoverClass">
        <span class="truncate">{{ '@'.$name }}</span>
    </x-nq::profile-card.hover-card>
@endif
