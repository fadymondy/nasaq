{{-- Internal to <x-nq::two-factor-setup>: the recovery codes in a two-column grid, always left-to-right, with copy, download and a confirmation.
     source: the Alpine list to show ("codes" or "fresh"). confirm: the expression run by Finish. --}}
@props(['source' => 'codes', 'confirm' => 'finish()', 'strings' => [], 'filename' => 'recovery-codes.txt'])
<div class="flex flex-col gap-4" data-slot="two-factor-recovery">
    <ul dir="ltr" aria-label="{{ $strings['recoveryList'] }}"
        class="grid grid-cols-2 gap-x-6 gap-y-2 rounded-card border border-border bg-secondary p-4 font-mono text-body tabular-nums text-foreground">
        <template x-for="code in {{ $source }}" :key="code">
            <li data-slot="two-factor-recovery-code" class="select-all" x-text="code"></li>
        </template>
    </ul>
    <div class="flex flex-wrap gap-2">
        <span class="contents" x-data="nqCopyButton('', 1500)" x-effect="value = ({{ $source }} || []).join('\n')">
            <x-nq::button type="button" data-slot="copy-button" variant="secondary" size="sm" x-on:click="copy()" x-bind:data-copied="state === 'copied' ? '' : null"
                class="data-copied:text-nq-success-text">
                <x-lucide-copy aria-hidden="true" x-show="state !== 'copied'" />
                <x-lucide-check aria-hidden="true" x-show="state === 'copied'" style="display: none" />
                {{ $strings['copyAll'] }}
            </x-nq::button>
            <span data-slot="copy-button-status" role="status" aria-live="polite" class="sr-only"
                data-copied-label="{{ \Nasaq\Nasaq::t('Copied to clipboard', 'تم النسخ إلى الحافظة') }}" data-failed-label="{{ \Nasaq\Nasaq::t('Could not copy', 'تعذر النسخ') }}"
                x-text="state === 'copied' ? $el.dataset.copiedLabel : state === 'failed' ? $el.dataset.failedLabel : ''"></span>
        </span>
        <x-nq::button type="button" size="sm" x-on:click="download({!! \Illuminate\Support\Js::from($filename) !!})">
            <x-lucide-download aria-hidden="true" />
            {{ $strings['download'] }}
        </x-nq::button>
    </div>
    <div class="flex items-center gap-2">
        <x-nq::checkbox x-model="saved" x-bind:id="$id('nq-2fa', 'saved-{{ $source }}')" />
        <label x-bind:for="$id('nq-2fa', 'saved-{{ $source }}')" class="text-body-sm text-foreground">{{ $strings['saved'] }}</label>
    </div>
    <div>
        <x-nq::button type="button" variant="primary" x-on:click="{!! $confirm !!}" x-bind:disabled="! saved" x-bind:data-disabled="! saved ? '' : null">{{ $strings['finish'] }}</x-nq::button>
    </div>
</div>
