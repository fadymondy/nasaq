{{-- Internal: the "What is new" list shared by app-update.sheet and app-update.forced-gate. Included with
     @include('nasaq::components.app-update._notes', ['notes' => [...], 't' => $t, 'id' => '...']). Notes: [['type' => 'new|improved|fixed', 'text' => '...'], ...]. --}}
@php
    $kinds = ['new' => ['info', $t['typeNew']], 'improved' => ['accent', $t['typeImproved']], 'fixed' => ['success', $t['typeFixed']]];
@endphp
<section aria-labelledby="{{ $id }}" class="flex flex-col gap-2">
    <h3 id="{{ $id }}" class="text-label text-foreground">{{ $t['whatsNew'] }}</h3>
    @if (! empty($notes))
        <ul class="flex flex-col gap-2">
            @foreach ($notes as $note)
                @php([$variant, $label] = $kinds[$note['type'] ?? 'new'] ?? $kinds['new'])
                <li class="flex items-start gap-2 text-body-sm text-nq-fg-body">
                    <x-nq::badge :variant="$variant" class="mt-0.5 shrink-0">{{ $label }}</x-nq::badge>
                    <span dir="auto">{{ $note['text'] }}</span>
                </li>
            @endforeach
        </ul>
    @else
        <p class="text-body-sm text-muted-foreground">{{ $t['noNotes'] }}</p>
    @endif
</section>
