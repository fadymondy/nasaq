{{-- <x-nq::wallet.balance :balance="1250.5" :pending="100" currency="USD" :trend="[900, 1100, 1250]" top-up payout />
     The balance card: a large figure that can be hidden, pending money, a trend line, and Add funds / Withdraw.
     top-up / payout show the buttons (Withdraw is disabled while the balance is zero). They dispatch a bubbling "nq-wallet-open" event
     with { dialog: "topup" | "payout" }; <x-nq::wallet> listens for it and opens its dialogs.
     currency: ISO 4217 code (USD, or SAR in Arabic, when omitted). trend: balances oldest first. loading: skeleton. labels: array overriding the words.
     Needs the Alpine runtime (@nasaqScripts) for hide / show. --}}
@include('nasaq::components.wallet._wallet')
@props(['balance', 'pending' => null, 'currency' => null, 'trend' => null, 'topUp' => false, 'payout' => false, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $currency ??= \Nasaq\Nasaq::currency($locale);
    $t = nq_wallet_strings($locale, $labels);
    // Backtick strings: the component attribute bag escapes quotes, and a double escape would break the expression.
    $labelExpr = 'hidden ? `'.addcslashes($t['show'], '`\\$').'` : `'.addcslashes($t['hide'], '`\\$').'`';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'wallet-balance') }}" x-data="nqWalletBalance()" @if ($loading) aria-busy="true" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card px-0 py-4 text-card-foreground') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2" class="flex items-center gap-2 text-muted-foreground">
            <x-lucide-wallet-cards aria-hidden="true" class="size-4" />
            {{ $t['balance'] }}
        </x-nq::card.title>
        <x-nq::card.action>
            <x-nq::button size="icon-sm" variant="ghost" x-bind:aria-pressed="hidden"
                x-bind:aria-label="{{ $labelExpr }}" x-on:click="toggle()">
                <x-lucide-eye aria-hidden="true" x-show="!hidden" />
                <x-lucide-eye-off aria-hidden="true" x-show="hidden" style="display: none" />
            </x-nq::button>
        </x-nq::card.action>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
            @if ($loading)
                <x-nq::states.skeleton class="h-9 w-40" />
            @else
                <p x-show="hidden" style="display: none" class="text-h1 tracking-tight text-foreground" aria-label="{{ $t['hidden'] }}"><span aria-hidden="true">••••••</span></p>
                <p x-show="!hidden" class="text-h1 font-semibold tracking-tight text-foreground"><bdi data-slot="num" data-numeric="" class="tabular-nums">{{ nq_wallet_money($balance, $currency, $locale) }}</bdi></p>
                @if ($pending)
                    <p class="text-body-sm text-muted-foreground">{{ $t['pending'] }}: <span x-show="hidden" style="display: none" aria-hidden="true">••••</span><bdi data-slot="num" data-numeric="" x-show="!hidden" class="tabular-nums">{{ nq_wallet_money($pending, $currency, $locale, signed: true) }}</bdi></p>
                @endif
            @endif
        </div>
        @if ($trend && count($trend) > 1)
            <div x-show="!hidden"><x-nq::chart.sparkline :data="$trend" :label="$t['trend']" class="h-10 w-32" /></div>
        @endif
    </x-nq::card.content>
    @if ($topUp || $payout)
        <x-nq::card.content class="flex flex-wrap gap-2">
            @if ($topUp)
                <x-nq::button variant="primary" x-on:click="$dispatch('nq-wallet-open', { dialog: 'topup' })"><x-lucide-plus aria-hidden="true" />{{ $t['topUp'] }}</x-nq::button>
            @endif
            @if ($payout)
                <x-nq::button :disabled="$balance <= 0" x-on:click="$dispatch('nq-wallet-open', { dialog: 'payout' })"><x-lucide-landmark aria-hidden="true" />{{ $t['payout'] }}</x-nq::button>
            @endif
        </x-nq::card.content>
    @endif
</div>
