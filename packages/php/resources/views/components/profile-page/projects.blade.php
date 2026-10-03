{{-- <x-nq::profile-page.projects :projects="[['slug' => 'atlas', 'title' => 'Atlas', 'description' => '…', 'category' => 'Web', 'tags' => ['Vue'], 'href' => '…', 'repoHref' => '…', 'featured' => true]]" />
     The featured project as a feature story, then a grid of the rest filtered by category tabs (all panels are rendered; the tabs switch them). --}}
@props(['projects' => [], 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $projects = array_values(array_map(fn ($x) => (array) $x, (array) $projects));
    $featured = null;
    foreach ($projects as $i => $p) {
        if (! empty($p['featured'])) {
            $featured = $p;
            unset($projects[$i]);
            break;
        }
    }
    $rest = array_values($projects);
    $categories = nq_pp_distinct($rest, 'category');
    $panels = array_merge(['all' => $rest], array_combine($categories, array_map(fn ($c) => array_values(array_filter($rest, fn ($p) => ($p['category'] ?? null) === $c)), $categories)) ?: []);
    $count = count($rest) + ($featured ? 1 : 0);
@endphp
<x-nq::profile-page.section :title="$t['projects']" :description="$t['projectsHint']" :count="$count" :locale="$locale" {{ $attributes }}>
    @if ($featured)
        <x-nq::feature-story title-as="h3" :eyebrow="$t['featuredProject']" :title="$featured['title']" :description="$featured['description'] ?? null" :points="$featured['points'] ?? []" class="rounded-card border border-border bg-card p-4 @3xl:p-6">
            <x-slot:media><x-nq::blog-index.post-cover :post="$featured" ratio="aspect-[4/3]" /></x-slot:media>
            @if (! empty($featured['href']))
                <x-slot:action><x-nq::button variant="secondary" :href="$featured['href']" target="_blank" rel="noopener noreferrer">{{ $t['viewProject'] }}<x-nq::icon name="arrow-right" directional /></x-nq::button></x-slot:action>
            @endif
        </x-nq::feature-story>
    @endif
    <x-nq::tabs default-value="all">
        @if (count($categories) > 1)
            <x-nq::tabs.list variant="underline" :aria-label="$t['projectsNav']">
                <x-nq::tabs.tab value="all">{{ $t['allProjects'] }}</x-nq::tabs.tab>
                @foreach ($categories as $c)<x-nq::tabs.tab :value="$c">{{ $c }}</x-nq::tabs.tab>@endforeach
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>
        @endif
        @foreach ($panels as $value => $items)
            <x-nq::tabs.panel :value="(string) $value">
                <ul class="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                    @foreach ($items as $p)
                        <li class="flex">
                            <div class="min-w-0 flex-1">
                                <x-nq::card data-slot="project-card" class="group/project relative h-full gap-0 overflow-hidden py-0 transition-colors duration-150 ease-nq hover:bg-nq-hover">
                                    <x-nq::blog-index.post-cover :post="$p" class="rounded-none border-0 border-b border-border" ratio="aspect-[16/10]" />
                                    <div class="flex flex-1 flex-col items-start gap-2 p-4">
                                        @if (! empty($p['category']))<x-nq::badge variant="tag" :hue="nq_pp_hue($p['category'])">{{ $p['category'] }}</x-nq::badge>@endif
                                        <h3 dir="auto" class="text-h3 text-foreground">
                                            @if (! empty($p['href']))<a href="{{ $p['href'] }}" target="_blank" rel="noopener noreferrer" class="rounded-[2px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-nq-focus">{{ $p['title'] }}</a>@else{{ $p['title'] }}@endif
                                        </h3>
                                        <p dir="auto" class="line-clamp-3 text-body-sm text-muted-foreground">{{ $p['description'] ?? '' }}</p>
                                        @if (! empty($p['tags']))
                                            <ul class="flex flex-wrap gap-1.5">@foreach ($p['tags'] as $tag)<li><x-nq::badge variant="outline"><bdi>{{ $tag }}</bdi></x-nq::badge></li>@endforeach</ul>
                                        @endif
                                        @if (! empty($p['repoHref']))
                                            <a href="{{ $p['repoHref'] }}" target="_blank" rel="noopener noreferrer" class="relative z-10 mt-auto inline-flex items-center gap-1 pt-1 text-body-sm text-muted-foreground underline decoration-nq-line-strong underline-offset-4 hover:text-foreground">{{ $t['viewCode'] }}<x-nq::icon name="external-link" class="size-3.5" /></a>
                                        @endif
                                    </div>
                                </x-nq::card>
                            </div>
                        </li>
                    @endforeach
                </ul>
            </x-nq::tabs.panel>
        @endforeach
    </x-nq::tabs>
</x-nq::profile-page.section>
