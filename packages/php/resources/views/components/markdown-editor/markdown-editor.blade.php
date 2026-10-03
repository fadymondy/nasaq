{{-- <x-nq::markdown-editor :value="$text" view="split" name="body" aria-label="Description" />
     A plain-text Markdown editor (React MarkdownEditor): a formatting toolbar (bold, italic, heading, subheading, lists, tasks, quote, link,
     inline code, code block), a text area and a Write / Preview / Split view whose live preview uses the Markdown typography.
     Ctrl/Cmd+B, I and K work. No editor engine. For rich text use <x-nq::rich-text-editor>.
     value: the starting Markdown (x-model works on the text: x-model="draft" on the element). view: write (default) | preview | split.
     placeholder, rows (10), disabled, name (a hidden input for plain form posts), aria-label (the text area's name), labels: partial overrides.
     Event, bubbling from the root: nq-view-change { view }. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '', 'view' => 'write', 'placeholder' => null, 'rows' => 10, 'disabled' => false, 'name' => null, 'ariaLabel' => null, 'labels' => []])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $view = in_array($view, ['write', 'preview', 'split'], true) ? $view : 'write';
    $uid = 'nq-md-'.\Illuminate\Support\Str::random(6);
    $disabled = (bool) $disabled;
    $tools = [
        ['bold', 'bold', 'Bold', 'عريض', 'b'],
        ['italic', 'italic', 'Italic', 'مائل', 'i'],
        ['h2', 'heading-2', 'Heading', 'عنوان', null],
        ['h3', 'heading-3', 'Subheading', 'عنوان فرعي', null],
        ['bullet', 'list', 'Bulleted list', 'قائمة نقطية', null],
        ['ordered', 'list-ordered', 'Numbered list', 'قائمة مرقّمة', null],
        ['task', 'list-checks', 'Task list', 'قائمة مهام', null],
        ['quote', 'quote', 'Quote', 'اقتباس', null],
        ['link', 'link-2', 'Link', 'رابط', 'k'],
        ['code', 'code', 'Inline code', 'كود سطري', null],
        ['codeBlock', 'square-code', 'Code block', 'كتلة كود', null],
    ];
    $tool = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $options = \Illuminate\Support\Js::from(['value' => (string) $value, 'view' => $view, 'disabled' => $disabled, 'empty' => $L('empty', 'Nothing to preview yet.', 'لا شيء للمعاينة بعد.')])->toHtml();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'markdown-editor') }}" x-data="nqMarkdownEditor({!! $options !!})" x-modelable="body" x-bind:data-view="mode"
    {{ $attributes->except('data-slot')->cn(['flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card', $disabled ? 'opacity-60' : '']) }}>
    <div class="flex flex-wrap items-center gap-1 border-b border-border px-1.5 py-1">
        <div role="toolbar" aria-label="{{ $L('toolbar', 'Formatting', 'التنسيق') }}" aria-controls="{{ $uid }}" class="flex flex-wrap items-center gap-0.5">
            @foreach ($tools as [$format, $icon, $en, $arabic, $key])
                @php($text = $tool(['bullet' => 'bullets', 'ordered' => 'numbers', 'task' => 'tasks'][$format] ?? $format, $en, $arabic))
                <x-nq::tooltip :content="$key ? $text.' (⌘'.strtoupper($key).')' : $text">
                    <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$text" x-on:mousedown.prevent x-bind:disabled="locked()" x-on:click="apply('{{ $format }}')">
                        <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                    </x-nq::button>
                </x-nq::tooltip>
            @endforeach
        </div>
        <x-nq::toggle-group :default-value="[$view]" aria-label="{{ $L('view', 'View', 'طريقة العرض') }}" class="ms-auto" x-model="modes">
            <x-nq::toggle-group.toggle value="write" aria-label="{{ $L('write', 'Write', 'كتابة') }}">
                <x-lucide-pencil aria-hidden="true" />
                <span class="max-sm:hidden">{{ $L('write', 'Write', 'كتابة') }}</span>
            </x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="preview" aria-label="{{ $L('preview', 'Preview', 'معاينة') }}">
                <x-lucide-eye aria-hidden="true" />
                <span class="max-sm:hidden">{{ $L('preview', 'Preview', 'معاينة') }}</span>
            </x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="split" aria-label="{{ $L('split', 'Split', 'تقسيم') }}" class="max-md:hidden">
                <x-lucide-columns-2 aria-hidden="true" />
                <span class="max-sm:hidden">{{ $L('split', 'Split', 'تقسيم') }}</span>
            </x-nq::toggle-group.toggle>
        </x-nq::toggle-group>
    </div>

    <div class="grid min-h-0 flex-1" x-bind:class="isSplit() ? 'md:grid-cols-2 md:divide-x md:divide-border rtl:md:divide-x-reverse' : ''">
        <textarea id="{{ $uid }}" x-ref="field" x-model="body" x-show="showsEditor()" x-on:keydown="onKey($event)" dir="auto" rows="{{ (int) $rows }}"
            @if ($disabled) disabled @endif
            aria-label="{{ $ariaLabel ?? $L('write', 'Write', 'كتابة') }}" placeholder="{{ $placeholder ?? $L('placeholder', 'Write in Markdown…', 'اكتب بصيغة ماركداون…') }}"
            class="min-h-48 w-full resize-y bg-transparent p-3 font-mono text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:bg-nq-hover/40">{{ $value }}</textarea>
        <div data-slot="markdown-editor-preview" aria-live="polite" x-show="showsPreview()" x-html="previewHtml()"
            x-bind:class="isSplit() ? 'max-md:border-t max-md:border-border' : ''"
            @if ($view === 'write') style="display: none" @endif
            class="min-h-48 overflow-auto p-4">
            @if (trim((string) $value) !== '')
                <x-nq::markdown :source="$value" />
            @else
                <p class="text-body-sm text-muted-foreground">{{ $L('empty', 'Nothing to preview yet.', 'لا شيء للمعاينة بعد.') }}</p>
            @endif
        </div>
    </div>
    @if ($name)
        <input type="hidden" name="{{ $name }}" x-bind:value="body">
    @endif
</div>
