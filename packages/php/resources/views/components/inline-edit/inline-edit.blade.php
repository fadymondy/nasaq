{{-- <x-nq::inline-edit value="Launch plan" label="title" required :max-length="60" display-class="text-h3" @save="$event.detail.wait(save($event.detail.value))" />
     Edit in place: text that turns into an input on click, with Save and Cancel. Enter saves, Escape cancels, leaving the field saves (on-blur: save | cancel | none).
     value is x-modelable (x-model / wire:model). label names the field ("Edit title") and fills the empty text ("Add title"). Required.
     type: text | number | url | email. multiline gives a textarea (Enter adds a line, Ctrl/Cmd+Enter saves). rows, placeholder, required, max-length, ltr (default true for number, email, url).
     name adds a hidden input with the saved value, so it posts with a form. disabled and read-only show the value with no edit affordance.
     Saving fires "save" with { value, wait(promise) }: hand it the work, resolve with { error: 'message' } (or reject) to keep editing.
     Without a listener the value is accepted as is. display-class / input-class style the text and the input.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '', 'label', 'type' => 'text', 'multiline' => false, 'rows' => 3, 'placeholder' => null, 'required' => false, 'maxLength' => null, 'onBlur' => 'save', 'displayClass' => null, 'inputClass' => null, 'ltr' => null, 'disabled' => false, 'readOnly' => false, 'name' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $value = (string) $value;
    $forceLtr = $ltr ?? in_array($type, ['number', 'email', 'url'], true);
    $editLabel = $t::t("Edit {$label}", "تعديل {$label}");
    $empty = $value === '';
    $noEdit = $disabled || $readOnly;
    $init = ['type' => $type, 'multiline' => (bool) $multiline, 'required' => (bool) $required, 'maxLength' => $maxLength, 'blur' => $onBlur, 'locked' => (bool) $noEdit];
@endphp
<div data-slot="inline-edit" data-state="display" x-data="nqInlineEdit(@js($value), @js($init))" x-modelable="value" x-bind="root"
    {{ $attributes->cn('min-w-0') }}>
    @if ($name)<input type="hidden" name="{{ $name }}" value="{{ $value }}" x-bind:value="value">@endif
    <div x-show="!editing" @if (! $noEdit) x-on:click="open()" @endif>
        <button type="button" x-ref="display" @if ($noEdit) disabled @endif @unless ($readOnly) aria-label="{{ $editLabel }}" @endunless
            class="group/inline -mx-1.5 inline-flex max-w-full min-w-0 cursor-text items-center gap-2 rounded-control px-1.5 py-0.5 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:cursor-default disabled:hover:bg-transparent {{ $readOnly ? 'cursor-default hover:bg-transparent' : '' }}">
            <span dir="auto" x-bind="text"
                class="min-w-0 break-words {{ $multiline ? 'whitespace-pre-wrap' : '' }} {{ $empty ? 'text-muted-foreground' : '' }} {{ $displayClass }}">{{ $empty ? ($placeholder ?? $t::t("Add {$label}", "أضف {$label}")) : $value }}</span>
            @unless ($noEdit)
                <x-lucide-pencil aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100 pointer-coarse:opacity-100" />
            @endunless
        </button>
    </div>
    @unless ($noEdit)
        <div role="group" aria-label="{{ $editLabel }}" x-show="editing" x-cloak style="display: none" x-ref="editor" x-bind="group" class="flex min-w-0 flex-col gap-1.5">
            <div class="flex gap-1.5 {{ $multiline ? 'items-start' : 'items-center' }}">
                @if ($multiline)
                    <x-nq::field.textarea rows="{{ $rows }}" dir="auto" x-model="draft" x-bind="input" aria-label="{{ $editLabel }}" placeholder="{{ $placeholder }}" class="min-h-0 {{ $inputClass }}" />
                @else
                    <x-nq::field.input :type="$type === 'number' ? 'text' : $type" :ltr="$forceLtr" x-model="draft" x-bind="input" aria-label="{{ $editLabel }}" placeholder="{{ $placeholder }}"
                        :inputmode="$type === 'number' ? 'decimal' : null" :dir="$forceLtr ? null : 'auto'" class="h-control-sm {{ $inputClass }}" />
                @endif
                <div class="flex shrink-0 gap-1 {{ $multiline ? 'flex-col' : '' }}">
                    <x-nq::button type="button" variant="primary" size="icon-sm" aria-label="{{ $t::t('Save', 'حفظ') }}" x-bind="saveButton">
                        <x-nq::spinner x-show="pending" x-cloak style="display: none" />
                        <x-lucide-check x-show="!pending" aria-hidden="true" />
                    </x-nq::button>
                    <x-nq::button type="button" variant="secondary" size="icon-sm" aria-label="{{ $t::t('Cancel', 'إلغاء') }}" x-bind="cancelButton">
                        <x-lucide-x aria-hidden="true" />
                    </x-nq::button>
                </div>
            </div>
            <p role="alert" x-show="error" x-cloak style="display: none" x-text="error" x-bind:id="$id('inline-edit-error')" class="text-caption text-nq-danger-text"></p>
            @if ($multiline)
                <p x-show="!error" class="text-caption text-muted-foreground">{{ $t::t('Ctrl+Enter to save, Esc to cancel', 'Ctrl+Enter للحفظ وEsc للإلغاء') }}</p>
            @endif
        </div>
    @endunless
</div>
