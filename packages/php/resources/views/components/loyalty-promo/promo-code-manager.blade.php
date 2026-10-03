{{-- <x-nq::loyalty-promo.promo-code-manager :promos="$promos" currency="USD" can-save can-set-active can-delete @nq-promo-save="$event.detail.waitUntil(save($event.detail))" />
     Admin list of promo codes with a search box, a status filter and a dialog to create and edit a code. Each row has a menu (edit, copy code, turn on or off, delete) that also opens on
     context-click, long-press or the Menu key. Rows are sorted by code.
     promos: [['id', 'code', 'type' => percent|fixed, 'value' (basis points: 1500 is 15%, or minor units), 'used', 'maxDiscount'?, 'minSubtotal'?, 'startsOn'?, 'endsOn'? (YYYY-MM-DD),
     'maxRedemptions'?, 'perCustomer'?, 'firstOrderOnly'?, 'active'?]]. currency: USD, or SAR in Arabic. today: YYYY-MM-DD treated as today ("live", "ended", "scheduled").
     can-save: show New promo code and Edit. can-set-active: show Turn on / Turn off. can-delete: show Delete. loading: skeleton. labels: override any built-in string by key. locale.
     Saving fires "nq-promo-save" { input, id?, waitUntil(promise), resolve(), reject(message) }; "nq-promo-active" { promo, active, ... } and "nq-promo-delete" { promo, ... } work the same.
     Nobody claiming the event applies the change locally; a rejection keeps the dialog open and shows its message. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.loyalty-promo._logic')
@props(['promos' => [], 'currency' => null, 'today' => null, 'canSave' => false, 'canSetActive' => false, 'canDelete' => false, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_loyalty_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $config = [
        'promos' => array_values(array_map(fn ($p) => (array) $p, (array) $promos)), 'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en',
        'today' => $today ?? \Carbon\Carbon::now()->toDateString(), 'canSave' => (bool) $canSave, 'canSetActive' => (bool) $canSetActive, 'canDelete' => (bool) $canDelete, 't' => $t,
    ];
    $id = 'nq-promos-'.substr(md5(json_encode($config['promos'])), 0, 8);
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $menu = 'fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $hasMenu = $canSave || $canSetActive || $canDelete;
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'promo-code-manager') }}" aria-labelledby="{{ $id }}" x-data="nqPromoCodeManager(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['promos'] }}</h2>
        @if ($canSave)
            <x-nq::button type="button" size="sm" x-on:click="openEditor()"><x-lucide-plus aria-hidden="true" /><span>{{ $t['newPromo'] }}</span></x-nq::button>
        @endif
    </div>
    <div class="flex flex-wrap items-center gap-2">
        <x-nq::field.input type="search" class="max-w-60" aria-label="{{ $t['search'] }}" placeholder="{{ $t['search'] }}" x-model="query" />
        <x-nq::select value="all" x-model="statusFilter">
            <x-nq::select.trigger aria-label="{{ $t['statusCol'] }}" class="w-40"><x-nq::select.value /></x-nq::select.trigger>
            <x-nq::select.content>
                <x-nq::select.item value="all">{{ $t['all'] }}</x-nq::select.item>
                @foreach (['live', 'scheduled', 'ended', 'off', 'full'] as $s)
                    <x-nq::select.item :value="$s">{{ $t['statuses'][$s] }}</x-nq::select.item>
                @endforeach
            </x-nq::select.content>
        </x-nq::select>
    </div>
    <p x-show="listError" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="listError"></span></p>
    @if ($loading)
        <div aria-busy="true" class="flex flex-col gap-2"><x-nq::states.skeleton class="h-10 w-full" /><x-nq::states.skeleton class="h-10 w-full" /></div>
    @else
        <div x-show="visible.length === 0" @if (count($config['promos']) > 0) style="display: none" @endif>
            <x-nq::states.empty icon="ticket" :title="$t['noPromos']" :description="$t['noPromosHint']" class="border-0" />
        </div>
        <div x-show="visible.length !== 0" @if (count($config['promos']) === 0) style="display: none" @endif data-slot="promo-table" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
            <div role="table" aria-label="{{ $t['promoLabel'] }}" class="table w-full min-w-[36rem] border-collapse">
                <div role="rowgroup" class="table-header-group border-b border-border">
                    <div role="row" class="table-row">
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['code'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['discountCol'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['validity'] }}</div>
                        <div role="columnheader" class="table-cell {{ $thNum }}">{{ $t['usesCol'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['statusCol'] }}</div>
                        @if ($hasMenu)<div role="columnheader" class="table-cell w-10"><span class="sr-only">{{ $t['actions'] }}</span></div>@endif
                    </div>
                </div>
                <div role="rowgroup" class="table-row-group divide-y divide-border">
                    <template x-for="p in visible" :key="p.id">
                        <div role="row" data-slot="promo-row" x-data="nqContextMenu()" x-bind="trigger" x-bind:data-status="standingOf(p)" class="table-row">
                            <div role="cell" class="table-cell {{ $td }}"><bdi dir="ltr" class="font-mono" x-text="p.code"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }}"><bdi dir="ltr" x-text="discountText(p)"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }} text-caption" x-text="validityText(p)"></div>
                            <div role="cell" class="table-cell {{ $td }} text-end tabular-nums"><bdi dir="ltr" x-text="usedText(p)"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }}">
                                <x-nq::status tone="success" x-show="tone(p) === 'success'" style="display: none"><span x-text="statusLabel(p)"></span></x-nq::status>
                                <x-nq::status tone="info" x-show="tone(p) === 'info'" style="display: none"><span x-text="statusLabel(p)"></span></x-nq::status>
                                <x-nq::status tone="warning" x-show="tone(p) === 'warning'" style="display: none"><span x-text="statusLabel(p)"></span></x-nq::status>
                                <x-nq::status tone="neutral" x-show="tone(p) === 'neutral'" style="display: none"><span x-text="statusLabel(p)"></span></x-nq::status>
                            </div>
                            @if ($hasMenu)
                                <div role="cell" class="table-cell px-1">
                                    <x-nq::dropdown-menu>
                                        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="promo-actions" x-bind:aria-label="'{{ $t['actions'] }}, ' + p.code" class="text-muted-foreground data-popup-open:text-foreground">
                                            <x-lucide-ellipsis aria-hidden="true" />
                                        </x-nq::dropdown-menu.trigger>
                                        <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                            @if ($canSave)<x-nq::dropdown-menu.item x-on:click="openEditor(p)"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::dropdown-menu.item>@endif
                                            <x-nq::dropdown-menu.item x-on:click="copy(p)"><x-lucide-copy aria-hidden="true" />{{ $t['copyCode'] }}</x-nq::dropdown-menu.item>
                                            @if ($canSetActive)
                                                <x-nq::dropdown-menu.separator />
                                                <template x-if="p.active !== false"><x-nq::dropdown-menu.item x-on:click="setActive(p, false)"><x-lucide-power aria-hidden="true" />{{ $t['deactivate'] }}</x-nq::dropdown-menu.item></template>
                                                <template x-if="p.active === false"><x-nq::dropdown-menu.item x-on:click="setActive(p, true)"><x-lucide-power aria-hidden="true" />{{ $t['activate'] }}</x-nq::dropdown-menu.item></template>
                                            @endif
                                            @if ($canDelete)
                                                <x-nq::dropdown-menu.separator />
                                                <x-nq::dropdown-menu.item variant="danger" x-on:click="openDelete(p)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::dropdown-menu.item>
                                            @endif
                                        </x-nq::dropdown-menu.content>
                                    </x-nq::dropdown-menu>
                                </div>
                            @endif
                            <template x-teleport="body">
                                <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" class="{{ $menu }}">
                                    @if ($canSave)<x-nq::context-menu.item x-on:click="openEditor(p)"><x-lucide-pencil aria-hidden="true" />{{ $t['edit'] }}</x-nq::context-menu.item>@endif
                                    <x-nq::context-menu.item x-on:click="copy(p)"><x-lucide-copy aria-hidden="true" />{{ $t['copyCode'] }}</x-nq::context-menu.item>
                                    @if ($canSetActive)
                                        <x-nq::context-menu.separator />
                                        <template x-if="p.active !== false"><x-nq::context-menu.item x-on:click="setActive(p, false)"><x-lucide-power aria-hidden="true" />{{ $t['deactivate'] }}</x-nq::context-menu.item></template>
                                        <template x-if="p.active === false"><x-nq::context-menu.item x-on:click="setActive(p, true)"><x-lucide-power aria-hidden="true" />{{ $t['activate'] }}</x-nq::context-menu.item></template>
                                    @endif
                                    @if ($canDelete)
                                        <x-nq::context-menu.separator />
                                        <x-nq::context-menu.item variant="danger" x-on:click="openDelete(p)"><x-lucide-trash-2 aria-hidden="true" />{{ $t['delete'] }}</x-nq::context-menu.item>
                                    @endif
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    @endif
    @if ($canSave)
        <x-nq::dialog x-model="editorOpen">
            <x-nq::dialog.content data-slot="promo-editor" class="max-w-lg">
                <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="submit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="editingId ? t.editPromo : t.newPromo">{{ $t['newPromo'] }}</span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['codeHint'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div class="{{ $label }}">
                        <span>{{ $t['code'] }}</span>
                        <x-nq::field.input x-model="code" ltr class="uppercase" x-bind:aria-invalid="codeErr ? 'true' : null" />
                        <p x-show="codeErr" style="display: none" role="alert" class="text-caption text-nq-danger-text">{{ $t['problems']['format'] }}</p>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}">
                            <span>{{ $t['type'] }}</span>
                            <x-nq::select value="percent" x-model="type">
                                <x-nq::select.trigger aria-label="{{ $t['type'] }}"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="percent">{{ $t['percent'] }}</x-nq::select.item>
                                    <x-nq::select.item value="fixed">{{ $t['fixed'] }}</x-nq::select.item>
                                </x-nq::select.content>
                            </x-nq::select>
                        </div>
                        <div class="{{ $label }}">
                            <span x-text="isPercent ? t.percentValue : t.value">{{ $t['percentValue'] }}</span>
                            <div x-show="isPercent"><x-nq::field.input x-model="percent" ltr inputmode="decimal" aria-label="{{ $t['percentValue'] }}" x-bind:aria-invalid="valueErr ? 'true' : null" /></div>
                            <div x-show="!isPercent" style="display: none"><x-nq::currency-input x-model="fixed" :currency="$code" aria-label="{{ $t['value'] }}" x-bind:aria-invalid="valueErr ? 'true' : null" /></div>
                        </div>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div x-show="isPercent" class="{{ $label }}">
                            <span>{{ $t['maxDiscount'] }}</span>
                            <x-nq::currency-input x-model="maxDiscount" :currency="$code" aria-label="{{ $t['maxDiscount'] }}" />
                        </div>
                        <div class="{{ $label }}">
                            <span>{{ $t['minSubtotal'] }}</span>
                            <x-nq::currency-input x-model="minSubtotal" :currency="$code" aria-label="{{ $t['minSubtotal'] }}" />
                        </div>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}">
                            <span>{{ $t['startsOn'] }}</span>
                            <x-nq::date-picker x-model="startsOn" aria-label="{{ $t['startsOn'] }}" />
                        </div>
                        <div class="{{ $label }}">
                            <span>{{ $t['endsOn'] }}</span>
                            <x-nq::date-picker x-model="endsOn" aria-label="{{ $t['endsOn'] }}" x-bind:aria-invalid="datesErr ? 'true' : null" />
                        </div>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}">
                            <span>{{ $t['maxRedemptions'] }}</span>
                            <x-nq::field.input x-model="maxUses" ltr inputmode="numeric" placeholder="{{ $t['unlimited'] }}" x-bind:aria-invalid="usesErr ? 'true' : null" />
                        </div>
                        <div class="{{ $label }}">
                            <span>{{ $t['perCustomer'] }}</span>
                            <x-nq::field.input x-model="perCustomer" ltr inputmode="numeric" placeholder="{{ $t['unlimited'] }}" x-bind:aria-invalid="perErr ? 'true' : null" />
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-x-6 gap-y-2">
                        <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="firstOrderOnly" /><span>{{ $t['firstOrderOnly'] }}</span></label>
                        <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="active" /><span>{{ $t['active'] }}</span></label>
                    </div>
                    <p x-show="failed" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="failed"></span></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="editorOpen = false"><span>{{ $t['cancel'] }}</span></x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:disabled="busy"><span>{{ $t['save'] }}</span></x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
    @if ($canDelete)
        <x-nq::dialog x-model="deleteOpen">
            <x-nq::dialog.content data-slot="promo-delete" class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['deleteTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="deleteText(target)"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <p x-show="failed" style="display: none" role="alert" class="text-body-sm text-nq-danger-text" x-text="failed"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="deleteOpen = false"><span>{{ $t['cancel'] }}</span></x-nq::button>
                    <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmDelete()"><span>{{ $t['delete'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</section>
