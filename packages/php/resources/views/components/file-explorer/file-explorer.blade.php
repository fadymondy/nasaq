{{-- <x-nq::file-explorer :nodes="$nodes" can-upload can-create-folder can-delete can-download
         x-on:nq-file-upload="$event.detail.wait(…)" x-on:nq-file-create-folder="$event.detail.wait(…)" x-on:nq-file-delete="$event.detail.wait(…)" x-on:nq-file-download="…" />
     A file browser: a folder tree, breadcrumbs, a sortable list or a grid, a preview pane, upload by button or drop, new folder and delete.
     It has no storage. Folders, rows and previews are rendered here; Alpine shows the open folder, sorts, searches and runs the dialogs.
     nodes: nested arrays ['id' => 'docs', 'name' => 'Documents', 'kind' => 'folder'|'file', 'size' => 2048, 'modifiedAt' => '2026-09-20T10:00:00Z',
            'mime' => 'application/pdf', 'previewUrl' => '/img.png' (images), 'previewText' => '# text' (a code preview), 'children' => [...]]. Give every node a unique id.
     folder: the open folder id (default the root). selected: the previewed file id. view: list (default) | grid. root-label: the root's name (All files / كل الملفات).
     can-upload shows Upload and the drop zone. can-create-folder shows New folder. can-delete shows Delete (confirm first). can-download shows Download.
     context-menu: Download and Delete open as a context menu on every row and tile (default true). loading: skeleton rows. title: the region label.
     labels: an array that replaces any built-in text (keys as in the first lines of the component).
     Events on the root (each carries detail.wait(promise); resolve { error: 'text' } to show an error):
       nq-file-upload { files, folder }   nq-file-create-folder { name, parent }   nq-file-delete { id }   nq-file-download { id } (no wait)
       nq-file-open { id }   nq-file-select { id }   (plain notifications)
     After an upload or a new folder, re-render the component with the new nodes. A deleted row is hidden without a re-render.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'nodes' => [], 'rootLabel' => null, 'folder' => null, 'selected' => null, 'view' => 'list',
    'canUpload' => false, 'canCreateFolder' => false, 'canDelete' => false, 'canDownload' => false,
    'contextMenu' => true, 'loading' => false, 'title' => null, 'labels' => [],
])
@php
    $n = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $ar = \Nasaq\Nasaq::rtl();
    $t = array_merge([
        'title' => $n('Files', 'الملفات'), 'root' => $n('All files', 'كل الملفات'), 'folders' => $n('Folders', 'المجلدات'), 'breadcrumb' => $n('Path', 'المسار'),
        'search' => $n('Search in this folder', 'ابحث في هذا المجلد'), 'view' => $n('View', 'العرض'), 'listView' => $n('List', 'قائمة'), 'gridView' => $n('Grid', 'شبكة'),
        'upload' => $n('Upload', 'رفع'), 'newFolder' => $n('New folder', 'مجلد جديد'), 'name' => $n('Name', 'الاسم'), 'modified' => $n('Modified', 'آخر تعديل'), 'size' => $n('Size', 'الحجم'),
        'listLabel' => $n('Files in this folder', 'ملفات هذا المجلد'), 'gridLabel' => $n('Files in this folder', 'ملفات هذا المجلد'),
        'emptyTitle' => $n('This folder is empty', 'هذا المجلد فارغ'), 'emptyBody' => $n('Drop files here or use Upload.', 'أفلت الملفات هنا أو استخدم زر الرفع.'),
        'noMatch' => $n('Nothing here matches your search.', 'لا يوجد ما يطابق بحثك هنا.'), 'loading' => $n('Loading files', 'جارٍ تحميل الملفات'), 'dropHere' => $n('Drop to upload', 'أفلت للرفع'),
        'preview' => $n('Preview', 'المعاينة'), 'previewNone' => $n('Select a file to preview it', 'اختر ملفًا لمعاينته'), 'closePreview' => $n('Close preview', 'إغلاق المعاينة'),
        'type' => $n('Type', 'النوع'), 'location' => $n('Location', 'الموقع'), 'download' => $n('Download', 'تنزيل'), 'remove' => $n('Delete', 'حذف'),
        'noPreview' => $n('No preview for this file type', 'لا توجد معاينة لهذا النوع من الملفات'),
        'folderTitle' => $n('New folder', 'مجلد جديد'), 'folderBody' => $n('Created inside the current folder.', 'يُنشأ داخل المجلد الحالي.'), 'folderName' => $n('Folder name', 'اسم المجلد'),
        'folderEmpty' => $n('Enter a name.', 'أدخل اسمًا.'), 'folderInvalid' => $n('A name cannot contain / \\ : * ? " < > |', 'لا يجوز أن يحتوي الاسم على / \\ : * ? " < > |'),
        'folderDuplicate' => $n('Something with this name is already here.', 'يوجد هنا عنصر بهذا الاسم.'), 'folderReserved' => $n('That name is not allowed.', 'هذا الاسم غير مسموح.'),
        'create' => $n('Create', 'إنشاء'), 'cancel' => $n('Cancel', 'إلغاء'), 'genericError' => $n('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'deleteTitle' => $n('Delete {name}?', 'حذف {name}؟'), 'deleteBodyFile' => $n('The file is removed for everyone who can see this folder.', 'يُزال الملف لكل من يرى هذا المجلد.'),
        'deleteBodyEmpty' => $n('The empty folder is removed.', 'يُزال المجلد الفارغ.'), 'deleteBodyOne' => $n('The folder and the 1 item inside it are removed.', 'يُزال المجلد والعنصر الواحد بداخله.'),
        'deleteBodyMany' => $n('The folder and the {n} items inside it are removed.', 'يُزال المجلد و{n} عناصر بداخله.'), 'deleteConfirm' => $n('Delete', 'حذف'),
        'itemOne' => $n('1 item', 'عنصر واحد'), 'itemTwo' => $n('{n} items', 'عنصران'), 'itemFew' => $n('{n} items', '{n} عناصر'), 'itemMany' => $n('{n} items', '{n} عنصرًا'),
        'kinds' => [
            'folder' => $n('Folder', 'مجلد'), 'image' => $n('Image', 'صورة'), 'video' => $n('Video', 'فيديو'), 'audio' => $n('Audio', 'صوت'), 'pdf' => $n('PDF document', 'مستند PDF'),
            'archive' => $n('Archive', 'أرشيف'), 'code' => $n('Source file', 'ملف برمجي'), 'sheet' => $n('Spreadsheet', 'جدول بيانات'), 'doc' => $n('Document', 'مستند'),
            'text' => $n('Text file', 'ملف نصي'), 'other' => $n('File', 'ملف'),
        ],
    ], (array) $labels);
    $rootName = $rootLabel ?? $t['root'];
    $items = fn (int $c) => str_replace('{n}', (string) $c, $c === 1 ? $t['itemOne'] : ($c === 2 ? $t['itemTwo'] : ($c <= 10 ? $t['itemFew'] : $t['itemMany'])));

    $ext = fn (string $name) => (($i = strrpos($name, '.')) !== false && $i > 0 && $i < strlen($name) - 1) ? strtolower(substr($name, $i + 1)) : '';
    $extKinds = [
        'image' => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'], 'video' => ['mp4', 'mov', 'webm', 'mkv', 'avi'], 'audio' => ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
        'pdf' => ['pdf'], 'archive' => ['zip', 'gz', 'tar', 'rar', '7z', 'tgz'],
        'code' => ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'css', 'html', 'go', 'py', 'rs', 'sh', 'sql', 'yml', 'yaml', 'php'],
        'sheet' => ['csv', 'xlsx', 'xls', 'tsv'], 'doc' => ['doc', 'docx', 'pptx', 'ppt', 'odt'], 'text' => ['txt', 'md', 'log', 'env'],
    ];
    $kindOf = function (array $node) use ($ext, $extKinds) {
        if (($node['kind'] ?? 'file') === 'folder') {
            return 'folder';
        }
        $mime = (string) ($node['mime'] ?? '');
        foreach (['image', 'video', 'audio'] as $k) {
            if (str_starts_with($mime, $k.'/')) {
                return $k;
            }
        }
        if ($mime === 'application/pdf') {
            return 'pdf';
        }
        $e = $ext((string) $node['name']);
        foreach ($extKinds as $k => $list) {
            if (in_array($e, $list, true)) {
                return $k;
            }
        }
        return 'other';
    };
    $icons = ['folder' => 'folder', 'image' => 'file-image', 'video' => 'file-video', 'audio' => 'file-audio', 'pdf' => 'file-text', 'archive' => 'file-archive', 'code' => 'file-code', 'sheet' => 'file-spreadsheet', 'doc' => 'file-text', 'text' => 'file-text', 'other' => 'file'];
    $units = [['B', 'ب'], ['KB', 'ك.ب'], ['MB', 'م.ب'], ['GB', 'ج.ب'], ['TB', 'ت.ب']];
    $fileSize = function ($bytes) use ($units, $ar) {
        $v = (float) $bytes;
        $i = 0;
        while ($v >= 1024 && $i < 4) {
            $v /= 1024;
            $i++;
        }
        $num = $i === 0 ? (string) (int) $v : rtrim(rtrim(number_format($v, 1, '.', ''), '0'), '.');
        return $num.' '.$units[$i][$ar ? 1 : 0];
    };

    // Flatten the nested nodes: one record per node, in sorted (folders first, then name) order inside every folder.
    $flat = [];
    $walk = function (array $list, string $parent, int $level) use (&$walk, &$flat, $kindOf) {
        $list = array_values($list);
        usort($list, function ($a, $b) {
            $fa = ($a['kind'] ?? 'file') === 'folder';
            $fb = ($b['kind'] ?? 'file') === 'folder';
            return $fa !== $fb ? ($fa ? -1 : 1) : strnatcasecmp((string) $a['name'], (string) $b['name']);
        });
        foreach ($list as $node) {
            $id = (string) $node['id'];
            $folderNode = ($node['kind'] ?? 'file') === 'folder';
            $flat[$id] = $node + ['kind' => 'file'];
            $flat[$id]['id'] = $id;
            $flat[$id]['parent'] = $parent;
            $flat[$id]['level'] = $level;
            $flat[$id]['isFolder'] = $folderNode;
            $flat[$id]['fk'] = $kindOf($node);
            $flat[$id]['count'] = $folderNode ? count($node['children'] ?? []) : 0;
            $flat[$id]['subfolders'] = $folderNode ? count(array_filter($node['children'] ?? [], fn ($c) => ($c['kind'] ?? 'file') === 'folder')) : 0;
            if ($folderNode) {
                $walk($node['children'] ?? [], $id, $level + 1);
            }
        }
    };
    $walk((array) $nodes, '', 1);

    $open = (string) ($folder ?? '');
    if ($open !== '' && ! (($flat[$open]['isFolder'] ?? false))) {
        $open = '';
    }
    $trail = [];
    for ($at = $open; $at !== ''; $at = $flat[$at]['parent']) {
        array_unshift($trail, $at);
    }
    $picked = ($selected !== null && (($flat[(string) $selected]['isFolder'] ?? true) === false)) ? (string) $selected : null;
    $inOpen = fn (string $id) => $flat[$id]['parent'] === $open;
    $count = fn (string $id) => count(array_filter($flat, fn ($c) => $c['parent'] === $id));
    $folders = array_filter($flat, fn ($c) => $c['isFolder']);
    $here = count(array_filter($flat, fn ($c) => $c['parent'] === $open));
    $ts = fn ($v) => $v === null ? null : (int) round((\Carbon\Carbon::parse($v instanceof \DateTimeInterface ? $v : (is_numeric($v) ? '@'.$v : $v)))->getTimestamp() * 1000);

    $config = [
        'folder' => $open,
        'picked' => $picked,
        'view' => $view === 'grid' ? 'grid' : 'list',
        'locale' => $ar ? 'ar' : 'en',
        'rootLabel' => $rootName,
        'nodes' => array_values(array_map(fn ($c) => [
            'id' => $c['id'], 'parent' => $c['parent'], 'name' => (string) $c['name'], 'folder' => $c['isFolder'],
            'size' => isset($c['size']) ? (int) $c['size'] : null, 'mod' => isset($c['modifiedAt']) ? $ts($c['modifiedAt']) : null, 'count' => $c['count'],
        ], $flat)),
        'labels' => [
            'items' => ['one' => $t['itemOne'], 'two' => $t['itemTwo'], 'few' => $t['itemFew'], 'many' => $t['itemMany']],
            'genericError' => $t['genericError'],
            'problems' => ['empty' => $t['folderEmpty'], 'invalid' => $t['folderInvalid'], 'duplicate' => $t['folderDuplicate'], 'reserved' => $t['folderReserved']],
            'deleteTitle' => $t['deleteTitle'], 'deleteFile' => $t['deleteBodyFile'],
            'deleteFolder' => ['zero' => $t['deleteBodyEmpty'], 'one' => $t['deleteBodyOne'], 'many' => $t['deleteBodyMany']],
        ],
    ];
    $hasActions = $canDelete || $canDownload;
    $cols = 'grid grid-cols-[minmax(0,1fr)_6rem] sm:grid-cols-[minmax(0,1fr)_8rem_6rem]';
    $headBtn = 'inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 -mx-1.5 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus';
    $iconBtn = 'inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4';
    $j = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $location = fn (array $c) => implode(' / ', array_merge([$rootName], array_map(fn ($id) => (string) $flat[$id]['name'], (function () use ($c, $flat) {
        $out = [];
        for ($at = $c['parent']; $at !== ''; $at = $flat[$at]['parent']) {
            array_unshift($out, $at);
        }
        return $out;
    })())));
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'file-explorer') }}" aria-label="{{ $title ?? $t['title'] }}" x-data="nqFileExplorer(@js($config))"
    {{ $attributes->except('data-slot')->cn('grid min-w-0 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_18rem]') }}>
    <aside aria-label="{{ $t['folders'] }}" class="min-w-0 rounded-card border border-border bg-card p-2 max-lg:max-h-48 max-lg:overflow-y-auto lg:max-h-[36rem] lg:overflow-y-auto">
        <div data-slot="file-explorer-tree" role="tree" aria-label="{{ $t['folders'] }}" class="flex flex-col gap-0.5 text-body text-foreground">
            @php
                $treeClass = 'flex min-h-8 cursor-default items-center gap-1.5 rounded-control pe-2 outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-[selected]:bg-nq-selected';
            @endphp
            <div data-slot="file-explorer-tree-item" role="treeitem" tabindex="0" data-node-id="" aria-level="1" aria-expanded="true"
                x-bind:aria-selected="isHere('') ? 'true' : 'false'" x-bind:data-selected="isHere('') ? '' : null"
                x-on:click="enter('')" x-on:keydown.enter.self.prevent="enter('')" x-on:keydown.space.self.prevent="enter('')"
                style="padding-inline-start: 0.375rem" class="{{ $treeClass }}">
                <x-lucide-folder-open aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                <bdi dir="auto" class="min-w-0 flex-1 truncate">{{ $rootName }}</bdi>
            </div>
            @foreach ($folders as $f)
                @php($shown = $f['parent'] === '' || in_array($f['parent'], $trail, true))
                <div data-slot="file-explorer-tree-item" role="treeitem" tabindex="0" data-node-id="{{ $f['id'] }}" aria-level="{{ $f['level'] + 1 }}"
                    x-show="treeShown({!! $j($f['id']) !!})"
                    @if ($f['subfolders']) x-bind:aria-expanded="treeOpen({!! $j($f['id']) !!}) ? 'true' : 'false'" @endif
                    x-bind:aria-selected="isHere({!! $j($f['id']) !!}) ? 'true' : 'false'" x-bind:data-selected="isHere({!! $j($f['id']) !!}) ? '' : null"
                    x-on:click="enter({!! $j($f['id']) !!})" x-on:keydown.enter.self.prevent="enter({!! $j($f['id']) !!})" x-on:keydown.space.self.prevent="enter({!! $j($f['id']) !!})"
                    style="@unless ($shown) display: none; @endunless padding-inline-start: {{ $f['level'] * 1.25 + 0.375 }}rem" class="{{ $treeClass }}">
                    <x-lucide-folder aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                    <bdi dir="auto" class="min-w-0 flex-1 truncate">{{ $f['name'] }}</bdi>
                </div>
            @endforeach
        </div>
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <nav data-slot="breadcrumb" aria-label="{{ $t['breadcrumb'] }}">
                <ol data-slot="breadcrumb-list" class="flex min-w-0 flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground">
                    <template x-for="crumb in crumbs()" x-bind:key="crumb.id">
                        <li data-slot="breadcrumb-item" class="inline-flex min-w-0 items-center gap-1.5">
                            <span x-show="crumb.last" aria-current="page" data-slot="breadcrumb-page" class="truncate text-foreground"><bdi dir="auto" x-text="crumb.name"></bdi></span>
                            <span x-show="! crumb.last" class="inline-flex min-w-0 items-center gap-1.5">
                                <a href="#" data-slot="breadcrumb-link" x-on:click.prevent="enter(crumb.id)" class="truncate rounded-[3px] transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"><bdi dir="auto" x-text="crumb.name"></bdi></a>
                                <span data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" class="inline-flex [&_svg]:size-3.5 rtl:-scale-x-100"><x-lucide-chevron-right /></span>
                            </span>
                        </li>
                    </template>
                </ol>
            </nav>
            <div class="flex flex-wrap items-center gap-2">
                @if ($canCreateFolder)
                    <x-nq::button size="sm" x-on:click="beginNew()"><x-lucide-folder-plus aria-hidden="true" />{{ $t['newFolder'] }}</x-nq::button>
                @endif
                @if ($canUpload)
                    <input type="file" multiple class="sr-only" tabindex="-1" aria-hidden="true" x-ref="picker" x-on:change="onPick($event)" />
                    <x-nq::button size="sm" variant="primary" x-on:click="$refs.picker.click()" x-bind:aria-busy="uploading ? 'true' : null"><x-lucide-upload aria-hidden="true" />{{ $t['upload'] }}</x-nq::button>
                @endif
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <x-nq::input-group class="min-w-0 max-w-sm flex-1">
                <x-nq::input-group.addon align="start"><x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" /></x-nq::input-group.addon>
                <x-nq::input-group.input type="search" x-model="needle" placeholder="{{ $t['search'] }}" aria-label="{{ $t['search'] }}" />
            </x-nq::input-group>
            <div role="group" aria-label="{{ $t['view'] }}" class="ms-auto inline-flex rounded-control border border-border p-0.5">
                <button type="button" aria-label="{{ $t['listView'] }}" title="{{ $t['listView'] }}" x-on:click="setView('list')" x-bind:aria-pressed="viewMode === 'list' ? 'true' : 'false'"
                    x-bind:class="viewMode === 'list' ? 'bg-secondary' : ''" class="{{ $iconBtn }}"><x-lucide-list aria-hidden="true" /></button>
                <button type="button" aria-label="{{ $t['gridView'] }}" title="{{ $t['gridView'] }}" x-on:click="setView('grid')" x-bind:aria-pressed="viewMode === 'grid' ? 'true' : 'false'"
                    x-bind:class="viewMode === 'grid' ? 'bg-secondary' : ''" class="{{ $iconBtn }}"><x-lucide-layout-grid aria-hidden="true" /></button>
            </div>
        </div>

        <div x-show="notice" style="display: none" data-slot="file-explorer-notice">
            <x-nq::alert tone="danger" role="alert"><span x-text="notice"></span></x-nq::alert>
        </div>

        <div data-slot="file-explorer-listing" class="relative min-w-0 rounded-card" x-bind:data-dragging="dragging ? '' : null" x-bind:class="dragging ? 'outline-2 -outline-offset-2 outline-nq-focus outline-dashed' : ''"
            @if ($canUpload) x-on:dragenter="dragIn($event)" x-on:dragover="dragOver($event)" x-on:dragleave="dragOut()" x-on:drop="dropIn($event)" @endif>
            @if ($canUpload)
                <div x-show="dragging" style="display: none" class="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-card/85 text-label text-foreground">
                    <x-lucide-upload aria-hidden="true" class="me-2 size-5" />{{ $t['dropHere'] }}
                </div>
            @endif
            @if ($loading)
                <x-nq::states.loading :label="$t['loading']" :rows="5" />
            @else
                <div x-show="isEmpty()" @if ($here > 0) style="display: none" @endif>
                    <x-nq::states.empty icon="folder-open" :title="$t['emptyTitle']" :description="$canUpload ? $t['emptyBody'] : null">
                        @if ($canUpload)
                            <x-slot:actions>
                                <x-nq::button variant="primary" x-on:click="$refs.picker.click()"><x-lucide-upload aria-hidden="true" />{{ $t['upload'] }}</x-nq::button>
                            </x-slot:actions>
                        @endif
                    </x-nq::states.empty>
                </div>
                <p x-show="isNoMatch()" style="display: none" class="rounded-card border border-dashed border-border px-4 py-10 text-center text-body-sm text-muted-foreground">{{ $t['noMatch'] }}</p>

                <div data-slot="file-explorer-list" role="grid" aria-label="{{ $t['listLabel'] }}" x-show="showList()" @if ($view === 'grid' || $here === 0) style="display: none" @endif
                    class="min-w-0 overflow-x-auto text-body-sm">
                    <div role="rowgroup" class="block">
                        <div role="row" class="{{ $cols }} border-b border-border">
                            @foreach ([['name', $t['name'], ''], ['modified', $t['modified'], 'hidden sm:block'], ['size', $t['size'], 'text-end']] as [$col, $label, $extra])
                                <div role="columnheader" data-slot="table-head" data-col="{{ $col }}" x-bind:aria-sort="ariaSort('{{ $col }}')"
                                    class="flex h-row items-center px-4 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground {{ $extra }} {{ $col === 'size' ? 'justify-end' : '' }}">
                                    <button type="button" x-on:click="sortOn('{{ $col }}')" class="{{ $headBtn }}">
                                        <span>{{ $label }}</span>
                                        <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 shrink-0 opacity-40" />
                                    </button>
                                </div>
                            @endforeach
                        </div>
                    </div>
                    <div role="rowgroup" class="flex flex-col">
                        @foreach ($flat as $c)
                            <x-nq::file-explorer.entry role="row" :id="$c['id']" :folder="$c['isFolder']" :selectable="! $c['isFolder']"
                                :menu="$contextMenu && (($canDownload && ! $c['isFolder']) || $canDelete)" :hidden="! $inOpen($c['id'])"
                                :can-download="$canDownload" :can-delete="$canDelete" :download-label="$t['download']" :delete-label="$t['remove']"
                                class="{{ $cols }} items-center border-b border-border hover:bg-nq-hover data-[selected]:bg-nq-selected">
                                <div role="gridcell" data-slot="table-cell" class="flex h-row min-w-0 items-center gap-2 px-4 py-3">
                                    <x-dynamic-component :component="'lucide-'.$icons[$c['fk']]" aria-hidden="true" class="{{ $c['isFolder'] ? 'text-nq-accent-text' : 'text-muted-foreground' }} size-4.5 shrink-0" />
                                    <bdi dir="auto" class="truncate text-foreground">{{ $c['name'] }}</bdi>
                                </div>
                                <div role="gridcell" data-slot="table-cell" class="hidden h-row items-center px-4 py-3 sm:flex">
                                    @if (! empty($c['modifiedAt']))
                                        <x-nq::numeric.date-time :value="$c['modifiedAt']" date-style="medium" class="text-muted-foreground" />
                                    @else
                                        <span class="text-muted-foreground">-</span>
                                    @endif
                                </div>
                                <div role="gridcell" data-slot="table-cell" class="flex h-row items-center justify-end px-4 py-3 text-end tabular-nums">
                                    @if ($c['isFolder'])
                                        <span class="text-muted-foreground">{{ $items($c['count']) }}</span>
                                    @elseif (isset($c['size']))
                                        <span class="text-muted-foreground"><bdi dir="ltr">{{ $fileSize($c['size']) }}</bdi></span>
                                    @else
                                        -
                                    @endif
                                </div>
                            </x-nq::file-explorer.entry>
                        @endforeach
                    </div>
                </div>

                <div data-slot="file-explorer-grid" role="list" aria-label="{{ $t['gridLabel'] }}" x-show="showGrid()" @if ($view !== 'grid' || $here === 0) style="display: none" @endif
                    class="m-0 grid grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
                    @foreach ($flat as $c)
                        <x-nq::file-explorer.entry role="listitem" :id="$c['id']" :folder="$c['isFolder']" :selectable="false"
                            :menu="$contextMenu && (($canDownload && ! $c['isFolder']) || $canDelete)" :hidden="! $inOpen($c['id'])"
                            :can-download="$canDownload" :can-delete="$canDelete" :download-label="$t['download']" :delete-label="$t['remove']"
                            class="flex w-full flex-col items-stretch gap-2 rounded-card border border-border bg-card p-2 text-start hover:bg-nq-hover data-[selected]:border-nq-accent data-[selected]:bg-nq-selected">
                            <span class="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-control bg-secondary">
                                @if ($c['fk'] === 'image' && ! empty($c['previewUrl']))
                                    <img src="{{ $c['previewUrl'] }}" alt="" loading="lazy" class="size-full object-cover" />
                                @else
                                    <x-dynamic-component :component="'lucide-'.$icons[$c['fk']]" aria-hidden="true" class="{{ $c['isFolder'] ? 'text-nq-accent-text' : 'text-muted-foreground' }} size-10 shrink-0" />
                                @endif
                            </span>
                            <span class="flex min-w-0 flex-col">
                                <bdi dir="auto" class="truncate text-body-sm text-foreground">{{ $c['name'] }}</bdi>
                                <span class="truncate text-caption text-muted-foreground">
                                    @if ($c['isFolder']){{ $items($c['count']) }}@elseif (isset($c['size']))<bdi dir="ltr">{{ $fileSize($c['size']) }}</bdi>@else{{ $t['kinds'][$c['fk']] }}@endif
                                </span>
                            </span>
                        </x-nq::file-explorer.entry>
                    @endforeach
                </div>
            @endif
        </div>
        <p class="text-caption text-muted-foreground" x-text="countText()">{{ $items($here) }}</p>
    </div>

    <aside aria-label="{{ $t['preview'] }}" class="min-w-0 rounded-card border border-border bg-card p-3 max-xl:col-span-full lg:max-xl:col-start-2">
        <p x-show="! pickedId" @if ($picked) style="display: none" @endif class="px-2 py-6 text-center text-body-sm text-muted-foreground">{{ $t['previewNone'] }}</p>
        @foreach ($flat as $c)
            @continue($c['isFolder'])
            <div data-slot="file-preview" data-node-id="{{ $c['id'] }}" x-show="isPicked({!! $j($c['id']) !!})" @if ($picked !== $c['id']) style="display: none" @endif class="flex flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                    <bdi dir="auto" class="min-w-0 break-words text-label text-foreground">{{ $c['name'] }}</bdi>
                    <button type="button" aria-label="{{ $t['closePreview'] }}" x-on:click="pick(null)" class="{{ $iconBtn }}"><x-lucide-x aria-hidden="true" /></button>
                </div>
                <div class="flex min-h-32 items-center justify-center overflow-hidden rounded-control bg-secondary">
                    @if ($c['fk'] === 'image' && ! empty($c['previewUrl']))
                        <img src="{{ $c['previewUrl'] }}" alt="{{ $c['name'] }}" class="max-h-64 w-full object-contain" />
                    @elseif (isset($c['previewText']))
                        <x-nq::code-block :code="$c['previewText']" :language="$ext((string) $c['name']) ?: 'text'" :filename="$c['name']" class="w-full" pre-class="max-h-64" />
                    @else
                        <div class="flex flex-col items-center gap-2 p-6 text-center">
                            <x-dynamic-component :component="'lucide-'.$icons[$c['fk']]" aria-hidden="true" class="size-10 shrink-0 text-muted-foreground" />
                            <span class="text-caption text-muted-foreground">{{ $t['noPreview'] }}</span>
                        </div>
                    @endif
                </div>
                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-body-sm">
                    <dt class="text-muted-foreground">{{ $t['type'] }}</dt>
                    <dd>{{ $t['kinds'][$c['fk']] }}</dd>
                    @if (isset($c['size']))
                        <dt class="text-muted-foreground">{{ $t['size'] }}</dt>
                        <dd><bdi dir="ltr">{{ $fileSize($c['size']) }}</bdi></dd>
                    @endif
                    @if (! empty($c['modifiedAt']))
                        <dt class="text-muted-foreground">{{ $t['modified'] }}</dt>
                        <dd><x-nq::numeric.date-time :value="$c['modifiedAt']" date-style="medium" time-style="short" /></dd>
                    @endif
                    <dt class="text-muted-foreground">{{ $t['location'] }}</dt>
                    <dd class="min-w-0 break-words"><bdi dir="auto">{{ $location($c) }}</bdi></dd>
                </dl>
                @if ($canDownload || $canDelete)
                    <div class="flex flex-wrap gap-2">
                        @if ($canDownload)
                            <x-nq::button size="sm" x-on:click="download({!! $j($c['id']) !!})"><x-lucide-download aria-hidden="true" />{{ $t['download'] }}</x-nq::button>
                        @endif
                        @if ($canDelete)
                            <x-nq::button size="sm" variant="ghost" class="text-nq-danger-text" x-on:click="askDelete({!! $j($c['id']) !!})"><x-lucide-trash-2 aria-hidden="true" />{{ $t['remove'] }}</x-nq::button>
                        @endif
                    </div>
                @endif
            </div>
        @endforeach
    </aside>

    @if ($canCreateFolder)
        <x-nq::dialog x-model="newOpen">
            <x-nq::dialog.content>
                <form class="grid gap-4" novalidate x-on:submit.prevent="submitNew()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $t['folderTitle'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['folderBody'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field x-model="newInvalid">
                        <x-nq::field.label>{{ $t['folderName'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="newName" x-on:input="syncNew()" x-on:blur="touchNew()" autocomplete="off" />
                        <x-nq::field.error><span x-text="newText"></span></x-nq::field.error>
                    </x-nq::field>
                    <div x-show="newFail" style="display: none" data-slot="file-explorer-new-error">
                        <x-nq::alert tone="danger" role="alert"><span x-text="newFail"></span></x-nq::alert>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::dialog.close variant="ghost">{{ $t['cancel'] }}</x-nq::dialog.close>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="newBusy ? 'true' : null">{{ $t['create'] }}</x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canDelete)
        <x-nq::alert-dialog x-model="delOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><bdi dir="auto" x-text="delTitle"></bdi></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description><span x-text="delBody"></span></x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action variant="danger" x-on:click="confirmDelete()">{{ $t['deleteConfirm'] }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</section>
