{{-- <x-nq::rich-text-editor value="<p>Hello</p>" aria-label="Notes" load="() => import('/assets/tiptap.js')" />
     A rich text editor: bold, italic, underline, strike, code, three heading levels, lists, quote, link, undo and redo, with a Nasaq toolbar.
     Blocks carry dir="auto" so Arabic and English paragraphs align themselves. value (HTML, or JSON with format="json") is x-modelable: x-model / wire:model work.
     Tiptap is not bundled. Give `load` a JS expression returning a promise of { Editor, Extension, StarterKit, Placeholder }
     (from @tiptap/core, @tiptap/starter-kit and @tiptap/extensions), or set window.NasaqRichText = { load } once. Until it arrives the toolbar is disabled.
     toolbar: the items to show, in order (bold italic underline strike code h1 h2 h3 bulletList orderedList blockquote link undo redo); [] hides it.
     read-only, placeholder, min-height (default 10rem), aria-label. Events (bubbling): ready, change { value }, blur. Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'value' => '', 'format' => 'html', 'load' => null, 'placeholder' => null, 'readOnly' => false, 'minHeight' => '10rem', 'ariaLabel' => null,
    'toolbar' => ['bold', 'italic', 'underline', 'strike', 'code', 'h1', 'h2', 'h3', 'bulletList', 'orderedList', 'blockquote', 'link', 'undo', 'redo'],
])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $items = $readOnly ? [] : array_values((array) $toolbar);
    $has = fn (string $i) => in_array($i, $items, true);
    $marks = array_values(array_filter(['bold', 'italic', 'underline', 'strike', 'code'], $has));
    $blocks = array_values(array_filter(['h1', 'h2', 'h3', 'bulletList', 'orderedList', 'blockquote'], $has));
    $groups = array_values(array_filter([$marks, $blocks], fn ($g) => count($g) > 0));
    $hasTail = $has('link') || $has('undo') || $has('redo');
    $labels = [
        'bold' => $T('Bold', 'خط عريض'), 'italic' => $T('Italic', 'خط مائل'), 'underline' => $T('Underline', 'تسطير'),
        'strike' => $T('Strikethrough', 'يتوسطه خط'), 'code' => $T('Code', 'شيفرة'),
        'h1' => $T('Heading 1', 'عنوان 1'), 'h2' => $T('Heading 2', 'عنوان 2'), 'h3' => $T('Heading 3', 'عنوان 3'),
        'bulletList' => $T('Bulleted list', 'قائمة نقطية'), 'orderedList' => $T('Numbered list', 'قائمة مرقمة'), 'blockquote' => $T('Quote', 'اقتباس'),
    ];
    $icons = [
        'bold' => 'bold', 'italic' => 'italic', 'underline' => 'underline', 'strike' => 'strikethrough', 'code' => 'code',
        'h1' => 'heading-1', 'h2' => 'heading-2', 'h3' => 'heading-3', 'bulletList' => 'list', 'orderedList' => 'list-ordered', 'blockquote' => 'quote',
    ];
    $opts = array_filter([
        'format' => $format === 'json' ? 'json' : null,
        'readOnly' => $readOnly ?: null,
        'placeholder' => $placeholder,
        'ariaLabel' => $ariaLabel,
    ], fn ($v) => $v !== null);
    $optsJs = \Illuminate\Support\Js::from((object) $opts)->toHtml();
    if ($load) {
        $optsJs = 'Object.assign('.$optsJs.', { load: () => ('.$load.')() })';
    }
    $toggle = 'inline-flex size-control-sm shrink-0 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-control)-2px)] px-0 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs [&_svg]:size-4 [&_svg]:shrink-0';
    $content = [
        '[&_.tiptap]:min-h-[inherit] [&_.tiptap]:outline-none [&_.tiptap]:flex [&_.tiptap]:flex-col [&_.tiptap]:gap-3',
        '[&_.tiptap]:text-body [&_.tiptap]:text-nq-fg-body',
        '[&_.tiptap_p]:text-start [&_.tiptap_p]:min-h-[1lh]',
        '[&_.tiptap_h1]:text-h1 [&_.tiptap_h1]:text-foreground [&_.tiptap_h1]:text-start',
        '[&_.tiptap_h2]:text-h2 [&_.tiptap_h2]:text-foreground [&_.tiptap_h2]:text-start',
        '[&_.tiptap_h3]:text-h3 [&_.tiptap_h3]:text-foreground [&_.tiptap_h3]:text-start',
        '[&_.tiptap_ul]:list-disc [&_.tiptap_ol]:list-decimal [&_.tiptap_ul]:ps-6 [&_.tiptap_ol]:ps-6 [&_.tiptap_ul]:space-y-1 [&_.tiptap_ol]:space-y-1',
        '[&_.tiptap_li]:text-start [&_.tiptap_li]:marker:text-muted-foreground',
        '[&_.tiptap_blockquote]:border-s-2 [&_.tiptap_blockquote]:border-nq-line-strong [&_.tiptap_blockquote]:ps-4 [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:text-start',
        '[&_.tiptap_a]:rounded-[2px] [&_.tiptap_a]:text-foreground [&_.tiptap_a]:underline [&_.tiptap_a]:decoration-nq-line-strong [&_.tiptap_a]:underline-offset-4',
        '[&_.tiptap_strong]:font-semibold [&_.tiptap_strong]:text-foreground',
        '[&_.tiptap_code]:rounded-[4px] [&_.tiptap_code]:bg-secondary [&_.tiptap_code]:px-1 [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-code',
    ];
