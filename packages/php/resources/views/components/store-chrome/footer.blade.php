{{-- <x-nq::store-chrome.footer :columns="[['title' => 'Shop', 'links' => [['label' => 'New in', 'href' => '/new']]]]" newsletter :languages="[['value' => 'en', 'label' => 'English']]" language="en"> <x-slot:brand>Nasaq Goods</x-slot:brand> </x-nq::store-chrome.footer>
     The storefront footer: link columns, a newsletter sign-up with validation and a live result, payment marks, text social links, and language and
     currency switches. Needs the Alpine runtime (@nasaqScripts).
     Slots: brand, tagline, payments, legal. columns: [['title', 'links' => [['label', 'href']]]]. newsletter: adds the sign-up form.
     social: [['label', 'href']]. languages / currencies: [['value', 'label']] with language / currency the starting choice (currencies: USD or SAR).
     labels: override any string.
     Events: nq-store-subscribe { email, promise } (set detail.promise to a Promise; a rejection shows the failure message; without a listener the sign-up
     counts as done so a plain form can post it itself); nq-store-language-change { value }; nq-store-currency-change { value }. --}}
@include('nasaq::components.store-chrome._strings')
@props(['columns' => [], 'newsletter' => false, 'social' => [], 'languages' => null, 'language' => null, 'currencies' => null, 'currency' => null, 'labels' => []])
@php
    $L = nq_sch_all((array) $labels);
    $columns = array_values((array) $columns);
    $social = array_values((array) $social);
    $languages = $languages ? array_values((array) $languages) : [];
    $currencies = $currencies ? array_values((array) $currencies) : [];
    $linkClass = 'rounded-sm text-body-sm text-muted-foreground no-underline outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
    $uid = 'nq-sf-'.substr(md5(json_encode([$columns, $social])), 0, 6);
    $hasBrand = isset($brand) && ! $brand->isEmpty();
    $hasTagline = isset($tagline) && ! $tagline->isEmpty();
    $hasPayments = isset($payments) && ! $payments->isEmpty();
    $hasLegal = isset($legal) && ! $legal->isEmpty();
@endphp
<footer data-slot="{{ $attributes->get('data-slot', 'store-footer') }}" aria-label="{{ $L['footer'] }}" {{ $attributes->except('data-slot')->cn('border-t border-border bg-nq-surface-soft') }}>
    <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div class="flex flex-col gap-5">
            @if ($hasBrand)<div class="text-h3 font-semibold text-foreground">{{ $brand }}</div>@endif
            @if ($hasTagline)<p class="max-w-sm text-body-sm text-muted-foreground">{{ $tagline }}</p>@endif
            @if ($newsletter)
                <form data-slot="store-newsletter" novalidate x-data="nqStoreNewsletter(@js(['labels' => $L]))" x-on:submit.prevent="submit()" class="flex max-w-md flex-col gap-2">
                    <div>
                        <p class="text-label text-foreground">{{ $L['newsletterTitle'] }}</p>
                        <p class="text-body-sm text-muted-foreground">{{ $L['newsletterHint'] }}</p>
                    </div>
                    <div class="flex gap-2">
                        <x-nq::input-group class="flex-1" x-bind:aria-invalid="invalid ? 'true' : null">
                            <x-nq::input-group.input id="{{ $uid }}-email" name="email" type="email" ltr autocomplete="email" aria-label="{{ $L['email'] }}" aria-describedby="{{ $uid }}-msg"
                                placeholder="{{ $L['emailPlaceholder'] }}" x-model="email" x-on:input="onInput()" x-bind:aria-invalid="invalid ? 'true' : null" />
                        </x-nq::input-group>
                        <x-nq::button type="submit" variant="primary" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">{{ $L['subscribe'] }}</x-nq::button>
                    </div>
                    <p id="{{ $uid }}-msg" role="status" aria-live="polite" x-text="message" x-bind:class="done ? 'text-nq-success-text' : 'text-nq-danger-text'" class="min-h-5 text-body-sm text-nq-danger-text"></p>
                </form>
            @endif
        </div>
        <nav aria-label="{{ $L['footer'] }}" class="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            @foreach ($columns as $col)
                <div class="flex min-w-0 flex-col gap-2.5">
                    <h3 class="text-label text-foreground">{{ $col['title'] }}</h3>
                    <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
                        @foreach ((array) ($col['links'] ?? []) as $l)
                            <li><a href="{{ $l['href'] }}" class="{{ $linkClass }}">{{ $l['label'] }}</a></li>
                        @endforeach
                    </ul>
                </div>
            @endforeach
        </nav>
    </div>
    <div class="border-t border-border">
        <div class="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 sm:px-6">
            <div class="flex flex-wrap items-end gap-4">
                @if (count($languages))
                    <label class="flex flex-col gap-1 text-caption text-muted-foreground" x-data="{ pick: @js($language ?? $languages[0]['value']) }" x-init="$watch('pick', v => $dispatch('nq-store-language-change', { value: v }))">
                        {{ $L['language'] }}
                        <x-nq::select x-model="pick">
                            <x-nq::select.trigger aria-label="{{ $L['language'] }}" class="h-9 min-w-36"><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($languages as $o)<x-nq::select.item :value="$o['value']">{{ $o['label'] }}</x-nq::select.item>@endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </label>
                @endif
                @if (count($currencies))
                    <label class="flex flex-col gap-1 text-caption text-muted-foreground" x-data="{ pick: @js($currency ?? $currencies[0]['value']) }" x-init="$watch('pick', v => $dispatch('nq-store-currency-change', { value: v }))">
                        {{ $L['currency'] }}
                        <x-nq::select x-model="pick">
                            <x-nq::select.trigger aria-label="{{ $L['currency'] }}" class="h-9 min-w-36"><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($currencies as $o)<x-nq::select.item :value="$o['value']">{{ $o['label'] }}</x-nq::select.item>@endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </label>
                @endif
            </div>
            @if ($hasPayments)
                <div class="flex flex-col gap-1.5">
                    <p class="text-caption text-muted-foreground">{{ $L['paymentMethods'] }}</p>
                    <div data-slot="store-footer-payments" class="flex flex-wrap items-center gap-2">{{ $payments }}</div>
                </div>
            @endif
            @if (count($social))
                <nav aria-label="{{ $L['followUs'] }}" class="flex flex-col gap-1.5">
                    <p class="text-caption text-muted-foreground">{{ $L['followUs'] }}</p>
                    <ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
                        @foreach ($social as $s)
                            <li><a href="{{ $s['href'] }}" rel="noopener noreferrer" target="_blank" class="rounded-sm text-body-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ $s['label'] }}</a></li>
                        @endforeach
                    </ul>
                </nav>
            @endif
        </div>
        @if ($hasLegal)<div class="mx-auto w-full max-w-7xl px-4 pb-6 text-caption text-muted-foreground sm:px-6">{{ $legal }}</div>@endif
    </div>
</footer>
