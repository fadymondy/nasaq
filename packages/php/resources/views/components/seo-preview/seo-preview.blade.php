{{-- <x-nq::seo-preview :meta="['title' => 'RTL guide', 'description' => '…', 'url' => 'https://nasaq.dev/blog/rtl-guide']" />
     A Google result (desktop and mobile) and Open Graph, X, WhatsApp and LinkedIn share cards for one page, with title and description length meters.
     meta: ['title', 'description', 'url', 'siteName', 'favicon', 'image', 'breadcrumb' => [..]]. platform: google (default) | open-graph | x | whatsapp | linkedin.
     editable: show the title, URL, description and image fields; edits update the previews live and dispatch a bubbling "nq-seo-preview-change" (the whole meta).
     title, description: header text. labels: array overriding the built-in words. Platform names are text: no logo is drawn.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['meta' => [], 'platform' => 'google', 'editable' => false, 'title' => null, 'description' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar
        ? ['title' => 'معاينة SEO', 'description' => 'كيف تظهر هذه الصفحة في نتائج البحث وعند مشاركتها.', 'desktop' => 'سطح المكتب', 'mobile' => 'الجوال', 'device' => 'الجهاز', 'fieldTitle' => 'العنوان', 'fieldDescription' => 'الوصف التعريفي', 'fieldImage' => 'رابط صورة المشاركة', 'fieldUrl' => 'رابط الصفحة', 'length' => '{n} من {max} حرفًا', 'empty' => 'فارغ', 'short' => 'قصير جدًا', 'good' => 'طول مناسب', 'longOne' => 'حرف واحد زائد', 'longMany' => '{n} حرفًا زائدًا', 'lengthOf' => 'طول {what}', 'noTitle' => 'صفحة بلا عنوان', 'noDescription' => 'لا وصف. ستختار محركات البحث نصًا من الصفحة.', 'noImage' => 'لا صورة للمشاركة', 'siteFallback' => 'موقعك']
        : ['title' => 'SEO preview', 'description' => 'How this page looks in search results and when it is shared.', 'desktop' => 'Desktop', 'mobile' => 'Mobile', 'device' => 'Device', 'fieldTitle' => 'Title', 'fieldDescription' => 'Meta description', 'fieldImage' => 'Share image URL', 'fieldUrl' => 'Page URL', 'length' => '{n} of {max} characters', 'empty' => 'Empty', 'short' => 'Too short', 'good' => 'Good length', 'longOne' => '1 character too long', 'longMany' => '{n} characters too long', 'lengthOf' => '{what} length', 'noTitle' => 'Untitled page', 'noDescription' => 'No description. Search engines will pick text from the page.', 'noImage' => 'No share image', 'siteFallback' => 'Your site'], (array) $labels);
    $platforms = ['google' => 'Google', 'open-graph' => 'Open Graph', 'x' => 'X', 'whatsapp' => 'WhatsApp', 'linkedin' => 'LinkedIn'];
    $words = array_intersect_key($t, array_flip(['noTitle', 'noDescription', 'siteFallback', 'length', 'empty', 'short', 'good', 'longOne', 'longMany']));
    $hide = 'style="display: none"';
    $tones = ['neutral' => 'text-muted-foreground', 'warning' => 'text-nq-warning-text', 'success' => 'text-nq-success-text', 'danger' => 'text-nq-danger-text'];
    $fills = ['neutral' => 'bg-primary', 'warning' => 'bg-nq-warning', 'success' => 'bg-nq-success', 'danger' => 'bg-nq-danger'];
    $favicon = 'flex size-[18px] shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold uppercase text-muted-foreground';
    $placeholder = 'flex flex-col items-center justify-center gap-1 bg-secondary text-caption text-muted-foreground';
@endphp
<x-nq::card data-slot="seo-preview" :attributes="$attributes">
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $t['title'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $t['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-5">
        <div x-data="nqSeoPreview({{ \Illuminate\Support\Js::from((object) $meta) }}, {{ \Illuminate\Support\Js::from($words) }})" class="flex flex-col gap-5">
            <x-nq::tabs :default-value="$platform">
                <x-nq::tabs.list variant="underline">
                    @foreach ($platforms as $id => $name)
                        <x-nq::tabs.tab :value="$id">{{ $name }}</x-nq::tabs.tab>
                    @endforeach
                    <x-nq::tabs.indicator />
                </x-nq::tabs.list>

                <x-nq::tabs.panel value="google" class="flex flex-col gap-3 pt-4">
                    <x-nq::toggle-group x-model="device" :default-value="['desktop']" :aria-label="$t['device']">
                        <x-nq::toggle-group.toggle value="desktop"><x-lucide-monitor aria-hidden="true" />{{ $t['desktop'] }}</x-nq::toggle-group.toggle>
                        <x-nq::toggle-group.toggle value="mobile"><x-lucide-smartphone aria-hidden="true" />{{ $t['mobile'] }}</x-nq::toggle-group.toggle>
                    </x-nq::toggle-group>
                    <div data-slot="seo-google" x-bind:data-device="mobile ? 'mobile' : 'desktop'" data-device="desktop"
                        x-bind:class="mobile ? 'w-full max-w-[22rem]' : 'max-w-[41rem]'" class="flex max-w-[41rem] flex-col gap-1 rounded-card border border-border bg-card p-4">
                        <div class="flex items-center gap-2.5">
                            <img x-show="favicon" x-bind:src="favicon || null" alt="" class="size-7 shrink-0 rounded-full border border-border" {!! $hide !!}>
                            <span x-show="! favicon" aria-hidden="true" x-text="firstLetter" class="{{ $favicon }} size-7 border border-border"></span>
                            <div class="flex min-w-0 flex-col leading-tight">
                                <span class="truncate text-body-sm text-foreground" dir="auto" x-text="site"></span>
                                <span dir="ltr" class="flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
                                    <template x-for="(c, i) in crumbs" x-bind:key="i + c">
                                        <span class="flex min-w-0 items-center gap-1">
                                            <x-lucide-chevron-right aria-hidden="true" x-show="i > 0" class="size-3 shrink-0" />
                                            <span class="truncate" x-text="c"></span>
                                        </span>
                                    </template>
                                </span>
                            </div>
                        </div>
                        <p dir="auto" x-bind:class="mobile ? 'line-clamp-2 text-body' : 'line-clamp-1 text-h5'" x-text="googleTitle" class="mt-1 line-clamp-1 text-h5 font-medium text-nq-info-text"></p>
                        <p dir="auto" x-bind:class="mobile ? 'line-clamp-3' : 'line-clamp-2'" x-text="googleDescription" class="line-clamp-2 text-body-sm text-muted-foreground"></p>
                    </div>
                </x-nq::tabs.panel>

                <x-nq::tabs.panel value="open-graph" class="pt-4">
                    <div data-slot="seo-open-graph" class="w-full max-w-[32rem] overflow-hidden rounded-card border border-border bg-card">
                        <img x-show="image" x-bind:src="image || null" alt="" class="aspect-[1.91/1] w-full object-cover" {!! $hide !!}>
                        <div x-show="! image" class="{{ $placeholder }} aspect-[1.91/1] w-full"><x-lucide-image aria-hidden="true" class="size-6" />{{ $t['noImage'] }}</div>
                        <div class="flex flex-col gap-0.5 border-t border-border bg-secondary/50 p-3">
                            <span dir="ltr" class="truncate text-start text-caption uppercase text-muted-foreground" x-text="host"></span>
                            <p dir="auto" class="line-clamp-2 text-label text-foreground" x-text="shownTitle"></p>
                            <p dir="auto" class="line-clamp-2 text-caption text-muted-foreground" x-text="shownDescription"></p>
                        </div>
                    </div>
                </x-nq::tabs.panel>

                <x-nq::tabs.panel value="x" class="pt-4">
                    <div data-slot="seo-x" class="w-full max-w-[32rem]">
                        <div class="relative overflow-hidden rounded-2xl border border-border bg-card">
                            <img x-show="image" x-bind:src="image || null" alt="" class="aspect-[2/1] w-full object-cover" {!! $hide !!}>
                            <div x-show="! image" class="{{ $placeholder }} aspect-[2/1] w-full"><x-lucide-image aria-hidden="true" class="size-6" />{{ $t['noImage'] }}</div>
                            <span dir="auto" class="absolute bottom-2 start-2 max-w-[80%] truncate rounded-md bg-foreground/70 px-1.5 py-0.5 text-caption text-background" x-text="shownTitle"></span>
                        </div>
                        <p dir="ltr" class="mt-1 px-1 text-start text-caption text-muted-foreground" x-text="host"></p>
                    </div>
                </x-nq::tabs.panel>

                <x-nq::tabs.panel value="whatsapp" class="pt-4">
                    <div data-slot="seo-whatsapp" class="flex w-full max-w-[24rem] flex-col gap-1 rounded-card bg-secondary p-2">
                        <div class="overflow-hidden rounded-md bg-card">
                            <img x-show="image" x-bind:src="image || null" alt="" class="aspect-[1.91/1] w-full object-cover" {!! $hide !!}>
                            <div x-show="! image" class="{{ $placeholder }} aspect-[1.91/1] w-full"><x-lucide-image aria-hidden="true" class="size-6" />{{ $t['noImage'] }}</div>
                            <div class="flex flex-col gap-0.5 p-2.5">
                                <p dir="auto" class="line-clamp-2 text-label text-foreground" x-text="shownTitle"></p>
                                <p dir="auto" class="line-clamp-2 text-caption text-muted-foreground" x-text="shownDescription"></p>
                                <span dir="ltr" class="truncate text-start text-caption text-muted-foreground" x-text="host"></span>
                            </div>
                        </div>
                        <span dir="ltr" class="truncate px-1 text-start text-caption text-nq-info-text" x-text="url"></span>
                    </div>
                </x-nq::tabs.panel>

                <x-nq::tabs.panel value="linkedin" class="pt-4">
                    <div data-slot="seo-linkedin" class="w-full max-w-[32rem] overflow-hidden rounded-card border border-border bg-card">
                        <img x-show="image" x-bind:src="image || null" alt="" class="aspect-[1.91/1] w-full object-cover" {!! $hide !!}>
                        <div x-show="! image" class="{{ $placeholder }} aspect-[1.91/1] w-full"><x-lucide-image aria-hidden="true" class="size-6" />{{ $t['noImage'] }}</div>
                        <div class="flex flex-col gap-0.5 p-3">
                            <p dir="auto" class="line-clamp-2 text-label text-foreground" x-text="shownTitle"></p>
                            <span dir="ltr" class="truncate text-start text-caption text-muted-foreground" x-text="host"></span>
                        </div>
                    </div>
                </x-nq::tabs.panel>
            </x-nq::tabs>

            <div class="grid gap-4 md:grid-cols-2">
                @if ($editable)
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['fieldTitle'] }}</x-nq::field.label>
                        <x-nq::field.input dir="auto" x-model="title" x-on:input="changed()" />
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['fieldUrl'] }}</x-nq::field.label>
                        <x-nq::field.input ltr x-model="url" x-on:input="changed()" />
                    </x-nq::field>
                    <x-nq::field class="md:col-span-2">
                        <x-nq::field.label>{{ $t['fieldDescription'] }}</x-nq::field.label>
                        <x-nq::field.textarea dir="auto" rows="3" x-model="description" x-on:input="changed()" />
                    </x-nq::field>
                    <x-nq::field class="md:col-span-2">
                        <x-nq::field.label>{{ $t['fieldImage'] }}</x-nq::field.label>
                        <x-nq::field.input ltr x-model="image" x-on:input="changed()" />
                    </x-nq::field>
                @endif
                @foreach (['title' => ['titleMeter', $t['fieldTitle']], 'description' => ['descMeter', $t['fieldDescription']]] as $field => [$m, $name])
                    <div data-slot="length-meter" x-bind:data-status="{{ $m }}.status" class="flex flex-col gap-1.5">
                        <div class="flex items-baseline justify-between gap-3 text-caption">
                            <span class="min-w-0 truncate text-muted-foreground">{{ $name }}</span>
                            <bdi class="shrink-0 tabular-nums text-muted-foreground" x-text="{{ $m }}.text"></bdi>
                        </div>
                        <div data-slot="meter" role="meter" aria-label="{{ str_replace('{what}', $name, $t['lengthOf']) }}" aria-valuemin="0" x-bind:aria-valuemax="{{ $m }}.max" x-bind:aria-valuenow="{{ $m }}.length" x-bind:aria-valuetext="{{ $m }}.text" x-bind:data-tone="{{ $m }}.tone === 'neutral' ? 'default' : {{ $m }}.tone" class="flex w-full flex-col gap-1.5">
                            <div data-slot="meter-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                                <div data-slot="meter-indicator" style="inset-inline-start:0;width:0%" x-bind:style="'inset-inline-start:0;width:' + {{ $m }}.percent + '%'"
                                    x-bind:class="{ @foreach ($fills as $k => $cls) '{{ $cls }}': {{ $m }}.tone === '{{ $k }}', @endforeach }" class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                            </div>
                        </div>
                        <span data-slot="status" x-bind:data-tone="{{ $m }}.tone" class="inline-flex min-w-0 items-center gap-1.5 text-body-sm text-caption"
                            x-bind:class="{ @foreach ($tones as $k => $cls) '{{ $cls }}': {{ $m }}.tone === '{{ $k }}', @endforeach }"><span class="truncate" x-text="{{ $m }}.verdict"></span></span>
                    </div>
                @endforeach
            </div>
        </div>
    </x-nq::card.content>
</x-nq::card>
