{{-- <x-nq::marketplace.template-gallery :templates="$templates" :categories="$categories" use />
     Ready-made starting points: a preview, name, summary and a "Use template" button, filtered by category chips.
     templates: [['id', 'name', 'summary', 'category' (a category id)]] plus optional 'preview' (image URL), 'previewAlt', 'icon' (a lucide name, default layout-template), 'author', 'uses', 'tags'.
     categories: ['id', 'label']. use: shows the button (React's onUse). labels: overrides for the built-in strings.
     The button fires the bubbling `nq-use-template` ({ id, template, wait(promise) }) from the gallery: call event.detail.wait(promise) to keep it busy until it settles;
     resolve to ['error' => 'why'] (an object { error }) to show a failure. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['templates' => [], 'categories' => [], 'use' => false, 'labels' => []])
@include('nasaq::components.marketplace._strings')
@include('nasaq::components.catalog-store._strings')
@php
    $t = nq_marketplace_labels((array) $labels);
    $templates = array_values((array) $templates);
    $options = [
        'templates' => array_map(fn ($x) => ['id' => (string) $x['id'], 'category' => $x['category'], 'name' => $x['name']], $templates),
        'failed' => $t['failed'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'template-gallery') }}" x-data="nqTemplateGallery({!! \Illuminate\Support\Js::from($options) !!})" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <x-nq::chip-group default-value="all" x-model="category" aria-label="{{ $t['templateCategories'] }}">
        <x-nq::chip-group.chip value="all">{{ $t['allTemplates'] }}</x-nq::chip-group.chip>
        @foreach ($categories as $c)
            <x-nq::chip-group.chip :value="$c['id']">{{ $c['label'] }}</x-nq::chip-group.chip>
        @endforeach
    </x-nq::chip-group>
    <x-nq::states x-show="shown.length === 0" style="display: none" :title="$t['noTemplates']" :description="$t['noTemplatesBody']" />
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
        @foreach ($templates as $tpl)
            @php $id = (string) $tpl['id']; @endphp
            <li class="min-w-0" x-show="visible('{{ $id }}')">
                <article data-template="{{ $id }}" class="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-xs">
                    <div class="flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-border bg-secondary text-muted-foreground">
                        @if (! empty($tpl['preview']))
                            <img src="{{ $tpl['preview'] }}" alt="{{ $tpl['previewAlt'] ?? '' }}" class="size-full object-cover" />
                        @else
                            <x-dynamic-component :component="'lucide-'.($tpl['icon'] ?? 'layout-template')" aria-hidden="true" class="size-10" />
                        @endif
                    </div>
                    <div class="flex flex-1 flex-col gap-2 p-4">
                        <h3 dir="auto" class="text-label text-foreground">{{ $tpl['name'] }}</h3>
                        <p dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ $tpl['summary'] }}</p>
                        <div class="mt-auto flex items-center justify-between gap-2 pt-1">
                            <span class="min-w-0 truncate text-caption text-muted-foreground">
                                @if (isset($tpl['uses']))<bdi>{{ nq_catalog_compact($tpl['uses']) }}</bdi> {{ $t['uses'] }}@else{{ $tpl['author'] ?? '' }}@endif
                            </span>
                            @if ($use)
                                <x-nq::button size="sm" variant="secondary"
                                    x-bind:disabled="busy === '{{ $id }}'" x-bind:aria-busy="busy === '{{ $id }}' ? 'true' : null"
                                    x-on:click="use('{{ $id }}')">
                                    <x-nq::spinner x-show="busy === '{{ $id }}'" style="display: none" />
                                    <span x-text="busy === '{{ $id }}' ? @js($t['using']) : @js($t['useTemplate'])">{{ $t['useTemplate'] }}</span>
                                </x-nq::button>
                            @endif
                        </div>
                        <p role="alert" class="text-caption text-nq-danger-text" x-show="error && error.id === '{{ $id }}'" style="display: none" x-text="error ? error.message : ''"></p>
                    </div>
                </article>
            </li>
        @endforeach
    </ul>
</div>
