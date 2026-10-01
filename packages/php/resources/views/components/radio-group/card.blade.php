{{-- <x-nq::radio-group.card value="pro" title="Pro" description="For teams" meta="$29" />
     The card variant: the whole bordered card is the radio. For plan-style choices where each option needs a description or price.
     title, description and meta are plain text; the default slot replaces the title. --}}
@aware(['defaultValue' => null, 'disabled' => false])
@props(['value', 'title' => null, 'description' => null, 'meta' => null])
@php
    $checked = $defaultValue !== null && (string) $defaultValue === (string) $value;
    $off = $disabled || $attributes->has('disabled');
@endphp
<button type="button" role="radio" data-slot="radio-card" x-bind="radio(@js((string) $value))"
    aria-checked="{{ $checked ? 'true' : 'false' }}" tabindex="{{ $checked ? 0 : -1 }}"
    @if ($checked) data-checked @else data-unchecked @endif
    @if ($off) disabled data-disabled @endif
    {{ $attributes->except('disabled')->cn([
        'group/card relative flex w-full cursor-pointer items-start gap-3 rounded-card border border-border bg-card p-4 text-start outline-none',
        'transition-colors duration-150 ease-nq hover:border-nq-line-strong',
        'data-checked:border-primary data-checked:bg-nq-selected',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    ]) }}>
    <span data-slot="radio-card-mark" aria-hidden="true"
        class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card group-data-checked/card:border-primary group-data-checked/card:bg-primary">
        <span class="block size-1.5 rounded-full bg-primary-foreground" x-show="isChecked(@js((string) $value))" @unless ($checked) style="display: none" @endunless></span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="radio-card-title" class="text-label text-foreground">{{ $slot->isNotEmpty() ? $slot : $title }}</span>
        @if ($description)<span data-slot="radio-card-description" class="text-caption text-muted-foreground">{{ $description }}</span>@endif
    </span>
    @if ($meta)<span data-slot="radio-card-meta" class="shrink-0 text-label text-foreground">{{ $meta }}</span>@endif
</button>
