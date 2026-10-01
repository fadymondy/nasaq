{{-- <x-nq::weighted-criteria-card description="I will rank the three vendors with these." :criteria="[['id' => 'price', 'label' => 'Price', 'weight' => 'high', 'enabled' => true]]" @nq-weighted-criteria-accept="$event.detail.promise = save($event.detail.criteria)" />
     A human-in-the-loop step for an assistant: it suggests the criteria for a comparison or a decision, the person switches each on or off, sets Low / Medium / High, adds their own and confirms.
     criteria: the suggested list, each ['id', 'label', 'description' (optional), 'weight' => low | medium | high, 'enabled', 'custom' (optional)]; x-modelable, so x-model="$wire.criteria" works.
     title (default "What matters most?"), description, allow-custom (default true), show-shares (default true: a bar with each enabled criterion's share), disabled.
     labels: ['title' => …, 'low' => …, 'medium' => …, 'high' => …, 'include' => 'Include {label}', 'weight' => 'Weight of {label}', 'remove' => 'Remove {label}', 'count' => '{on} of {all} included', 'addPlaceholder' => …, 'add' => …, 'accept' => …, 'accepted' => …, 'failed' => …]. uid: the id prefix.
     Confirm dispatches the bubbling "nq-weighted-criteria-accept" with { criteria, promise }: set event.detail.promise to a Promise (or one resolving to { error }) to keep the card busy and show a failure; otherwise the card locks and shows Sent.
     Every change dispatches "nq-weighted-criteria-change" with { criteria }. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['criteria' => [], 'title' => null, 'description' => null, 'allowCustom' => true, 'showShares' => true, 'disabled' => false, 'labels' => [], 'uid' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $strings = [
        'en' => [
            'title' => 'What matters most?', 'low' => 'Low', 'medium' => 'Medium', 'high' => 'High', 'include' => 'Include {label}', 'weight' => 'Weight of {label}', 'remove' => 'Remove {label}',
            'addPlaceholder' => 'Add your own…', 'add' => 'Add', 'count' => '{on} of {all} included', 'accept' => 'Use these', 'accepted' => 'Sent', 'failed' => 'That did not work. Try again.',
        ],
        'ar' => [
            'title' => 'ما الأهم بالنسبة لك؟', 'low' => 'منخفض', 'medium' => 'متوسط', 'high' => 'مرتفع', 'include' => 'تضمين {label}', 'weight' => 'وزن {label}', 'remove' => 'إزالة {label}',
            'addPlaceholder' => 'أضف معيارك…', 'add' => 'إضافة', 'count' => '{on} من {all} مضمّنة', 'accept' => 'اعتمدها', 'accepted' => 'تم الإرسال', 'failed' => 'لم تنجح العملية. حاول مرة أخرى.',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $list = array_values(array_map(fn ($c) => array_merge(['weight' => 'medium', 'enabled' => true], (array) $c), (array) $criteria));
    $on = count(array_filter($list, fn ($c) => $c['enabled']));
    $uid ??= 'nq-wc-'.substr(md5(json_encode($list)), 0, 8);
    $options = array_filter([
        'allowCustom' => $allowCustom ? null : false,
        'showShares' => $showShares ? null : false,
        'disabled' => $disabled ?: null,
        'labels' => array_intersect_key($t, array_flip(['include', 'weight', 'remove', 'count', 'failed', 'low', 'medium', 'high'])),
    ], fn ($v) => $v !== null);
    $countText = str_replace(['{on}', '{all}'], [$on, count($list)], $t['count']);
    $hide = 'style="display: none"';
@endphp
<div data-slot="weighted-criteria-card" x-data="nqWeightedCriteriaCard({!! \Illuminate\Support\Js::from($list) !!}, {!! \Illuminate\Support\Js::from((object) $options) !!})" x-modelable="criteria"
    x-bind:data-sent="sent ? '' : null"
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground min-w-0') }}>
    <div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div data-slot="card-title" id="{{ $uid }}-title" class="text-label text-foreground">{{ $title ?? $t['title'] }}</div>
        @if ($description)
            <div data-slot="card-description" class="text-body-sm text-muted-foreground">{{ $description }}</div>
        @endif
    </div>
    <div data-slot="card-content" class="flex flex-col gap-3 px-4">
        <ul aria-labelledby="{{ $uid }}-title" class="flex flex-col divide-y divide-border rounded-control border border-border">
            <template x-for="c in criteria" :key="c.id">
                <li data-slot="weighted-criterion" x-bind:data-enabled="c.enabled ? '' : null" class="flex flex-col gap-2 p-3">
                    <div class="flex flex-wrap items-center gap-3">
                        <button type="button" role="switch" data-slot="switch" x-bind:aria-label="includeLabel(c)" x-bind:aria-checked="String(c.enabled)"
                            x-bind:data-checked="c.enabled ? '' : null" x-bind:data-unchecked="c.enabled ? null : ''"
                            x-bind:disabled="locked ? '' : null" x-bind:data-disabled="locked ? '' : null" x-on:click="toggle(c)"
                            class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-nq-line-strong p-0.5 outline-none transition-colors duration-150 ease-nq data-checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50">
                            <span data-slot="switch-thumb" x-bind:data-checked="c.enabled ? '' : null" x-bind:data-unchecked="c.enabled ? null : ''"
                                class="block size-4 rounded-full bg-background shadow-xs data-checked:bg-primary-foreground transition-[translate] duration-150 ease-nq data-checked:translate-x-3.5 rtl:data-checked:-translate-x-3.5"></span>
                        </button>
                        <span x-bind:class="c.enabled ? '' : 'opacity-60'" class="flex min-w-0 flex-1 flex-col">
                            <span dir="auto" class="text-body-sm font-medium text-foreground" x-text="c.label"></span>
                            <span x-show="c.description" dir="auto" class="text-caption text-muted-foreground" x-text="c.description" {!! $hide !!}></span>
                        </span>
                        <div role="group" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" x-bind:aria-label="weightLabel(c)"
                            x-bind:data-disabled="(locked || ! c.enabled) ? '' : null" x-on:keydown="weightKey($event)"
                            class="flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5">
                            <template x-for="w in weights" :key="w">
                                <button type="button" data-slot="toggle" x-bind:aria-pressed="String(c.weight === w)" x-bind:data-pressed="c.weight === w ? '' : null"
                                    x-bind:disabled="(locked || ! c.enabled) ? '' : null" x-bind:data-disabled="(locked || ! c.enabled) ? '' : null"
                                    x-bind:tabindex="c.weight === w ? 0 : -1" x-on:click="setWeight(c, w)" x-text="labels[w]"
                                    class="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs h-6 px-2 text-caption"></button>
                            </template>
                        </div>
                        <button x-show="c.custom" type="button" data-slot="button" x-bind:aria-label="removeLabel(c)" x-bind:disabled="locked ? '' : null" x-bind:data-disabled="locked ? '' : null" x-on:click="remove(c)" {!! $hide !!}
                            class="inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-foreground hover:bg-nq-hover size-control-sm p-0">
                            <x-lucide-x aria-hidden="true" />
                        </button>
                    </div>
                    <span x-show="showShares && c.enabled" aria-hidden="true" class="h-1 overflow-hidden rounded-full bg-secondary" {!! $hide !!}>
                        <span class="block h-full rounded-full bg-primary transition-[width] duration-200 ease-nq" x-bind:style="'width: ' + sharePct(c)"></span>
                    </span>
                </li>
            </template>
        </ul>
        @if ($allowCustom)
            <form x-on:submit.prevent="add()" class="flex items-center gap-2">
                <input data-slot="input" type="text" x-model="draft" placeholder="{{ $t['addPlaceholder'] }}" aria-label="{{ $t['addPlaceholder'] }}" maxlength="120" x-bind:disabled="locked ? '' : null" @if ($disabled) disabled @endif
                    class="w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px] h-control flex-1">
                <button type="submit" data-slot="button" x-bind:disabled="(locked || ! draft.trim()) ? '' : null" x-bind:data-disabled="(locked || ! draft.trim()) ? '' : null" disabled data-disabled
                    class="inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-border bg-card text-foreground hover:bg-nq-hover h-control px-[var(--nq-control-pad)]">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $t['add'] }}
                </button>
            </form>
        @endif
        <div x-show="error" role="alert" data-slot="alert" data-tone="danger" {!! $hide !!}
            class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start border-nq-danger/30 bg-nq-danger-soft">
            <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
            <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
                <div data-slot="alert-description" class="text-body-sm text-foreground" x-text="error"></div>
            </div>
        </div>
    </div>
    <div data-slot="card-footer" class="flex items-center gap-2 px-4 justify-between gap-3">
        <span aria-live="polite" class="text-caption text-muted-foreground tabular-nums" x-text="countText">{{ $countText }}</span>
        {{-- Written out like <x-nq::button variant="primary">: the button component prints disabled before the attributes, and Alpine ignores a bound attribute that follows a static one. --}}
        <button type="button" data-slot="button" x-bind:aria-busy="busy ? 'true' : null"
            x-bind:disabled="(disabled || sent || busy || onCount === 0) ? '' : null" x-bind:data-disabled="(disabled || sent || busy || onCount === 0) ? '' : null"
            @if ($disabled || $on === 0) disabled data-disabled @endif x-on:click="accept()"
            class="inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))] h-control px-[var(--nq-control-pad)]">
            <span x-show="busy" {!! $hide !!}><x-nq::spinner /></span>
            <span x-show="sent" aria-hidden="true" class="flex [&_svg]:size-4" {!! $hide !!}><x-lucide-check /></span>
            <span x-text="sent ? @js($t['accepted']) : @js($t['accept'])">{{ $t['accept'] }}</span>
        </button>
    </div>
</div>
