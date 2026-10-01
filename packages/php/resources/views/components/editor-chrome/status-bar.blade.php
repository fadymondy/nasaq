{{-- <x-nq::editor-chrome.status-bar source="#editor" save-state="saved" />
     The strip under an editor: cursor (Ln, Col), selection, words and characters, and a save state announced politely (an error at once).
     source: a CSS selector for the textarea or input that drives the counts and the caret. Or set them: words, characters, line, column, selection (numbers),
     and later send a window event "nq-editor-status" with a partial of those plus saveState. save-state: saved | saving | dirty | error | offline.
     retry: shows a Retry button on error (it dispatches a bubbling "nq-editor-retry"). The default slot adds items at the inline start; the trailing slot sits before the save state.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['source' => null, 'saveState' => null, 'words' => null, 'characters' => null, 'line' => null, 'column' => null, 'selection' => null, 'retry' => false, 'trailing' => null])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $initial = array_filter(['words' => $words, 'characters' => $characters, 'line' => $line, 'column' => $column, 'selection' => $selection, 'saveState' => $saveState], fn ($v) => $v !== null);
    $options = array_filter(['source' => $source]);
    $label = \Nasaq\Nasaq::t('Editor status', 'حالة المحرر');
@endphp
<div data-slot="editor-status-bar" role="group" aria-label="{{ $label }}" x-data="nqEditorStatus({!! $js((object) $initial) !!}, {!! $js((object) $options) !!})" x-on:nq-editor-status.window="set($event.detail)"
    {{ $attributes->cn('flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-nq-surface-soft px-3 py-1 text-caption text-muted-foreground') }}>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span x-show="s.line !== undefined" x-text="position()" class="tabular-nums"></span>
        <span x-show="s.selection > 0" x-text="selected()" class="tabular-nums" style="display: none"></span>
        <span x-show="s.words !== undefined" x-text="wordsText()" class="tabular-nums"></span>
        <span x-show="s.characters !== undefined" x-text="charsText()" class="tabular-nums"></span>
        {{ $slot }}
    </div>
    <div class="flex items-center gap-x-4">
        {{ $trailing }}
        <span data-slot="editor-save-state" x-show="s.saveState" x-bind:data-state="s.saveState" x-bind:role="attention() ? 'alert' : 'status'"
            x-bind:class="s.saveState === 'error' ? 'text-nq-danger-text' : (s.saveState === 'offline' ? 'text-nq-warning-text' : '')"
            class="inline-flex items-center gap-1.5" @if (! $saveState) style="display: none" @endif>
            <x-lucide-loader-circle x-show="s.saveState === 'saving'" aria-hidden="true" class="size-3 animate-spin motion-reduce:animate-none" style="display: none" />
            <span x-show="s.saveState === 'dirty'" aria-hidden="true" class="size-2 rounded-full bg-nq-accent" style="display: none"></span>
            <x-lucide-check x-show="s.saveState === 'saved'" aria-hidden="true" class="size-3" style="display: none" />
            <x-lucide-alert-circle x-show="s.saveState === 'error'" aria-hidden="true" class="size-3" style="display: none" />
            <x-lucide-cloud-off x-show="s.saveState === 'offline'" aria-hidden="true" class="size-3" style="display: none" />
            <span x-text="stateText()"></span>
            @if ($retry)
                <button type="button" x-show="s.saveState === 'error'" x-on:click="retry()" style="display: none"
                    class="rounded-[2px] text-foreground underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">{{ \Nasaq\Nasaq::t('Retry', 'إعادة المحاولة') }}</button>
            @endif
        </span>
    </div>
</div>
