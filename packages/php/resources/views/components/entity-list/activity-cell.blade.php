{{-- <x-nq::entity-list.activity-cell :value="$project->updated_at" />
     "3 days ago", with the full date on hover. A dash when there is no date. --}}
@props(['value' => null])
@if ($value === null)
    <span class="text-muted-foreground">—</span>
@else
    <x-nq::numeric.date-time :value="$value" relative {{ $attributes->cn('text-body-sm text-muted-foreground') }} />
@endif
