{{-- <x-nq::alert-dialog.confirm-button title="Delete this project?" description="This cannot be undone." confirm-label="Delete" wire:click="delete">Delete project</x-nq::alert-dialog.confirm-button>
     A button that asks before it acts: it opens an alert dialog. The slot is the trigger label. variant (default "danger") and
     size are shared by the trigger and the confirm button. confirm-label defaults to the trigger label; cancel-label to Cancel / إلغاء.
     Attributes that are not props (wire:click, x-on:click, @click, name, value) go on the confirm button, so they run only after the
     user confirms. The dialog closes on confirm; for an async action show your own pending state (wire:loading). --}}
@props(['title', 'description' => null, 'confirmLabel' => null, 'cancelLabel' => null, 'variant' => 'danger', 'size' => 'md', 'disabled' => false])
@php
    $label = trim(strip_tags((string) $slot));
@endphp
<x-nq::alert-dialog>
    <x-nq::alert-dialog.trigger :variant="$variant" :size="$size" :disabled="$disabled">{{ $slot }}</x-nq::alert-dialog.trigger>
    <x-nq::alert-dialog.content>
        <x-nq::alert-dialog.header>
            <x-nq::alert-dialog.title>{{ $title }}</x-nq::alert-dialog.title>
            @if ($description)
                <x-nq::alert-dialog.description>{{ $description }}</x-nq::alert-dialog.description>
            @endif
        </x-nq::alert-dialog.header>
        <x-nq::alert-dialog.footer>
            <x-nq::alert-dialog.cancel>{{ $cancelLabel ?? \Nasaq\Nasaq::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
            <x-nq::alert-dialog.action :variant="$variant" {{ $attributes }}>{{ $confirmLabel ?? ($label !== '' ? $label : \Nasaq\Nasaq::t('Confirm', 'تأكيد')) }}</x-nq::alert-dialog.action>
        </x-nq::alert-dialog.footer>
    </x-nq::alert-dialog.content>
</x-nq::alert-dialog>
