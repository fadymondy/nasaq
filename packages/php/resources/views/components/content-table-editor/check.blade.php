{{-- Internal to <x-nq::content-table-editor>: a checkbox driven by the grid (x-bind="boxBind(`row`, row.id)"). Same look as <x-nq::checkbox>. --}}
<button type="button" role="checkbox" data-slot="{{ $attributes->get('data-slot', 'checkbox') }}"
    {{ $attributes->except('data-slot')->cn([
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none',
        'transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        'after:absolute after:-inset-1',
    ]) }}>
    <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3">
        <x-lucide-minus aria-hidden="true" class="hidden [[data-indeterminate]_&]:block" />
        <x-lucide-check aria-hidden="true" class="hidden [[data-checked]_&]:block" />
    </span>
</button>
