{{-- Internal: the extra detail sheet content of one listing (port of the React `detail`). Rendered by workflow-marketplace.blade.php. --}}
@props(['listing', 't'])
@php $steps = $listing['step'] ?? null; @endphp
@if (($listing['kind'] ?? 'step') === 'preset' && ! empty($listing['preset']))
    <section class="flex flex-col gap-1.5">
        <h4 class="eyebrow">
            {{ $t['preview'] }} <x-nq::badge variant="neutral">{{ $t['stepsCount'](number_format(count($listing['preset']['steps']), 0, '.', ',')) }}</x-nq::badge>
        </h4>
        <x-nq::workflow-network :steps="$listing['preset']['steps']" :links="$listing['preset']['links'] ?? null" layout="vertical" />
    </section>
@elseif ($steps)
    <section class="grid grid-cols-2 gap-3">
        @foreach ([[$t['inputs'], $steps['inputs'] ?? []], [$t['outputs'], $steps['outputs'] ?? []]] as [$title, $list])
            <div class="flex flex-col gap-1.5">
                <h4 class="eyebrow">{{ $title }}</h4>
                <div class="flex flex-wrap gap-1.5">
                    @forelse ($list as $x)
                        <x-nq::badge variant="outline">{{ $x }}</x-nq::badge>
                    @empty
                        <span class="text-caption text-muted-foreground">{{ $t['none'] }}</span>
                    @endforelse
                </div>
            </div>
        @endforeach
    </section>
    @if (! empty($steps['fields']))
        <section class="flex flex-col gap-1.5">
            <h4 class="eyebrow">{{ $t['fields'] }}</h4>
            <ul class="divide-y divide-border rounded-card border border-border">
                @foreach ($steps['fields'] as $f)
                    <li class="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                        <span class="text-foreground">
                            {{ $f['label'] }}
                            @if (! empty($f['required']))<span class="ms-1 text-caption text-muted-foreground">({{ $t['required'] }})</span>@endif
                        </span>
                        <code dir="ltr" class="text-caption text-muted-foreground">{{ $f['kind'] }}</code>
                    </li>
                @endforeach
            </ul>
        </section>
    @endif
@endif
