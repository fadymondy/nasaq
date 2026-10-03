{{-- Internal to <x-nq::two-factor-setup>: a trigger and an alert dialog that asks for a password or a code, runs an async action and stays open on error. --}}
@props(['action', 'label', 'title', 'description', 'confirmLabel', 'danger' => false, 'mode' => 'password', 'strings' => [], 'uid' => 'nq-2fa'])
@php
    $field = $uid.'-'.$action;
@endphp
<x-nq::alert-dialog>
    <x-nq::alert-dialog.trigger :variant="$danger ? 'danger' : 'secondary'" x-on:click.capture="resetCred()">{{ $label }}</x-nq::alert-dialog.trigger>
    <x-nq::alert-dialog.content>
        <form class="grid gap-4" x-effect="cred === '' && $el.reset()" x-on:submit.prevent="submitCred({!! \Illuminate\Support\Js::from($action) !!}).then((ok) => ok && close())">
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title>{{ $title }}</x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $description }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <div data-slot="field" class="flex flex-col gap-1.5">
                @if ($mode === 'code')
                    <span class="text-label text-foreground">{{ $strings['authCode'] }}</span>
                    <x-nq::otp-input x-model="cred" />
                    <p data-slot="field-description" class="text-caption text-muted-foreground">{{ $strings['confirmCode'] }}</p>
                @else
                    <label for="{{ $field }}" class="text-label text-foreground">{{ $strings['password'] }}</label>
                    <x-nq::password-input id="{{ $field }}" autocomplete="current-password" x-on:input="cred = $event.target.value" />
                    <p data-slot="field-description" class="text-caption text-muted-foreground">{{ $strings['confirmPassword'] }}</p>
                @endif
                <p role="alert" class="text-caption text-nq-danger-text" x-show="credError" x-text="credError" style="display: none"></p>
            </div>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel x-bind:disabled="credPending" x-bind:data-disabled="credPending ? '' : null">{{ $strings['cancel'] }}</x-nq::alert-dialog.cancel>
                <x-nq::button type="submit" :variant="$danger ? 'danger' : 'primary'" x-bind:disabled="! credReady || credPending"
                    x-bind:data-disabled="(! credReady || credPending) ? '' : null" x-bind:aria-busy="credPending ? 'true' : null">
                    <x-nq::spinner x-show="credPending" style="display: none" />
                    {{ $confirmLabel }}
                </x-nq::button>
            </x-nq::alert-dialog.footer>
        </form>
    </x-nq::alert-dialog.content>
</x-nq::alert-dialog>
