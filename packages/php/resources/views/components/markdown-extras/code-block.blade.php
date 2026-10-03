{{-- <x-nq::markdown-extras.code-block language="ts" filename="sum.ts" line-numbers :code="$source" />
     A code block with a line-number toggle and a download button next to copy. Takes the props of <x-nq::code-block> (code, language, filename, line-numbers = the
     starting state, highlight-lines, label, pre-class ...) plus download (true), download-name (the filename, else code.<ext> by language), line-number-toggle (true),
     labels: lineNumbers, downloadCode overrides. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['code' => '', 'language' => 'text', 'filename' => null, 'lineNumbers' => false, 'highlightLines' => null, 'download' => true, 'downloadName' => null, 'lineNumberToggle' => true, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $L = array_merge(['lineNumbers' => $t('Line numbers', 'أرقام الأسطر'), 'downloadCode' => $t('Download file', 'تنزيل الملف')], (array) $labels);
    $source = preg_replace('/\n$/', '', (string) $code);
    $ext = ['ts' => 'ts', 'typescript' => 'ts', 'tsx' => 'tsx', 'js' => 'js', 'javascript' => 'js', 'jsx' => 'jsx', 'json' => 'json', 'bash' => 'sh', 'sh' => 'sh', 'shell' => 'sh', 'zsh' => 'sh',
        'css' => 'css', 'html' => 'html', 'md' => 'md', 'markdown' => 'md', 'go' => 'go', 'php' => 'php', 'py' => 'py', 'python' => 'py', 'sql' => 'sql', 'yaml' => 'yml', 'yml' => 'yml', 'text' => 'txt'];
    $clean = $filename !== null ? trim(preg_replace('/[\\\\\/:*?"<>|]+/', '-', $filename)) : '';
    $name = $downloadName ?? ($clean !== '' ? $clean : 'code.'.($ext[strtolower($language)] ?? 'txt'));
    $config = ['code' => $source, 'name' => $name, 'numbers' => (bool) $lineNumbers];
    $toggle = in_array($lineNumberToggle, [true, 'true', 1, '1'], true);
    $dl = in_array($download, [true, 'true', 1, '1'], true);
@endphp
<x-nq::code-block :code="$source" :language="$language" :filename="$filename" :line-numbers="(bool) $lineNumbers" :highlight-lines="$highlightLines" {{ $attributes->except('data-slot') }}>
    <x-slot:copyAction>
        <span class="flex items-center gap-0.5" x-data="nqCodeExtras({!! \Illuminate\Support\Js::from($config) !!})">
            @if ($toggle)
                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $L['lineNumbers'] }}" title="{{ $L['lineNumbers'] }}" x-on:click="toggle()" x-bind:aria-pressed="numbers" x-bind:class="numbers ? `bg-nq-selected` : ``"><x-lucide-list-ordered aria-hidden="true" /></x-nq::button>
            @endif
            @if ($dl)
                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $L['downloadCode'] }}" title="{{ $L['downloadCode'] }}" x-on:click="save()"><x-lucide-download aria-hidden="true" /></x-nq::button>
            @endif
            <x-nq::copy-button :value="$source" />
        </span>
    </x-slot:copyAction>
</x-nq::code-block>
