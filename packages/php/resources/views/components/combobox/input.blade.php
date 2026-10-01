{{-- <x-nq::combobox.input placeholder="Search a country…" />
     Single-select control: a Select-looking box with a typeahead input, clear button and chevron.
     clearable (default true), invalid. Other attributes (placeholder, id, aria-label) land on the text input. --}}
@props(['clearable' => true, 'invalid' => false, 'clearLabel' => null, 'triggerLabel' => null])
<div data-slot="combobox-input-group" x-ref="anchor"
    class="{{ \Nasaq\Cn::merge('flex min-h-control min-w-0 w-full items-center gap-1 rounded-control border border-input bg-card text-body text-foreground transition-colors duration-150 ease-nq focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50', 'h-control ps-3 pe-1.5') }}">
    <input data-slot="combobox-input" x-ref="input" x-bind="input"
        @if ($invalid) data-invalid aria-invalid="true" @endif
        {{ $attributes->cn('h-full min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]') }}>
    @if ($clearable)
        <button data-slot="combobox-clear" x-bind="clear" aria-label="{{ $clearLabel ?? \Nasaq\Nasaq::t('Clear', 'مسح') }}"
            class="flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4 data-[hidden]:hidden"><x-lucide-x /></button>
    @endif
    <button data-slot="combobox-trigger" x-bind="trigger" aria-label="{{ $triggerLabel ?? \Nasaq\Nasaq::t('Open', 'فتح') }}"
        class="flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-chevrons-up-down /></button>
</div>
