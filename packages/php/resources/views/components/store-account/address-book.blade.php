{{-- <x-nq::store-account.address-book :addresses="$book" @nq-address-change="save($event.detail.addresses)" />
     The address book: add, edit, set the default, delete. Validation is the same validateAddress as the React kit.
     addresses: [['id', 'name', 'phone', 'line1', 'line2', 'city', 'region', 'postalCode', 'country' => 'SA', 'isDefault']]. countries: ISO 3166-1 alpha-2 codes offered (SA AE EG KW QA BH OM JO).
     loading / error: states. labels: override strings by key. Country names come from Intl.DisplayNames in the page language.
     Events from the root: nq-address-change { addresses } (the whole new book after every add, edit, default change or delete), nq-retry. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['addresses' => [], 'countries' => ['SA', 'AE', 'EG', 'KW', 'QA', 'BH', 'OM', 'JO'], 'loading' => false, 'error' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $config = [
        'addresses' => array_values($addresses), 'countries' => array_values($countries), 'currency' => \Nasaq\Nasaq::currency(), 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en',
        't' => $t, 'loading' => (bool) $loading, 'error' => (bool) $error,
    ];
    // [field, label, ltr, autocomplete, wide, can show a problem]
    $fields = [
        ['name', $t['fullName'], false, 'name', true, true], ['phone', $t['phone'], true, 'tel', true, true], ['line1', $t['line1'], false, 'address-line1', true, true],
        ['line2', $t['line2'], false, 'address-line2', true, false], ['city', $t['city'], false, 'address-level2', false, true], ['region', $t['region'], false, 'address-level1', false, false],
        ['postalCode', $t['postalCode'], true, 'postal-code', false, true],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-address-book') }}" x-data="nqStoreAddressBook(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($error)
        <x-nq::states :title="$t['loadError']" icon="triangle-alert">
            <x-slot:actions>
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button>
            </x-slot:actions>
        </x-nq::states>
    @else
        <section aria-label="{{ $t['addressesTitle'] }}" class="flex min-w-0 flex-col gap-4">
            <x-nq::button type="button" variant="primary" size="sm" class="self-start" x-on:click="openNew()">
                <x-lucide-plus aria-hidden="true" />
                {{ $t['addAddress'] }}
            </x-nq::button>
            @if ($loading)
                <div class="grid gap-3 sm:grid-cols-2" aria-busy="true">
                    <x-nq::states.skeleton class="h-36" />
                    <x-nq::states.skeleton class="h-36" />
                </div>
            @else
                <x-nq::states icon="map-pin" :title="$t['noAddresses']" :description="$t['noAddressesText']" x-show="addresses.length === 0" style="display: none" />
                <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2" x-show="addresses.length > 0">
                    <template x-for="a in addresses" x-bind:key="a.id">
                        <li class="flex flex-col gap-3 rounded-card border bg-card p-4" x-bind:class="a.isDefault ? 'border-primary' : 'border-border'">
                            <div class="flex items-start justify-between gap-2">
                                <address class="flex min-w-0 flex-col gap-0.5 text-body-sm not-italic">
                                    <span class="font-medium" x-text="a.name"></span>
                                    <template x-for="line in lines(a)"><span class="text-muted-foreground" x-text="line"></span></template>
                                    <span class="text-muted-foreground" x-text="countryName(a.country)"></span>
                                    <bdi dir="ltr" class="text-start text-muted-foreground" x-show="a.phone" x-text="a.phone"></bdi>
                                </address>
                                <span x-show="a.isDefault" x-bind:class="chipClass('info')" class="inline-flex h-5 shrink-0 items-center rounded-[4px] border px-1.5 text-caption font-medium">{{ $t['defaultAddress'] }}</span>
                            </div>
                            <div class="mt-auto flex flex-wrap gap-2">
                                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="openEdit(a)">
                                    <x-lucide-pencil aria-hidden="true" />
                                    {{ $t['edit'] }}
                                </x-nq::button>
                                <x-nq::button type="button" size="sm" variant="ghost" x-show="! a.isDefault" x-on:click="makeDefault(a)">{{ $t['makeDefault'] }}</x-nq::button>
                                <x-nq::button type="button" size="sm" variant="ghost" x-on:click="askDelete(a)">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                    {{ $t['delete'] }}
                                </x-nq::button>
                            </div>
                        </li>
                    </template>
                </ul>
            @endif

            <x-nq::dialog x-model="dialogOpen">
                <x-nq::dialog.content class="max-w-lg">
                    <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="save()">
                        <x-nq::dialog.header>
                            <x-nq::dialog.title><span x-text="draft.id ? t.editAddress : t.newAddress"></span></x-nq::dialog.title>
                            <x-nq::dialog.description>{{ $t['addressesTitle'] }}</x-nq::dialog.description>
                        </x-nq::dialog.header>
                        <div class="grid gap-3 sm:grid-cols-2">
                            @foreach ($fields as [$key, $label, $ltr, $auto, $wide, $checks])
                                <label class="flex flex-col gap-1.5 text-label text-foreground @if ($wide) sm:col-span-2 @endif">
                                    {{ $label }}
                                    <x-nq::field.input :type="$key === 'phone' ? 'tel' : 'text'" :autocomplete="$auto" :ltr="$ltr" x-model="draft.{{ $key }}" x-bind:aria-invalid="bad.{{ $key }}" />
                                    @if ($checks)
                                        <span role="alert" class="text-caption font-normal text-nq-danger-text" x-show="errs.{{ $key }} !== ''" style="display: none" x-text="errs.{{ $key }}"></span>
                                    @endif
                                </label>
                            @endforeach
                            <label class="flex flex-col gap-1.5 text-label text-foreground">
                                {{ $t['country'] }}
                                <x-nq::select x-model="draft.country">
                                    <x-nq::select.trigger aria-label="{{ $t['country'] }}"><x-nq::select.value placeholder="{{ $t['country'] }}" /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        @foreach ($countries as $code)
                                            @php($name = class_exists(\Locale::class) ? (\Locale::getDisplayRegion('-'.$code, \Nasaq\Nasaq::rtl() ? 'ar' : 'en') ?: $code) : $code)
                                            <x-nq::select.item :value="$code">{{ $name }}</x-nq::select.item>
                                        @endforeach
                                    </x-nq::select.content>
                                </x-nq::select>
                            </label>
                        </div>
                        <label class="flex items-center gap-2 text-body-sm">
                            <x-nq::checkbox x-model="draft.isDefault" />
                            {{ $t['setDefaultCheck'] }}
                        </label>
                        <x-nq::dialog.footer>
                            <x-nq::button type="button" variant="ghost" x-on:click="dialogOpen = false">{{ $t['cancel'] }}</x-nq::button>
                            <x-nq::button type="submit" variant="primary">{{ $t['save'] }}</x-nq::button>
                        </x-nq::dialog.footer>
                    </form>
                </x-nq::dialog.content>
            </x-nq::dialog>

            <x-nq::alert-dialog x-model="deleteOpen">
                <x-nq::alert-dialog.content>
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title>{{ $t['deleteTitle'] }}</x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description>{{ $t['deleteText'] }}</x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.footer>
                        <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                        <x-nq::alert-dialog.action variant="danger" x-on:click="confirmDelete()">{{ $t['delete'] }}</x-nq::alert-dialog.action>
                    </x-nq::alert-dialog.footer>
                </x-nq::alert-dialog.content>
            </x-nq::alert-dialog>
        </section>
    @endif
</div>
