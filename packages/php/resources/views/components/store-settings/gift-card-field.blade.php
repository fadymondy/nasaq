{{-- <x-nq::store-settings.gift-card-field :cards="[]" :total="30000" currency="USD" @nq-giftcard-lookup="$event.detail.waitUntil(find($event.detail.code))" />
     The gift card box at checkout: type a code, see the card's balance and how much of the total it covers. The code is checked for shape and check character before any lookup, so a typo never reaches the server.
     Several cards can be added; the one that expires soonest is spent first. Cards in another currency are refused.
     cards: the cards entered so far (full card arrays with their ledger). total: what is left to pay before gift cards, in minor units. known: cards to look up locally when nobody handles the lookup event (a demo).
     now: an ISO date-time treated as now. currency: USD, or SAR in Arabic. disabled. labels: override any string by key.
     Looking up fires "nq-giftcard-lookup" { code, waitUntil(promise), resolve(), reject(message) }; resolve the card, or { error: 'not-found' }. "nq-giftcard-change" { cards, applied, covered, remaining } fires when a card is added or removed.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-settings._words')
@props(['cards' => [], 'total' => 0, 'known' => [], 'currency' => null, 'now' => null, 'disabled' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_store_settings_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $config = ['cards' => array_values((array) $cards), 'known' => array_values((array) $known), 'total' => (int) $total, 'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'labels' => (array) $labels, 'now' => $now, 'disabled' => (bool) $disabled];
    $id = 'nq-gcf-'.substr(md5(json_encode($config['cards']).$total), 0, 8);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'gift-card-field') }}" aria-label="{{ $t['giftCard'] }}" x-data="nqGiftCardField(@js($config))" {{ $attributes->except('data-slot')->cn('grid min-w-0 gap-3') }}>
    <form class="flex items-start gap-2" x-on:submit.prevent="add()">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5 text-label text-foreground">
            <label for="{{ $id }}-code">{{ $t['giftCard'] }}</label>
            <x-nq::field.input id="{{ $id }}-code" x-model="code" ltr class="font-mono uppercase" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" x-bind:disabled="disabled || busy" x-on:input="onInput()" x-bind:aria-invalid="!!problem" />
        </div>
        <x-nq::button type="submit" variant="secondary" class="mt-[1.625rem]" x-bind:disabled="disabled || busy"><span>{{ $t['applyCard'] }}</span></x-nq::button>
    </form>
    <p role="alert" class="text-body-sm text-nq-danger-text" x-bind:class="problem ? '' : 'sr-only'" x-text="problem"></p>
    <ul x-show="cards.length !== 0" @if (count($config['cards']) === 0) style="display: none" @endif class="grid gap-1.5">
        <template x-for="r in rows" :key="r.id">
            <li class="flex min-w-0 items-center justify-between gap-2 rounded-control border border-border bg-card px-2.5 py-1.5 text-body-sm">
                <span class="flex min-w-0 flex-col"><bdi dir="ltr" class="truncate font-mono" x-text="r.masked"></bdi><span class="text-caption text-muted-foreground">{{ $t['balance'] }}: <bdi dir="ltr" x-text="r.balance"></bdi></span></span>
                <span class="flex items-center gap-2">
                    <span class="font-medium text-nq-success-text">−<bdi dir="ltr" x-text="r.taken"></bdi></span>
                    <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:disabled="disabled" x-bind:aria-label="removeLabel(r)" x-on:click="remove(r.id)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                </span>
            </li>
        </template>
    </ul>
    <p x-show="cards.length !== 0" @if (count($config['cards']) === 0) style="display: none" @endif role="status" aria-live="polite" class="flex items-center justify-between gap-2 text-body-sm">
        <span class="text-muted-foreground">{{ $t['youPay'] }}</span><span class="font-semibold text-foreground"><bdi dir="ltr" x-text="remainingText"></bdi></span>
    </p>
</section>
