{{-- <x-nq::profile-card.presence-dot presence="online" />
     A small status dot. Not colour alone: offline is a hollow ring, and the state is spoken. presence: online | away | busy | offline.
     decorative hides the state from assistive tech when it is already written next to the dot. labels: array overriding the words. --}}
@include('nasaq::components.profile-card._profile')
@props(['presence', 'decorative' => false, 'labels' => []])
@php
    $t = nq_profile_t($labels);
    $dot = ['online' => 'bg-nq-success', 'away' => 'bg-nq-warning', 'busy' => 'bg-nq-danger', 'offline' => 'bg-popover ring-1 ring-inset ring-muted-foreground'];
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'presence-dot') }}" data-presence="{{ $presence }}"
    @if ($decorative) aria-hidden="true" @else role="img" aria-label="{{ $t[$presence] }}" @endif
    {{ $attributes->except('data-slot')->cn(['inline-block size-2.5 shrink-0 rounded-full', $dot[$presence] ?? $dot['offline']]) }}></span>
