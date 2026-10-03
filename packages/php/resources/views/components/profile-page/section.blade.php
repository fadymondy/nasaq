{{-- <x-nq::profile-page.section title="Orders" :count="3" description="…"><x-slot:action>…</x-slot:action> content </x-nq::profile-page.section>
     A titled block of the profile: a header plus content, labelled by its heading. count: a badge beside the title (0 is shown too).
     The description slot takes markup; the action slot sits at the inline end of the header. --}}
@props(['title', 'description' => null, 'count' => null, 'locale' => null, 'action' => null])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $has = fn ($v) => $v !== null && ! ($v instanceof \Illuminate\View\ComponentSlot && $v->isEmpty());
    $id = 'nq-profile-'.substr(md5((string) $title.(string) $locale), 0, 8);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'profile-section') }}" aria-labelledby="{{ $id }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div data-slot="section-header" class="flex items-end justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
            <h2 id="{{ $id }}" class="text-h2 text-foreground">
                @if ($count !== null)
                    <span class="inline-flex items-center gap-2">{{ $title }}<x-nq::badge variant="neutral" class="tabular-nums">{{ nq_pp_num($count, $locale) }}</x-nq::badge></span>
                @else
                    {{ $title }}
                @endif
            </h2>
            @if ($has($description))
                <p class="text-pretty text-body-sm text-muted-foreground">{{ $description }}</p>
            @endif
        </div>
        @if ($has($action))
            <div class="shrink-0">{{ $action }}</div>
        @endif
    </div>
    {{ $slot }}
</section>
