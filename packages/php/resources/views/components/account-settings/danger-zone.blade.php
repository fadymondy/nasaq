{{-- <x-nq::account-settings.danger-zone confirm-text="DELETE" x-on:nq-account-delete="$event.detail.waitUntil(deleteAccount())" />
     The account-deletion block. The button opens an alert dialog that asks for a typed phrase before the red button enables, so a stray Enter cannot do it.
     confirm-text: the phrase to type (an email, a username, or the default word "DELETE" / "حذف"). title, heading, description and heading-level
     replace the built-in text; labels: an array with button, confirmTitle, confirmDescription, confirmPrompt (use {text}), confirmAction, cancel, failed.
     Deleting is yours: listen for nq-account-delete on it and call event.detail.waitUntil(promise). Resolve { error: "…" } or reject to keep the
     dialog open and show the message; resolve anything else and the dialog closes. With Livewire: x-on:nq-account-delete="$event.detail.waitUntil($wire.deleteAccount())".
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['title' => null, 'heading' => null, 'description' => null, 'confirmText' => null, 'headingLevel' => 2, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $phrase = $confirmText ?? $t::t('DELETE', 'حذف');
    $l = array_merge([
        'button' => $t::t('Delete account', 'حذف الحساب'),
        'confirmTitle' => $t::t('Delete your account?', 'حذف حسابك؟'),
        'confirmDescription' => $t::t('Everything tied to this account is removed for good. There is no way to get it back.', 'يُحذف كل ما يرتبط بهذا الحساب نهائيًا. ولا توجد طريقة لاستعادته.'),
        'confirmPrompt' => $t::t('Type {text} to confirm', 'اكتب {text} للتأكيد'),
        'confirmAction' => $t::t('Delete my account', 'احذف حسابي'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'failed' => $t::t('Your account could not be deleted. Try again.', 'تعذّر حذف حسابك. حاول مرة أخرى.'),
    ], (array) $labels);
    $prompt = str_replace('{text}', "\u{2068}".$phrase."\u{2069}", $l['confirmPrompt']);
@endphp
<x-nq::account-settings.settings-section tone="danger" data-slot="{{ $attributes->get('data-slot', 'danger-zone') }}" :heading-level="$headingLevel"
    :title="$title ?? $t::t('Danger zone', 'منطقة الخطر')"
    {{ $attributes->except('data-slot') }}>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" x-data="nqDangerZone(@js(['phrase' => $phrase, 'failed' => $l['failed']]))">
        <div class="min-w-0">
            <p class="text-label text-foreground">{{ $heading ?? $t::t('Delete account', 'حذف الحساب') }}</p>
            <p class="text-body-sm text-muted-foreground">{{ $description ?? $t::t('Permanently delete your account, your data and your access to every workspace. This cannot be undone.', 'احذف حسابك وبياناتك ووصولك إلى كل مساحات العمل نهائيًا. لا يمكن التراجع عن ذلك.') }}</p>
        </div>
        <x-nq::alert-dialog x-model="confirming">
            <x-nq::alert-dialog.trigger variant="danger" class="shrink-0">{{ $l['button'] }}</x-nq::alert-dialog.trigger>
            <x-nq::alert-dialog.content>
                <form novalidate class="grid gap-4" x-on:submit.prevent="remove()">
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title>{{ $l['confirmTitle'] }}</x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description>{{ $l['confirmDescription'] }}</x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <x-nq::field name="confirm-delete" x-model="bad">
                        <x-nq::field.label>{{ $prompt }}</x-nq::field.label>
                        <x-nq::field.input ltr autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false"
                            x-bind:value="typed" x-on:input="type($event.target.value)" x-bind:disabled="busy" />
                        <x-nq::field.description role="alert" class="text-nq-danger-text" x-show="bad" style="display: none" x-text="error"></x-nq::field.description>
                    </x-nq::field>
                    <x-nq::alert-dialog.footer>
                        <x-nq::alert-dialog.cancel x-bind:disabled="busy">{{ $l['cancel'] }}</x-nq::alert-dialog.cancel>
                        <x-nq::button type="submit" variant="danger" x-bind:disabled="! matches || busy" x-bind:data-disabled="(! matches || busy) ? '' : null"
                            x-bind:aria-busy="busy ? 'true' : null">
                            <template x-if="busy"><x-nq::spinner /></template>
                            {{ $l['confirmAction'] }}
                        </x-nq::button>
                    </x-nq::alert-dialog.footer>
                </form>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    </div>
</x-nq::account-settings.settings-section>
