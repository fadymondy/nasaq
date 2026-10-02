{{-- <x-nq::copy-button value="sk_live_51Nasaq" label="Copy API key" />   <x-nq::copy-button value="https://nasaq.app/i/9">Copy link</x-nq::copy-button>
     An icon button that copies text and shows a check for about 1.5 seconds; the result is announced through a polite live
     region. Visible text in the slot, or none for an icon-only button. value, label ("Copy" / "نسخ"), copied-label, failed-label,
     reset-after (1500 ms), variant (ghost), size. value-expr: an Alpine expression read at click time instead of value (the live text of a code block, a field). Fires nq:copy ({ text }) and nq:copy-error. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value', 'label' => null, 'copiedLabel' => null, 'failedLabel' => null, 'resetAfter' => 1500, 'valueExpr' => null, 'variant' => 'ghost', 'size' => null])
@php
    $iconOnly = trim((string) $slot) === '';
    $name = $label ?? \Nasaq\Nasaq::t('Copy', 'نسخ');
    $copied = $copiedLabel ?? \Nasaq\Nasaq::t('Copied to clipboard', 'تم النسخ إلى الحافظة');
    $failed = $failedLabel ?? \Nasaq\Nasaq::t('Could not copy', 'تعذر النسخ');
@endphp
<span class="contents" x-data="nqCopyButton({!! $valueExpr !== null ? '() => ('.e($valueExpr).')' : \Illuminate\Support\Js::from($value) !!}, {{ (int) $resetAfter }})">
    <x-nq::button type="button" data-slot="{{ $attributes->get('data-slot', 'copy-button') }}" :variant="$variant" :size="$size ?? ($iconOnly ? 'icon-sm' : 'sm')"
        :aria-label="$iconOnly ? $name : null"
        x-on:click="copy()" x-bind:data-copied="state === 'copied' ? '' : null"
        {{ $attributes->except('data-slot')->cn('data-copied:text-nq-success-text') }}>
        <x-lucide-copy aria-hidden="true" x-show="state !== 'copied'" />
        <x-lucide-check aria-hidden="true" x-show="state === 'copied'" style="display: none" />
        @unless ($iconOnly){{ $slot }}@endunless
    </x-nq::button>
    <span data-slot="copy-button-status" role="status" aria-live="polite" class="sr-only"
        data-copied-label="{{ $copied }}" data-failed-label="{{ $failed }}"
        x-text="state === 'copied' ? $el.dataset.copiedLabel : state === 'failed' ? $el.dataset.failedLabel : ''"></span>
</span>
