{{-- Internal: a radio card whose description and meta follow the checkout state. Sits inside <x-nq::radio-group x-model="...">.
     Needs $value, $title (html), $default (the group's default value); optional $description (static), $descExpr (Alpine expression for the description text), $meta (raw html), $disabledExpr. --}}
@php
    $checked = isset($default) && (string) $default === (string) $value;
@endphp
<button type="button" role="radio" data-slot="radio-card" x-bind="radio({{ \Illuminate\Support\Js::from((string) $value) }})"
    aria-checked="{{ $checked ? 'true' : 'false' }}" tabindex="{{ $checked ? 0 : -1 }}"
    @if ($checked) data-checked @else data-unchecked @endif
    @isset($disabledExpr) x-bind:disabled="{{ $disabledExpr }}" x-bind:data-disabled="{{ $disabledExpr }} ? '' : null" @endisset
    class="group/card relative flex w-full cursor-pointer items-start gap-3 rounded-card border border-border bg-card p-4 text-start outline-none transition-colors duration-150 ease-nq hover:border-nq-line-strong data-checked:border-primary data-checked:bg-nq-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50">
    <span data-slot="radio-card-mark" aria-hidden="true"
        class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card group-data-checked/card:border-primary group-data-checked/card:bg-primary">
        <span class="block size-1.5 rounded-full bg-primary-foreground" x-show="isChecked({{ \Illuminate\Support\Js::from((string) $value) }})" @unless ($checked) style="display: none" @endunless></span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="radio-card-title" class="text-label text-foreground">{!! $title !!}</span>
        @if (isset($description) || isset($descExpr))
            <span data-slot="radio-card-description" class="text-caption text-muted-foreground" @isset($descExpr) x-text="{{ $descExpr }}" @endisset>{!! $description ?? '' !!}</span>
        @endif
    </span>
    @isset($meta)<span data-slot="radio-card-meta" class="shrink-0 text-label text-foreground">{!! $meta !!}</span>@endisset
</button>
