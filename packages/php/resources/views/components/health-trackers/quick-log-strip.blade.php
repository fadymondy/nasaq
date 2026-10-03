{{-- <x-nq::health-trackers.quick-log-strip :items="[['id' => 'water', 'name' => 'Water', 'nameAr' => 'ماء', 'icon' => 'glass-water']]" unpin catalogue-href="/catalogue" @log="$event.detail.wait(…)" @unpin="$event.detail.wait(…)" />
     The handful of things you log every day, as one-tap buttons in a row that scrolls with faded edges. A flagged entry is a warning, not an error: it was recorded. A refusal shows the server's sentence and, when it allows, "Log anyway".
     items: [id, name, nameAr?, icon? (a lucide icon name; the ones in `icons` are available, default the common food and drink icons)]. unpin adds an "Unpin" action to each button's context menu. catalogue-href: where the empty state sends people. loading shows placeholders. title, labels: override the words.
     Events on the root, each with detail { …, wait(promise) }:
       log    detail.item, detail.override  resolve nothing for success, or { flagged, message } (a warning), or { error, canOverride } (a refusal; with canOverride "Log anyway" fires log again with override true). A rejection shows a generic failure.
       unpin  detail.item                   resolve, or resolve { error }. On success the button leaves the strip.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'unpin' => false, 'catalogueHref' => null, 'loading' => false, 'title' => null, 'labels' => [], 'icons' => ['glass-water', 'coffee', 'cup-soda', 'apple', 'milk', 'wine', 'pill', 'utensils', 'cookie', 'salad']])
@php
    $t = \Nasaq\Nasaq::class;
    $w = array_merge([
        'pinnedTitle' => $t::t('Quick log', 'تسجيل سريع'),
        'pinnedEmpty' => $t::t('Pin the things you log every day and they show up here as one-tap buttons.', 'ثبّت ما تسجّله كل يوم ليظهر هنا كأزرار بلمسة واحدة.'),
        'pinnedOpenCatalogue' => $t::t('Open the catalogue', 'افتح الكتالوج'),
        'pinnedLogged' => $t::t('Logged {name}', 'سُجّل {name}'),
        'pinnedFlagged' => $t::t('Logged {name} and flagged it', 'سُجّل {name} ووُضعت عليه علامة'),
        'pinnedFailed' => $t::t('Could not log {name}.', 'تعذر تسجيل {name}.'),
        'logAnyway' => $t::t('Log anyway', 'سجّل على أي حال'),
        'unpin' => $t::t('Unpin', 'إلغاء التثبيت'),
    ], (array) $labels);
    $list = array_values(array_map(fn ($i) => (array) $i, (array) $items));
    $config = [
        'items' => $list, 'ar' => $t::rtl(),
        'labels' => ['pinnedLogged' => $w['pinnedLogged'], 'pinnedFlagged' => $w['pinnedFlagged'], 'pinnedFailed' => $w['pinnedFailed']],
    ];
    $heading = $title ?? $w['pinnedTitle'];
    $id = 'qls-'.\Illuminate\Support\Str::random(6);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'quick-log-strip') }}" aria-labelledby="{{ $id }}" x-data="nqQuickLogStrip(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-2') }}>
    <h3 id="{{ $id }}" class="text-eyebrow text-muted-foreground">{{ $heading }}</h3>
    @if ($loading)
        <div class="flex gap-2">
            <x-nq::states.skeleton class="h-control w-24" />
            <x-nq::states.skeleton class="h-control w-28" />
            <x-nq::states.skeleton class="h-control w-20" />
        </div>
    @else
        <p class="flex flex-wrap items-center gap-x-2 text-body-sm text-muted-foreground" x-show="items.length === 0" @if (count($list)) style="display: none" @endif>
            {{ $w['pinnedEmpty'] }}
            @if ($catalogueHref)<a href="{{ $catalogueHref }}" class="text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">{{ $w['pinnedOpenCatalogue'] }}</a>@endif
        </p>
        <div x-show="items.length > 0" @unless (count($list)) style="display: none" @endunless>
            <x-nq::text-utilities.scroll-fade :label="$heading" content-class="pb-1">
                <template x-for="entry in items" :key="entry.id">
                    <x-nq::context-menu class="shrink-0">
                        <x-nq::context-menu.trigger class="shrink-0">
                            <x-nq::button variant="secondary" x-bind:aria-busy="isBusy(entry) ? `true` : null" x-bind:disabled="isBlocked(entry)" x-on:click="run(entry)">
                                @foreach ($icons as $icon)
                                    <template x-if="entry.icon === `{{ $icon }}`"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" /></template>
                                @endforeach
                                <span dir="auto" x-text="nameOf(entry)"></span>
                            </x-nq::button>
                        </x-nq::context-menu.trigger>
                        @if ($unpin)
                            <x-nq::context-menu.content>
                                <x-nq::context-menu.item x-on:click="unpin(entry)"><x-lucide-pin-off aria-hidden="true" />{{ $w['unpin'] }}</x-nq::context-menu.item>
                            </x-nq::context-menu.content>
                        @endif
                    </x-nq::context-menu>
                </template>
            </x-nq::text-utilities.scroll-fade>
        </div>
    @endif
    <div role="status" aria-live="polite" class="min-h-5">
        <p x-show="outcome" style="display: none" x-bind:class="toneClass" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
            <span x-text="outcome ? outcome.text : ``"></span>
            <x-nq::button variant="link" size="sm" x-show="canRetry" style="display: none" x-on:click="retry()">{{ $w['logAnyway'] }}</x-nq::button>
        </p>
    </div>
</section>
