{{-- <x-nq::profile-page.testimonials :testimonials="[['quote' => '…', 'name' => 'Omar', 'role' => 'CTO', 'avatar' => null]]" /> --}}
@props(['testimonials' => [], 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $testimonials = array_values(array_map(fn ($x) => (array) $x, (array) $testimonials));
@endphp
<x-nq::profile-page.section :title="$t['testimonials']" :description="$t['testimonialsHint']" :count="count($testimonials)" :locale="$locale" {{ $attributes }}>
    <ul class="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        @foreach ($testimonials as $q)
            <li class="flex">
                <x-nq::card class="w-full gap-3 p-4">
                    <x-nq::icon name="quote" class="size-5 text-nq-accent-text" />
                    <blockquote dir="auto" class="text-pretty text-body text-foreground">{{ $q['quote'] }}</blockquote>
                    <footer class="mt-auto flex items-center gap-2.5">
                        <x-nq::avatar :name="$q['name']" :src="$q['avatar'] ?? null" />
                        <div class="flex flex-col leading-tight">
                            <bdi class="text-label text-foreground">{{ $q['name'] }}</bdi>
                            @if (! empty($q['role']))<span class="text-caption text-muted-foreground">{{ $q['role'] }}</span>@endif
                        </div>
                    </footer>
                </x-nq::card>
            </li>
        @endforeach
    </ul>
</x-nq::profile-page.section>
