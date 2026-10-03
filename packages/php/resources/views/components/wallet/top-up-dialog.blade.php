{{-- <x-nq::wallet.top-up-dialog x-model="open" :sources="[['id' => 'visa', 'label' => 'Visa ending 4242']]" currency="USD" fee-note="A fee of 1.5% applies." />
     A dialog to add funds: pick a source, type or tap an amount, confirm. Validates the amount, not the payment.
     Open it with x-model (or wire:model) on a boolean; it is x-modelable. open starts it open.
     sources: id, label, description. presets (default 50, 100, 250, 500), min (default 10), max. fee-note: text under the amount. currency: ISO code (USD, or SAR in Arabic, when omitted).
     Submitting validates, then dispatches a bubbling, cancelable "nq-wallet-topup" event with detail
       { amount, sourceId, resolve(result?), reject(message), waitUntil(promise) }.
     Nothing handling it: the dialog just closes. To keep it busy while you work, call detail.waitUntil(promise) (a Livewire call works:
     @nq-wallet-topup="$event.detail.waitUntil($wire.topUp($event.detail.amount, $event.detail.sourceId))"), or call detail.resolve() / detail.resolve({ error: "Card declined" })
     / detail.reject("Card declined") later. An error keeps the dialog open and shows the message; success closes it. A window event
     "nq-wallet-error" with { message } shows an error while the dialog is open. labels: array overriding the words.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.wallet._wallet')
@props(['open' => false, 'currency' => null, 'sources' => [], 'presets' => [50, 100, 250, 500], 'min' => 10, 'max' => null, 'feeNote' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_wallet_strings($locale, $labels);
@endphp
<x-nq::wallet.amount-dialog kind="topup" :open="$open" :currency="$currency" :locale="$locale" :accounts="$sources" :account-label="$t['source']"
    :title="$t['topUpTitle']" :description="$t['topUpDescription']" :presets="$presets" :min="$min" :max="$max" :idle="$t['add']"
    :confirm="$t['confirmTopUp']" :extra="$feeNote" :labels="$labels" {{ $attributes }} />
