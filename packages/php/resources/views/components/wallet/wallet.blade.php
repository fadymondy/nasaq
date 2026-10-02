{{-- <x-nq::wallet :balance="1250.5" :pending="100" currency="USD" :sources="[['id' => 'visa', 'label' => 'Visa ending 4242']]" :destinations="[['id' => 'bank', 'label' => 'Al Rajhi Bank']]" :transactions="$transactions" top-up payout />
     A balance card with Add funds / Withdraw dialogs and a grouped transaction list. It never moves money itself.
     balance, pending, currency (USD, or SAR in Arabic, when omitted), trend (balances oldest first), transactions (see wallet.transactions: id, type, signed amount, status, date, description, reference),
     sources / destinations (id, label, description), top-up / payout (show the button and its dialog), top-up-min (10), top-up-presets (50, 100, 250, 500), payout-min (10),
     fee-note, loading, labels (array overriding the words).
     Money moves through events, because a Blade prop cannot be an async callback. The dialogs dispatch bubbling, cancelable events:
       nq-wallet-topup   detail { amount, sourceId, resolve(result?), reject(message), waitUntil(promise) }
       nq-wallet-payout  detail { amount, destinationId, resolve(result?), reject(message), waitUntil(promise) }
     Livewire: @nq-wallet-topup="$event.detail.waitUntil($wire.topUp($event.detail.amount, $event.detail.sourceId))" (a thrown error keeps the dialog open).
     Plain JS: detail.resolve() closes the dialog; detail.resolve({ error: "Card declined" }) or detail.reject("Card declined") shows the error. Nothing listening: it just closes.
     A window event "nq-wallet-error" ({ message }) also shows an error while a dialog is open.
     Parts: wallet.balance, wallet.transactions, wallet.top-up-dialog, wallet.payout-dialog. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.wallet._wallet')
@props([
    'balance', 'pending' => null, 'currency' => null, 'trend' => null, 'transactions' => [], 'sources' => [], 'destinations' => [],
    'topUp' => false, 'payout' => false, 'topUpMin' => 10, 'topUpPresets' => [50, 100, 250, 500], 'payoutMin' => 10,
    'feeNote' => null, 'loading' => false, 'labels' => [], 'locale' => null,
])
@php
    $locale ??= app()->getLocale();
    $currency ??= \Nasaq\Nasaq::currency($locale);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'wallet') }}" x-data="nqWallet()" x-on:nq-wallet-open="open($event.detail && $event.detail.dialog)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    <x-nq::wallet.balance :balance="$balance" :pending="$pending" :currency="$currency" :trend="$trend" :top-up="$topUp" :payout="$payout" :loading="$loading" :labels="$labels" :locale="$locale" />
    <x-nq::wallet.transactions :transactions="$transactions" :currency="$currency" :loading="$loading" :labels="$labels" :locale="$locale" />
    @if ($topUp)
        <x-nq::wallet.top-up-dialog x-model="topupOpen" :currency="$currency" :sources="$sources" :min="$topUpMin" :presets="$topUpPresets" :fee-note="$feeNote" :labels="$labels" :locale="$locale" />
    @endif
    @if ($payout)
        <x-nq::wallet.payout-dialog x-model="payoutOpen" :currency="$currency" :available="$balance" :destinations="$destinations" :min="$payoutMin" :labels="$labels" :locale="$locale" />
    @endif
</div>
