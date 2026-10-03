{{-- <x-nq::project-view.files :files="$files" upload download delete />
     The Files tab of x-nq::project-view: a searchable table of the project's files with Upload (a file picker), Download and Delete.
     files: [['id', 'name', 'size' (bytes), 'uploadedBy', 'uploadedAt']]. upload / download / delete: show that action.
     Events bubble from the table (nq-data-table-action { action: download | delete, row }); x-nq::project-view turns them, and the picked files, into
     nq-project-download-file, nq-project-delete-file and nq-project-upload. text: array overriding the words. locale: default the app locale.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['files' => [], 'upload' => false, 'download' => false, 'delete' => false, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_pv_words($locale, (array) $text);
    $size = function ($bytes) use ($locale) {
        $n = fn ($v, $f) => number_format($v, $f, '.', ',');

        return $bytes < 1024 ? $n($bytes, 0).' B' : ($bytes < 1048576 ? $n($bytes / 1024, 0).' KB' : $n($bytes / 1048576, 1).' MB');
    };
    $rows = collect($files)->map(fn ($f) => [
        'id' => (string) $f['id'], 'name' => $f['name'], 'size' => $size((int) $f['size']), 'bytes' => (int) $f['size'], 'by' => $f['uploadedBy'] ?? '—',
        'at' => nq_pv_iso($f['uploadedAt']).'Z',
    ])->values()->all();
    $columns = [
        ['id' => 'name', 'header' => $t['fileName'], 'type' => 'mono', 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'size', 'header' => $t['fileSize'], 'align' => 'end', 'sortable' => true, 'sortKey' => 'bytes'],
        ['id' => 'by', 'header' => $t['fileBy'], 'sortable' => true],
        ['id' => 'at', 'header' => $t['fileAt'], 'type' => 'datetime', 'sortable' => true],
    ];
    $actions = array_values(array_filter([
        $download ? ['id' => 'download', 'label' => $t['download'], 'icon' => 'download'] : null,
        $delete ? ['id' => 'delete', 'label' => $t['deleteFile'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-files') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    @if ($upload)
        <input type="file" multiple hidden data-pv-files x-on:change="pickFiles($event)" />
    @endif
    <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="filesError" x-cloak style="display: none" x-text="filesError"></p>
    <x-nq::data-table :label="$t['filesLabel']" :columns="$columns" :rows="$rows" row-key="id" name-key="name" :search="$t['search']" :view-options="false" :page-size="20" :row-actions="$actions" :locale="$locale">
        @if ($upload)
            <x-slot:toolbar><x-nq::button variant="primary" size="sm" class="ms-auto" x-bind:disabled="uploading" x-on:click="chooseFiles()"><x-lucide-upload aria-hidden="true" />{{ $t['upload'] }}</x-nq::button></x-slot:toolbar>
        @endif
        <x-slot:empty><x-nq::states.empty :title="$t['noFiles']" :description="$t['noFilesHint']" /></x-slot:empty>
    </x-nq::data-table>
</div>
