{{-- <x-nq::report-export-menu :document="['title' => 'Deals report', 'sections' => [['heading' => 'Totals', 'table' => ['columns' => ['Owner', 'Won'], 'rows' => [['Sara', 12]]]]]]" filename="deals" />
     An Export menu for a report: "Print or save as PDF" opens the browser print dialog for <x-nq::report-sheet>, Markdown downloads a .md file built from `document`, and Copy puts it on the clipboard.
     document: the report as data, { title, subtitle?, filters?: [['label','value']], generatedAt?, sections: [['heading'?, 'text'?, 'bullets'?, 'table'? => ['columns', 'rows']]] }.
     filename: without extension (default: the title). formats: any of pdf, markdown, copy (default all three). variant, size: the button's (secondary, sm). labels: override the strings by key.
     Fires "nq-report-print" (cancelable: preventDefault() to replace the print dialog, for example to call a server) and "nq-report-export" { format } after an export.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['document' => null, 'filename' => null, 'formats' => ['pdf', 'markdown', 'copy'], 'variant' => 'secondary', 'size' => 'sm', 'labels' => []])
@php
    $N = \Nasaq\Nasaq::class;
    $L = array_merge([
        'export' => $N::t('Export', 'تصدير'),
        'print' => $N::t('Print or save as PDF', 'طباعة أو حفظ PDF'),
        'markdown' => $N::t('Download Markdown', 'تنزيل Markdown'),
        'copyMarkdown' => $N::t('Copy as Markdown', 'نسخ بصيغة Markdown'),
        'copied' => $N::t('Copied', 'تم النسخ'),
        'failed' => $N::t('That did not save. Try again.', 'تعذّر الحفظ. حاول مرة أخرى.'),
    ], (array) $labels);
    $init = ['document' => $document, 'filename' => $filename, 't' => $L];
    $formats = (array) $formats;
@endphp
<span x-data="nqReportExportMenu({!! \Illuminate\Support\Js::from($init) !!})" {{ $attributes->cn('contents') }}>
    <x-nq::dropdown-menu>
        <x-nq::dropdown-menu.trigger :variant="$variant" :size="$size" data-slot="report-export-menu">
            <x-lucide-download aria-hidden="true" />
            {{ $L['export'] }}
        </x-nq::dropdown-menu.trigger>
        <x-nq::dropdown-menu.content align="end">
            @if (in_array('pdf', $formats, true))
                <x-nq::dropdown-menu.item x-on:click="run('pdf')"><x-lucide-printer aria-hidden="true" />{{ $L['print'] }}</x-nq::dropdown-menu.item>
            @endif
            @if (in_array('markdown', $formats, true))
                <x-nq::dropdown-menu.item x-on:click="run('markdown')"><x-lucide-file-text aria-hidden="true" />{{ $L['markdown'] }}</x-nq::dropdown-menu.item>
            @endif
            @if (in_array('copy', $formats, true))
                <x-nq::dropdown-menu.item x-on:click="run('copy')"><x-lucide-copy aria-hidden="true" />{{ $L['copyMarkdown'] }}</x-nq::dropdown-menu.item>
            @endif
        </x-nq::dropdown-menu.content>
    </x-nq::dropdown-menu>
    <span aria-live="polite" class="sr-only" x-text="note"></span>
</span>
