{{-- <x-nq::profile-page.account :details="[['label' => 'Email', 'value' => 'laylah@example.com']]" />
     The owner account at a glance. Only render it for the owner. description: replaces "Only you can see this." --}}
@props(['details' => [], 'description' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
@endphp
<x-nq::profile-page.section :title="$t['account']" :locale="$locale" {{ $attributes }}>
    <x-slot:description>
        @if ($description !== null)
            {{ $description }}
        @else
            <span class="inline-flex items-center gap-1.5"><x-nq::icon name="lock" class="size-3.5" />{{ $t['accountHint'] }}</span>
        @endif
    </x-slot:description>
    <dl class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        @foreach ($details as $d)
            <div class="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                <dt class="text-body-sm text-muted-foreground">{{ $d['label'] }}</dt>
                <dd class="min-w-0 text-body-sm text-foreground">{{ $d['value'] }}</dd>
            </div>
        @endforeach
    </dl>
</x-nq::profile-page.section>
