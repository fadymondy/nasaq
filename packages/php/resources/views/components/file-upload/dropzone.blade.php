{{-- <x-nq::file-upload.dropzone name="attachments" /> (used inside file-upload and image-upload)
     Click it, press Enter or Space, or drop files on it. The slot replaces the prompt text; localise it yourself.
     compact: the small square used by image-upload. name: names the hidden file input.
     Needs a parent with x-data="nqFileUpload(...)" or "nqImageUpload(...)". --}}
@props(['compact' => false, 'name' => null])
<div data-slot="{{ $attributes->get('data-slot', 'dropzone') }}" x-bind="zone" :aria-describedby="limitsText() ? $id('nq-upload', 'hint') : undefined"
    {{ $attributes->except('data-slot')->cn([
        'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-floating border border-dashed border-input bg-card p-6 text-center',
        'transition-colors duration-150 ease-nq outline-none',
        'hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
        'data-dragging:border-nq-focus data-dragging:bg-nq-selected',
        'data-invalid:border-nq-danger',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-card',
        'min-h-0 p-3' => $compact,
    ]) }}>
    <span aria-hidden="true" class="flex [&_svg]:size-6 text-muted-foreground"><x-lucide-upload /></span>
    <span class="text-label text-foreground">
        @if ($slot->isEmpty())
            <span x-text="dragging ? $nq.t('Drop to add', 'أفلت لإضافة الملفات') : $nq.t('Drag files here or click to browse', 'اسحب الملفات إلى هنا أو انقر للاستعراض')">{{ \Nasaq\Nasaq::t('Drag files here or click to browse', 'اسحب الملفات إلى هنا أو انقر للاستعراض') }}</span>
        @else
            {{ $slot }}
        @endif
    </span>
    <span x-show="limitsText()" x-cloak style="display: none" :id="$id('nq-upload', 'hint')" dir="auto" class="text-caption text-muted-foreground" x-text="limitsText()"></span>
    <input type="file" class="sr-only" tabindex="-1" x-ref="input" x-bind="picker" :accept="accept" :multiple="multiple" :disabled="disabled" @if ($name) name="{{ $name }}" @endif>
</div>
