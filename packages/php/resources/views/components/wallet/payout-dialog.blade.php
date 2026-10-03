{{-- <x-nq::wallet.payout-dialog x-model="open" :available="1250.5" :destinations="[['id' => 'bank', 'label' => 'Al Rajhi Bank', 'description' => 'SA03 **** 1234']]" currency="USD" />
     A dialog to withdraw: pick a bank account, type an amount up to the available balance, confirm.
     Open it with x-model (or wire:model) on a boolean; it is x-modelable. available is the maximum. destinations: id, label, description. min (default 10).
     Submitting validates, then dispatches a bubbling, cancelable "nq-wallet-payout" event with detail
       { amount, destinationId, resolve(result?), reject(message), waitUntil(promise) }.
     It works like <x-nq::wallet.top-up-dialog>: unhandled closes the dialog; waitUntil / resolve / reject keep it busy, show an error, or close it;
     the window event "nq-wallet-error" ({ message }) shows an error while it is open. labels: array overriding the words.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.wallet._wallet')
@props(['open' => false, 'currency' => null, 'available', 'destinations' => [], 'min' => 10, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $currency ??= \Nasaq\Nasaq::currency($locale);
    $t = nq_wallet_strings($locale, $labels);
@endphp
<x-nq::wallet.amount-dialog kind="payout" :open="$open" :currency="$currency" :locale="$locale" :accounts="$destinations" :account-label="$t['destination']"
    :title="$t['payoutTitle']" :description="str_replace('{amount}', nq_wallet_money($available, $currency, $locale), $t['payoutDescription'])"
    :min="$min" :max="$available" :max-label="$t['max']" :idle="$t['withdraw']" :confirm="$t['confirmPayout']" :labels="$labels" {{ $attributes }} />
