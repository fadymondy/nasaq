{{-- <x-nq::confirm-provider /> once in your layout (inside <body>, after the Alpine runtime).
     Then any handler can ask first: x-on:click="if (await $confirm({ title: 'Delete Billing?', description: 'This cannot be undone.', confirmLabel: 'Delete' })) remove()".
     $confirm(options) resolves true on Confirm, false on Cancel or Escape. Options: title, description, confirmLabel, cancelLabel,
     danger (default true; false styles Confirm as primary). A second request while one is open resolves the first with false.
     Needs the Alpine runtime (@nasaqScripts). --}}
@php
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'confirm-provider') }}" x-data="nqConfirmProvider()" x-id="['nq-confirm']" x-on:nq:confirm.window="ask($event.detail)" {{ $attributes->except('data-slot')->cn('contents') }}>
    <template x-teleport="body">
        <div data-slot="alert-dialog-portal">
            <div data-slot="alert-dialog-backdrop" x-nq-presence="open" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="confirm-dialog" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                class="fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto {{ $fade }}">
                <x-nq::alert-dialog.header>
                    <h2 data-slot="alert-dialog-title" :id="$id('nq-confirm', 'title')" class="text-h3 text-foreground" x-text="options.title"></h2>
                    <p data-slot="alert-dialog-description" x-show="options.description" :id="$id('nq-confirm', 'description')" class="text-body-sm text-muted-foreground" x-text="options.description"></p>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::button variant="ghost" data-slot="alert-dialog-cancel" autofocus x-on:click="settle(false)" x-text="options.cancelLabel ?? $nq.t('Cancel', 'إلغاء')">{{ \Nasaq\Nasaq::t('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button variant="danger" x-show="options.danger !== false" x-on:click="settle(true)" x-text="options.confirmLabel ?? $nq.t('Confirm', 'تأكيد')">{{ \Nasaq\Nasaq::t('Confirm', 'تأكيد') }}</x-nq::button>
                    <x-nq::button variant="primary" x-show="options.danger === false" x-on:click="settle(true)" x-text="options.confirmLabel ?? $nq.t('Confirm', 'تأكيد')">{{ \Nasaq\Nasaq::t('Confirm', 'تأكيد') }}</x-nq::button>
                </x-nq::alert-dialog.footer>
            </div>
        </div>
    </template>
</div>
