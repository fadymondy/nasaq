{{-- Open with any element carrying data-nq-open="invite" (or $nq.openDialog('invite') in Alpine).
     <x-nq.dialog id="invite" title="Invite people" description="They get an email.">
         body
         <x-slot:footer>
             <x-nq.button data-nq-close>Cancel</x-nq.button>
             <x-nq.button variant="primary" wire:click="send">Send</x-nq.button>
         </x-slot:footer>
     </x-nq.dialog>
     size: sm | md | lg   variant="sheet" slides in from the end edge   :dismissible="false" ignores backdrop clicks.
     In Livewire, add wire:ignore.self so a re-render does not close it. --}}
@props(['id', 'title', 'description' => null, 'size' => 'md', 'variant' => 'dialog', 'dismissible' => true, 'closeLabel' => null])
<dialog id="{{ $id }}" data-nq="dialog" aria-labelledby="{{ $id }}-title"
    @if ($description) aria-describedby="{{ $id }}-desc" @endif
    @if ($size !== 'md') data-size="{{ $size }}" @endif
    @if ($variant === 'sheet') data-variant="sheet" @endif
    @unless ($dismissible) data-dismissible="false" @endunless
    {{ $attributes->merge(['class' => 'nq-dialog']) }}>
    <div class="nq-dialog-header">
        <h2 class="nq-dialog-title" id="{{ $id }}-title">{{ $title }}</h2>
        @if ($description)<p class="nq-dialog-description" id="{{ $id }}-desc">{{ $description }}</p>@endif
    </div>
    {{ $slot }}
    @isset($footer)<div class="nq-dialog-footer">{{ $footer }}</div>@endisset
    <button type="button" class="nq-dialog-close" data-nq-close aria-label="{{ $closeLabel ?? (str_starts_with(app()->getLocale(), 'ar') ? 'إغلاق' : 'Close') }}">&times;</button>
</dialog>
