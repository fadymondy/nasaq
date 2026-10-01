{{-- <x-nq::combobox.chips placeholder="Pick countries" />
     Multi-select control (inside <x-nq::combobox multiple>): chips followed by the typeahead input.
     Backspace on an empty input removes the last chip. invalid, remove-label. Other attributes land on the text input. --}}
@props(['placeholder' => null, 'invalid' => false, 'removeLabel' => null])
<div data-slot="combobox-chips" x-ref="anchor"
    class="{{ \Nasaq\Cn::merge('flex min-h-control min-w-0 w-full items-center gap-1 rounded-control border border-input bg-card text-body text-foreground transition-colors duration-150 ease-nq focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50', 'flex-wrap px-1.5 py-1') }}">
    <template x-for="v in selected()" :key="v">
        <span data-slot="combobox-chip" class="inline-flex h-6 max-w-full items-center gap-1 rounded-[4px] border border-border bg-secondary ps-2 pe-0.5 text-body-sm text-foreground outline-none data-highlighted:border-nq-focus">
            <span class="min-w-0 truncate" x-text="labelOf(v)"></span>
            <button type="button" data-slot="combobox-chip-remove" tabindex="-1" :aria-label="@js($removeLabel ?? \Nasaq\Nasaq::t('Remove', 'إزالة')) + ' ' + labelOf(v)" @click.stop="remove(v)"
                class="flex size-5 shrink-0 cursor-default items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground [&_svg]:size-3"><x-lucide-x /></button>
        </span>
    </template>
    <input data-slot="combobox-input" x-ref="input" x-bind="input" :placeholder="hasValue() ? undefined : @js($placeholder ?? '')"
        @if ($invalid) data-invalid aria-invalid="true" @endif
        {{ $attributes->cn('h-full min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]', 'h-6 min-w-16 ps-1.5') }}>
</div>
