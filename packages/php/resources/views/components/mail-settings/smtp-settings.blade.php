{{-- <x-nq::mail-settings.smtp-settings :value="['host' => 'smtp.example.com', 'port' => 587, 'encryption' => 'starttls', 'username' => 'mailer', 'fromName' => 'Acme', 'fromAddress' => 'hello@example.com', 'passwordSet' => true]" default-test-to="you@example.com" />
     The SMTP form (host, port, encryption, username, password, sender) with a save button, and a card that sends a test email and shows each step
     of the connection (connect, secure, sign in, send) as passed, failed or skipped, with the server's message for the failing one.
     value: [host, port, encryption (none | starttls | tls), username, fromName, fromAddress, passwordSet]. The password is write-only: it is never passed in,
     and it is left out of the save event when the field is empty. Changing the encryption moves the port to its usual number unless a custom one was typed.
     default-test-to fills the test recipient. loading disables the form. labels: array overriding the words.
     Each action fires a bubbling, cancelable event with detail { ..., resolve(result?), reject(message), waitUntil(promise) }:
       "nq-smtp-save" { host, port, encryption, username, password?, fromName, fromAddress }
       "nq-smtp-test" { ...the same, to } and resolve({ ok, steps: [{ id: connect | tls | auth | send, ok, message? }] })
     @nq-smtp-test="$event.detail.waitUntil($wire.sendTest($event.detail))". An error (resolve({ error }), reject(message), a rejected promise) is shown in an alert;
     with nobody listening a save counts as done and a test shows nothing. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.mail-settings._mail-settings')
@props(['value', 'defaultTestTo' => '', 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_mail_strings($locale, $labels);
    $cfg = [
        'host' => $value['host'] ?? '',
        'port' => (int) ($value['port'] ?? 587),
        'encryption' => $value['encryption'] ?? 'starttls',
        'username' => $value['username'] ?? '',
        'fromName' => $value['fromName'] ?? '',
        'fromAddress' => $value['fromAddress'] ?? '',
        'passwordSet' => ! empty($value['passwordSet']),
        'defaultTestTo' => $defaultTestTo,
        'strings' => ['genericError' => $t['genericError'], 'encryptionHint' => $t['encryptionHint']],
    ];
    $hint = str_replace('{port}', (string) ($cfg['encryption'] === 'tls' ? 465 : ($cfg['encryption'] === 'starttls' ? 587 : 25)), $t['encryptionHint']);
    $steps = ['connect', 'tls', 'auth', 'send'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'smtp-settings') }}" x-data="nqSmtpSettings(@js($cfg))" @if ($loading) aria-busy="true" @endif {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <x-nq::card class="w-full">
        <x-nq::card.header>
            <x-nq::card.title as="h2">{{ $t['smtpTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['smtpDescription'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content>
            <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="save()">
                <div x-show="error" x-cloak style="display: none">
                    <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
                </div>
                <div x-show="saved" x-cloak style="display: none">
                    <x-nq::alert tone="success">{{ $t['saved'] }}</x-nq::alert>
                </div>
                <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_12rem]">
                    <x-nq::field x-model="hostBad" :disabled="$loading">
                        <x-nq::field.label>{{ $t['host'] }}</x-nq::field.label>
                        <x-nq::field.input ltr x-model="host" :value="$cfg['host']" placeholder="{{ $t['hostPlaceholder'] }}" autocomplete="off" spellcheck="false" />
                        <x-nq::field.error>{{ $t['hostInvalid'] }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field x-model="portBad" :disabled="$loading">
                        <x-nq::field.label>{{ $t['port'] }}</x-nq::field.label>
                        <x-nq::field.input ltr inputmode="numeric" x-model="port" :value="(string) $cfg['port']" autocomplete="off" />
                        <x-nq::field.error>{{ $t['portInvalid'] }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['encryption'] }}</x-nq::field.label>
                        <x-nq::select :value="$cfg['encryption']" x-model="encryption">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach (['starttls', 'tls', 'none'] as $e)
                                    <x-nq::select.item :value="$e">{{ $t['encryptions'][$e] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                        <x-nq::field.description><span x-text="encryptionHint">{{ $hint }}</span></x-nq::field.description>
                    </x-nq::field>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <x-nq::field :disabled="$loading">
                        <x-nq::field.label>{{ $t['username'] }}</x-nq::field.label>
                        <x-nq::field.input ltr x-model="username" :value="$cfg['username']" autocomplete="off" spellcheck="false" />
                    </x-nq::field>
                    <x-nq::field :disabled="$loading">
                        <x-nq::field.label>{{ $t['password'] }}</x-nq::field.label>
                        <x-nq::field.input ltr type="password" x-model="password" autocomplete="new-password" placeholder="{{ $cfg['passwordSet'] ? $t['passwordPlaceholderSaved'] : '' }}" />
                        <x-nq::field.description>{{ $cfg['passwordSet'] ? $t['passwordSaved'] : $t['passwordHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    <x-nq::field :disabled="$loading">
                        <x-nq::field.label>{{ $t['fromName'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="fromName" :value="$cfg['fromName']" placeholder="{{ $t['fromNamePlaceholder'] }}" autocomplete="off" />
                    </x-nq::field>
                    <x-nq::field x-model="fromBad" :disabled="$loading">
                        <x-nq::field.label>{{ $t['fromAddress'] }}</x-nq::field.label>
                        <x-nq::field.input ltr type="email" x-model="fromAddress" :value="$cfg['fromAddress']" placeholder="{{ $t['fromAddressPlaceholder'] }}" autocomplete="off" />
                        <x-nq::field.error>{{ $t['fromAddressInvalid'] }}</x-nq::field.error>
                    </x-nq::field>
                </div>
                <div class="flex justify-end">
                    <x-nq::button type="submit" variant="primary" :disabled="$loading" x-bind:disabled="saving" x-bind:aria-busy="saving ? 'true' : undefined">
                        <x-nq::spinner x-show="saving" x-cloak style="display: none" />
                        {{ $t['save'] }}
                    </x-nq::button>
                </div>
            </form>
        </x-nq::card.content>
    </x-nq::card>

    <x-nq::card data-slot="smtp-test" class="w-full">
        <x-nq::card.header>
            <x-nq::card.title as="h3">{{ $t['testTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['testDescription'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                <x-nq::field class="flex-1" :disabled="$loading" x-model="toBad">
                    <x-nq::field.label>{{ $t['testTo'] }}</x-nq::field.label>
                    <x-nq::field.input ltr type="email" x-model="to" :value="$defaultTestTo" placeholder="{{ $t['testToPlaceholder'] }}" autocomplete="off" />
                    <x-nq::field.error>{{ $t['testToInvalid'] }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::button type="button" variant="secondary" :disabled="$loading" x-on:click="sendTest()" x-bind:disabled="testing" x-bind:aria-busy="testing ? 'true' : undefined">
                    <x-nq::spinner x-show="testing" x-cloak style="display: none" />
                    <x-lucide-send x-show="!testing" aria-hidden="true" class="size-4 rtl:-scale-x-100" />
                    <span x-text="testing ? @js($t['testing']) : @js($t['sendTest'])">{{ $t['sendTest'] }}</span>
                </x-nq::button>
            </div>
            <div x-show="testError" x-cloak style="display: none">
                <x-nq::alert tone="danger"><span x-text="testError"></span></x-nq::alert>
            </div>
            <div data-slot="smtp-test-result" role="status" x-show="outcome" x-cloak style="display: none" class="flex flex-col gap-3">
                <div x-show="outcome ? outcome.ok : false" x-cloak style="display: none"><x-nq::alert tone="success">{{ $t['testPassed'] }}</x-nq::alert></div>
                <div x-show="outcome ? !outcome.ok : false" x-cloak style="display: none"><x-nq::alert tone="danger">{{ $t['testFailed'] }}</x-nq::alert></div>
                <ol class="flex flex-col divide-y divide-border rounded-control border border-border">
                    @foreach ($steps as $id)
                        <li class="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                            <span class="flex items-center gap-2 text-foreground">
                                <x-lucide-check x-show="stepOf('{{ $id }}') === 'pass'" x-cloak style="display: none" aria-hidden="true" class="size-4 text-success" />
                                <x-lucide-x x-show="stepOf('{{ $id }}') === 'fail'" x-cloak style="display: none" aria-hidden="true" class="size-4 text-danger" />
                                <x-lucide-circle-dashed x-show="stepOf('{{ $id }}') === 'skipped'" aria-hidden="true" class="size-4 text-muted-foreground" />
                                {{ $t['steps'][$id] }}
                            </span>
                            <span>
                                <x-nq::status tone="success" x-show="stepOf('{{ $id }}') === 'pass'" x-cloak style="display: none">{{ $t['stepState']['pass'] }}</x-nq::status>
                                <x-nq::status tone="danger" x-show="stepOf('{{ $id }}') === 'fail'" x-cloak style="display: none">{{ $t['stepState']['fail'] }}</x-nq::status>
                                <x-nq::status tone="neutral" x-show="stepOf('{{ $id }}') === 'skipped'">{{ $t['stepState']['skipped'] }}</x-nq::status>
                            </span>
                        </li>
                    @endforeach
                </ol>
                <pre data-slot="smtp-test-message" x-show="failMessage" x-text="failMessage" x-cloak style="display: none" dir="ltr" class="overflow-x-auto rounded-control border border-border bg-nq-surface-soft p-3 font-mono text-code text-foreground"></pre>
            </div>
        </x-nq::card.content>
    </x-nq::card>
</div>
