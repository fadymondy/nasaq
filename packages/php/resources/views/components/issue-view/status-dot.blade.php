{{-- <x-nq::issue-view.status-dot hue="green" />
     The round marker of a status in its hue (gray red orange amber green teal blue violet pink). Without a hue: a dashed circle. --}}
@props(['hue' => null])
@if ($hue)
    <span aria-hidden="true" data-slot="{{ $attributes->get('data-slot', 'status-dot') }}" style="background: var(--nq-tag-{{ $hue }})" {{ $attributes->except('data-slot')->cn('size-2.5 shrink-0 rounded-full') }}></span>
@else
    @svg('lucide-circle-dashed', (string) $attributes->cn('size-3.5 shrink-0 text-muted-foreground')->get('class'), ['aria-hidden' => 'true'])
@endif