@endphp
<div data-slot="rich-text-editor" x-data="nqRichText(@js($value), {!! $optsJs !!})" x-modelable="value" @if ($readOnly) data-readonly="true" @endif
    {{ $attributes->cn([
        'flex min-w-0 flex-col overflow-hidden rounded-control border border-input bg-card text-foreground transition-colors duration-150 ease-nq',
        'focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus',
        $readOnly ? 'border-transparent bg-transparent' : '',
    ]) }}>
    @if (count($items) > 0)
        <div role="toolbar" aria-label="{{ $T('Formatting', 'التنسيق') }}" data-slot="rich-text-editor-toolbar" class="flex flex-wrap items-center gap-1 border-b border-border bg-card p-1.5">
            @foreach ($groups as $gi => $list)
                @if ($gi > 0)<x-nq::separator orientation="vertical" />@endif
                <div role="group" data-slot="toggle-group" data-multiple class="flex w-fit max-w-full rounded-control bg-transparent p-0">
                    @foreach ($list as $i)
                        <button type="button" data-slot="toggle" aria-label="{{ $labels[$i] }}" title="{{ $labels[$i] }}" x-on:mousedown.prevent x-on:click="run('{{ $i }}')"
                            :aria-pressed="on('{{ $i }}') ? 'true' : 'false'" :data-pressed="on('{{ $i }}') ? '' : undefined" :disabled="!ready" class="{{ $toggle }}">
                            @svg('lucide-'.$icons[$i], 'size-4')
                        </button>
                    @endforeach
                </div>
            @endforeach
            @if ($hasTail)
                @if (count($groups) > 0)<x-nq::separator orientation="vertical" />@endif
                <div class="relative flex items-center gap-0.5">
                    @if ($has('link'))
                        <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $T('Link', 'رابط') }}" title="{{ $T('Link', 'رابط') }}" ::aria-pressed="on('link') ? 'true' : 'false'" ::data-pressed="on('link') ? '' : undefined" ::aria-expanded="linkOpen ? 'true' : 'false'" ::disabled="!ready" class="data-pressed:bg-nq-selected" x-on:mousedown.prevent x-on:click="toggleLink()">
                            <x-lucide-link-2 aria-hidden="true" />
                        </x-nq::button>
                    @endif
                    @if ($has('undo'))
                        <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $T('Undo', 'تراجع') }}" title="{{ $T('Undo', 'تراجع') }}" ::disabled="!canUndo()" x-on:mousedown.prevent x-on:click="undo()">
                            <x-lucide-undo-2 aria-hidden="true" />
                        </x-nq::button>
                    @endif
                    @if ($has('redo'))
                        <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $T('Redo', 'إعادة') }}" title="{{ $T('Redo', 'إعادة') }}" ::disabled="!canRedo()" x-on:mousedown.prevent x-on:click="redo()">
                            <x-lucide-redo-2 aria-hidden="true" />
                        </x-nq::button>
                    @endif
                    @if ($has('link'))
                        <form x-show="linkOpen" x-cloak style="display: none" x-on:submit.prevent="applyLink()" x-on:keydown.escape="linkOpen = false" data-slot="rich-text-editor-link"
                            class="absolute start-0 top-full z-50 mt-1 flex w-72 flex-col gap-2 rounded-card border border-border bg-card p-3 shadow-floating">
                            <x-nq::field.input x-model="linkUrl" ltr type="text" inputmode="url" placeholder="https://" aria-label="{{ $T('Link address', 'عنوان الرابط') }}" x-on:input="linkError = false" ::aria-invalid="linkError ? 'true' : undefined" />
                            <div class="flex justify-end gap-2">
                                <x-nq::button type="button" size="sm" variant="ghost" x-show="on('link')" x-on:click="removeLink()">{{ $T('Remove link', 'إزالة الرابط') }}</x-nq::button>
                                <x-nq::button type="submit" size="sm" variant="primary">{{ $T('Apply', 'تطبيق') }}</x-nq::button>
                            </div>
                        </form>
                    @endif
                </div>
            @endif
        </div>
    @endif
    <div x-ref="host" style="min-height: {{ $minHeight }}" class="{{ \Nasaq\Cn::merge('min-w-0 flex-1 cursor-text '.($readOnly ? 'p-0' : 'px-3 py-2.5'), implode(' ', $content)) }}"></div>
</div>
