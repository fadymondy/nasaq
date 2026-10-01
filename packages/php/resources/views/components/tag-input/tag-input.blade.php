{{-- <x-nq::tag-input name="labels" :value="['design', 'urgent']" :suggestions="['design', 'research']" :max-tags="5" />
     Chips inside an input box. Enter, "," or the Arabic comma adds the typed text; Backspace on an empty input removes the last chip; pasting splits on commas and new lines.
     value: initial tags. name: renders one hidden input per tag. max-tags, suggestions, separators (keys), add-on-blur (default true), invalid, disabled, placeholder.
     validate: a JS expression of (tag, tags) returning true, false or a message string, e.g. validate="/^[a-z]+$/.test(tag) || 'Letters only'".
     x-model works (x-modelable="tags"); a refused tag dispatches "reject" ({ tag, reason: duplicate | invalid | max }): @reject="...".
     Extra attributes (id, aria-label) land on the text input. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => [], 'name' => null, 'maxTags' => null, 'suggestions' => null, 'separators' => null, 'addOnBlur' => true, 'invalid' => false, 'disabled' => false, 'placeholder' => null, 'validate' => null])
@php
    $options = array_filter([
        'maxTags' => $maxTags,
        'suggestions' => $suggestions,
        'separators' => $separators,
        'addOnBlur' => $addOnBlur ? null : false,
        'invalid' => $invalid ?: null,
    ], fn ($v) => $v !== null);
    $optionsJs = \Illuminate\Support\Js::from((object) $options)->toHtml();
    if ($validate) {
        $optionsJs = 'Object.assign('.$optionsJs.', { validate: (tag, tags) => ('.$validate.') })';
    }
    $hold = $placeholder ?? \Nasaq\Nasaq::t('Type and press Enter', 'اكتب ثم اضغط Enter');
    $removeLabel = fn () => \Nasaq\Nasaq::t('Remove', 'إزالة');
@endphp
<div data-slot="tag-input" x-data="nqTagInput(@js(array_values((array) $value)), {!! $optionsJs !!})" x-modelable="tags" x-bind="root"
    @if ($disabled) data-disabled @endif @if ($invalid) data-invalid @endif
    {{ $attributes->only(['class', 'x-model', 'x-on:reject', '@reject'])->cn('relative w-full') }}>
    <div data-slot="tag-input-box" x-bind="box"
        class="{{ \Nasaq\Cn::merge('flex min-h-control w-full min-w-0 flex-wrap items-center gap-1.5 rounded-control border border-input bg-card px-2 py-1 text-body text-foreground min-h-[max(var(--nq-control),var(--nq-touch-min,0px))] transition-colors duration-150 ease-nq focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger', $disabled ? 'cursor-not-allowed opacity-50' : '') }}">
        <template x-for="(tag, i) in tags" :key="tag">
            <span data-slot="tag-input-tag" data-variant="neutral" class="{{ \Nasaq\Cn::merge('inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-control border border-transparent bg-muted px-2 py-0.5 text-caption font-medium text-foreground', 'h-6 gap-0.5 ps-2 pe-0.5 text-body-sm') }}">
                <bdi x-text="tag"></bdi>
                <button type="button" @if ($disabled) disabled @endif :aria-label="@js($removeLabel()) + ' ' + tag" @click.stop="removeAt(i)"
                    class="inline-flex size-5 items-center justify-center rounded-[3px] text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <span aria-hidden="true" class="flex [&_svg]:size-3"><x-lucide-x /></span>
                </button>
            </span>
        </template>
        <input data-slot="tag-input-field" x-ref="field" x-bind="field" autocomplete="off" @if ($disabled) disabled @endif
            :placeholder="tags.length ? undefined : @js($hold)"
            @if ($suggestions) role="combobox" aria-autocomplete="list" :aria-controls="listId()" @endif
            {{ $attributes->except(['class', 'x-model', 'x-on:reject', '@reject'])->cn('h-7 min-w-24 flex-1 border-0 bg-transparent px-1 text-body outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]') }}>
    </div>
    @if ($suggestions)
        <ul x-show="showList()" x-cloak style="display: none" :id="listId()" role="listbox" aria-label="{{ \Nasaq\Nasaq::t('Suggestions', 'اقتراحات') }}" data-slot="tag-input-suggestions"
            class="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-floating border border-border bg-popover p-1 text-popover-foreground">
            <template x-for="(s, i) in filtered()" :key="s">
                <li role="option" data-slot="tag-input-suggestion" x-bind="option(s, i)" class="cursor-pointer rounded-control px-2 py-1.5 text-body-sm data-active:bg-nq-hover hover:bg-nq-hover">
                    <bdi x-text="s"></bdi>
                </li>
            </template>
        </ul>
    @endif
    <p x-show="error" x-cloak style="display: none" role="alert" data-slot="tag-input-error" x-text="error" class="mt-1.5 text-caption text-nq-danger-text"></p>
    <span role="status" aria-live="polite" class="sr-only" x-text="message"></span>
    @if ($name)
        <template x-for="tag in tags" :key="tag"><input type="hidden" name="{{ $name }}" :value="tag"></template>
    @endif
</div>
