{{-- Internal: the dialog shared by wallet.top-up-dialog and wallet.payout-dialog. Use those. --}}
@include('nasaq::components.wallet._wallet')
@props([
    'kind', 'open' => false, 'currency' => null, 'locale' => null, 'accounts' => [], 'accountLabel', 'title', 'description', 'presets' => [],
    'min' => 0.01, 'max' => null, 'maxLabel' => null, 'idle', 'confirm', 'extra' => null, 'labels' => [],
])
@php
    $locale ??= app()->getLocale();
    $currency ??= \Nasaq\Nasaq::currency($locale);
    $t = nq_wallet_strings($locale, $labels);
    $accounts = array_values($accounts);
    $first = $accounts[0]['id'] ?? null;
    $config = [
        'kind' => $kind, 'open' => (bool) $open, 'currency' => $currency, 'min' => $min, 'max' => $max, 'accountId' => $first,
        'idle' => $idle, 'strings' => ['confirm' => $confirm, 'invalid' => $t['invalid'], 'min' => $t['min'], 'max' => $t['max2'], 'failed' => $t['failedRequest']],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'wallet-dialog') }}" data-kind="{{ $kind }}" x-data="nqWalletDialog(@js($config))" x-modelable="isOpen"
    x-on:nq-wallet-error.window="fail($event.detail && $event.detail.message)"
    {{ $attributes->except('data-slot')->cn('contents') }}>
    <x-nq::dialog x-model="isOpen" :open="(bool) $open">
        <x-nq::dialog.content>
            <form novalidate class="grid gap-4" x-on:submit.prevent="submit()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $title }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $description }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field x-model="hasProblem">
                    <x-nq::field.label>{{ $accountLabel }}</x-nq::field.label>
                    @if ($accounts)
                        <x-nq::radio-group :default-value="$first" :aria-label="$accountLabel" x-model="accountId">
                            @foreach ($accounts as $account)
                                <x-nq::radio-group.card :value="$account['id']" :title="$account['label']" :description="$account['description'] ?? null" />
                            @endforeach
                        </x-nq::radio-group>
                    @else
                        <x-nq::field.description>{{ $t['noAccounts'] }}</x-nq::field.description>
                    @endif
                </x-nq::field>
                <x-nq::field name="amount" x-model="hasProblem">
                    <x-nq::field.label>{{ $t['amount'].' ('.$currency.')' }}</x-nq::field.label>
                    <x-nq::field.input ltr inputmode="decimal" autocomplete="off" placeholder="0.00" x-model="text" x-on:input="clearProblem()" x-bind:disabled="busy" />
                    <x-nq::field.error><span x-text="problem"></span></x-nq::field.error>
                    @if ($presets)
                        <div role="group" aria-label="{{ $t['quick'] }}" class="flex flex-wrap gap-2">
                            @foreach ($presets as $preset)
                                <x-nq::button size="sm" x-bind:disabled="busy" x-on:click="preset({{ $preset }})"><bdi data-slot="num" data-numeric="" class="tabular-nums">{{ nq_wallet_money($preset, $currency, $locale, whole: true) }}</bdi></x-nq::button>
                            @endforeach
                        </div>
                    @endif
                    @if ($maxLabel && $max)
                        <x-nq::button size="sm" variant="link" class="self-start" x-bind:disabled="busy" x-on:click="preset({{ $max }})">{{ $maxLabel }}</x-nq::button>
                    @endif
                </x-nq::field>
                @if ($extra)
                    <p class="text-caption text-muted-foreground">{{ $extra }}</p>
                @endif
                {{ $slot }}
                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-bind:disabled="busy" x-on:click="close()">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy || {{ $accounts ? 'false' : 'true' }}" x-bind:aria-busy="busy" :disabled="! $accounts">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        <span x-text="label">{{ $idle }}</span>
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
