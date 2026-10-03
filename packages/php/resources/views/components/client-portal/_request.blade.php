{{-- Internal: the inside of one request row of x-nq::client-portal. Needs $r, $t, $requestTone, $locale. --}}
<div class="flex flex-wrap items-center justify-between gap-2">
    <span class="font-medium">{{ $r['title'] }}</span>
    <x-nq::status :tone="$requestTone[$r['status']]">{{ $t['requestStatus'][$r['status']] }}</x-nq::status>
</div>
@if (! empty($r['description']))<p class="text-body-sm text-muted-foreground">{{ $r['description'] }}</p>@endif
@if (! empty($r['reply']))<p class="text-body-sm">{{ $r['reply'] }}</p>@endif
<p class="text-caption text-muted-foreground">{{ ! empty($r['by']) ? $t['by'].' '.$r['by'].' · ' : '' }}{{ nq_cp_date($r['createdAt'], $locale) }}</p>
