{{-- <x-nq::desktop-locations :locations="$locations" can-browse @nq-location-add="$event.detail.waitUntil(…)" @nq-location-remove="$event.detail.waitUntil(…)" />
     The folders a desktop app may touch (workspace roots): each with its path, status and per-folder permissions (read, write, search
     index), plus add, remove, make default and re-index. It has no filesystem access: it fires events on the root with
     detail.waitUntil(promise) and your handler talks to the desktop bridge. Resolve { error: '…' } (or reject) to show a message.
       nq-location-add          detail { path, permissions: { read, write, index } }   resolve, or { error } to keep the dialog open
       nq-location-remove       detail { id }                                          (asked first in a dialog)
       nq-location-permissions  detail { id, permissions }                             on { error } the switches go back
       nq-location-default      detail { id }       nq-location-reindex  detail { id }
       nq-location-browse       resolve the picked path, or null when cancelled (the desktop bridge's folder picker)
     locations: [['id', 'path', 'label', 'status' => ready|indexing|missing|not-directory|denied, 'permissions' => ['read', 'write', 'index'],
     'primary', 'fileCount', 'indexedAt']]. can-add / can-remove / can-permissions / can-make-default / can-reindex (all true) and can-browse
     (false) show those controls. loading shows the skeleton. title / description replace the built-in text.
     After a change re-render the list. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['locations' => [], 'loading' => false, 'title' => null, 'description' => null, 'canAdd' => true, 'canRemove' => true, 'canPermissions' => true, 'canMakeDefault' => true, 'canReindex' => true, 'canBrowse' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $title ??= $t::t('Locations on this computer', 'المواقع على هذا الجهاز');
    $description ??= $t::t('Folders the desktop app can read and change for you. It cannot open anything outside them.', 'المجلدات التي يستطيع تطبيق سطح المكتب قراءتها وتعديلها نيابةً عنك. ولا يستطيع فتح أي شيء خارجها.');
    $locations = array_values(is_array($locations) ? $locations : (array) $locations);
    $uid = 'nq-locations-'.\Illuminate\Support\Str::random(6);
    $base = function (string $path): string {
        $p = trim($path);
        $parts = array_values(array_filter(preg_split('/[\\\\\/]/', $p), fn ($s) => $s !== ''));
        return $parts === [] ? $p : end($parts);
    };
    $plural = function (int $n, string $one, string $two, string $few, string $many, string $enOne, string $enMany) use ($ar) {
        if (! $ar) return $n === 1 ? $enOne : str_replace('{n}', number_format($n), $enMany);
        return $n === 1 ? $one : ($n === 2 ? $two : str_replace('{n}', (string) $n, $n >= 3 && $n <= 10 ? $few : $many));
    };
    $files = fn (int $n) => $plural($n, 'ملف واحد', 'ملفان', '{n} ملفات', '{n} ملفًا', '1 file', '{n} files');
    $count = fn (int $n) => $plural($n, 'مجلد واحد', 'مجلدان', '{n} مجلدات', '{n} مجلدًا', '1 folder', '{n} folders');
    $statusLabels = [
        'ready' => $t::t('Ready', 'جاهز'), 'indexing' => $t::t('Indexing', 'جارٍ الفهرسة'), 'missing' => $t::t('Folder not found', 'المجلد غير موجود'),
        'not-directory' => $t::t('Not a folder', 'ليس مجلدًا'), 'denied' => $t::t('Access denied by the system', 'رفض النظام الوصول'),
    ];
    $tones = ['ready' => 'success', 'indexing' => 'info', 'missing' => 'danger', 'not-directory' => 'danger', 'denied' => 'warning'];
    $toggles = [
        'read' => [$t::t('Read', 'قراءة'), $t::t('List and open files', 'عرض الملفات وفتحها')],
        'write' => [$t::t('Write', 'كتابة'), $t::t('Create and change files', 'إنشاء الملفات وتعديلها')],
        'index' => [$t::t('Search index', 'فهرس البحث'), $t::t('Include in local search', 'تضمينه في البحث المحلي')],
    ];
    $newOff = ['read' => 'null', 'write' => "!perms.read ? '' : null", 'index' => "!perms.read ? '' : null"];
    $hasDefault = collect($locations)->contains(fn ($l) => ! empty($l['primary']));
    $config = [
        'paths' => array_map(fn ($l) => $l['path'], $locations),
        'labels' => [
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'problemEmpty' => $t::t('Enter the folder path.', 'أدخل مسار المجلد.'),
            'problemRelative' => $t::t('Use a full path that starts at a drive, a share or the root.', 'استخدم مسارًا كاملًا يبدأ من قرص أو مشاركة أو الجذر.'),
            'problemDuplicate' => $t::t('This folder is already on the list.', 'هذا المجلد موجود في القائمة بالفعل.'),
            'warnInside' => $t::t('Already covered by {other}.', 'مشمول بالفعل ضمن {other}.'),
            'warnContains' => $t::t('Includes {other}, which is already on the list.', 'يشمل {other} وهو موجود في القائمة بالفعل.'),
            'removeTitle' => $t::t('Remove {name}?', 'إزالة {name}؟'),
        ],
    ];
@endphp
<section data-slot="desktop-locations" aria-label="{{ $title }}" x-data="nqDesktopLocations(@js($config))" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            <h3 class="text-h3 text-foreground">{{ $title }}</h3>
            <p class="max-w-prose text-body-sm text-muted-foreground">{{ $description }}</p>
        </div>
        @if ($canAdd)
            <x-nq::button type="button" size="sm" variant="primary" x-on:click="openAdd()">
                <x-lucide-folder-plus aria-hidden="true" />
                {{ $t::t('Add folder', 'إضافة مجلد') }}
            </x-nq::button>
        @endif
    </header>

    <template x-if="pageError">
        <x-nq::alert tone="danger" role="alert" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
    </template>

    @if ($loading)
        <x-nq::states.loading :label="$t::t('Loading locations', 'جارٍ تحميل المواقع')" :rows="3" />
    @elseif (count($locations) === 0)
        <x-nq::states.empty icon="folder-search" :title="$t::t('No folders yet', 'لا توجد مجلدات بعد')" :description="$t::t('Add the folders you work in. Until you do, the desktop app cannot read or write any files.', 'أضف المجلدات التي تعمل فيها. وإلى أن تفعل، لا يستطيع تطبيق سطح المكتب قراءة أو كتابة أي ملف.')">
            @if ($canAdd)
                <x-slot:actions>
                    <x-nq::button type="button" variant="primary" x-on:click="openAdd()">
                        <x-lucide-folder-plus aria-hidden="true" />
                        {{ $t::t('Add folder', 'إضافة مجلد') }}
                    </x-nq::button>
                </x-slot:actions>
            @endif
        </x-nq::states.empty>
    @else
        <ul aria-label="{{ $t::t('Locations', 'المواقع') }}" class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
            @foreach ($locations as $l)
                @php
                    $status = $l['status'] ?? 'ready';
                    $perms = ['read' => (bool) ($l['permissions']['read'] ?? false), 'write' => (bool) ($l['permissions']['write'] ?? false), 'index' => (bool) ($l['permissions']['index'] ?? false)];
                    $name = isset($l['label']) && trim($l['label']) !== '' ? trim($l['label']) : $base($l['path']);
                    $usable = $status === 'ready' || $status === 'indexing';
                    $broken = $status === 'missing' || $status === 'not-directory';
                    $rid = $uid.'-'.$loop->index;
                    $rowConfig = ['id' => (string) $l['id'], 'locked' => ! $usable || ! $canPermissions, 'permissions' => $perms];
                @endphp
                <li data-slot="desktop-location" data-status="{{ $status }}" x-data="nqDesktopLocationRow(@js($rowConfig))" class="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <div class="flex flex-wrap items-start gap-3">
                        <span class="{{ \Nasaq\Cn::merge('mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4.5', $broken ? 'text-nq-danger-text' : 'text-muted-foreground') }}">
                            @if ($broken)<x-lucide-folder-x aria-hidden="true" />@else<x-lucide-folder-open aria-hidden="true" />@endif
                        </span>
                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            <div class="flex min-w-0 flex-wrap items-center gap-2">
                                <bdi dir="auto" class="truncate text-label text-foreground">{{ $name }}</bdi>
                                @if (! empty($l['primary']))
                                    <x-nq::badge variant="accent"><x-lucide-star aria-hidden="true" />{{ $t::t('Default', 'الافتراضي') }}</x-nq::badge>
                                @endif
                                <x-nq::status :tone="$tones[$status] ?? 'neutral'">{{ $statusLabels[$status] ?? $status }}</x-nq::status>
                            </div>
                            <bdi dir="ltr" title="{{ $l['path'] }}" class="block break-all font-mono text-code text-muted-foreground">{{ $l['path'] }}</bdi>
                            @if ($usable)
                                <span class="text-caption text-muted-foreground">
                                    @if (isset($l['fileCount']))<bdi>{{ $files((int) $l['fileCount']) }}</bdi>{{ ! $perms['index'] || ! empty($l['indexedAt']) ? ' · ' : '' }}@endif
                                    @if ($perms['index'] && ! empty($l['indexedAt'])){{ $t::t('Indexed', 'آخر فهرسة') }} <x-nq::numeric.date-time :value="$l['indexedAt']" relative />
                                    @elseif (! $perms['index']){{ $t::t('Not indexed', 'غير مفهرس') }}@endif
                                </span>
                            @endif
                        </div>
                        <div class="flex shrink-0 items-center gap-0.5">
                            @if ($canMakeDefault && empty($l['primary']) && $usable)
                                @php $label = $t::t("Make {$name} the default", "جعل {$name} الافتراضي"); @endphp
                                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $label }}" title="{{ $label }}"
                                    x-bind:disabled="busyId === id ? '' : null" x-on:click="run(id, 'nq-location-default', { id })">
                                    <x-lucide-star aria-hidden="true" />
                                </x-nq::button>
                            @endif
                            @if ($canReindex && $usable && $perms['index'])
                                @php $label = $t::t("Re-index {$name}", "إعادة فهرسة {$name}"); $reBind = $status === 'indexing' ? "''" : "busyId === id ? '' : null"; @endphp
                                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $label }}" title="{{ $label }}"
                                    x-bind:disabled="{!! $reBind !!}" x-on:click="run(id, 'nq-location-reindex', { id })">
                                    <x-lucide-refresh-cw aria-hidden="true" class="{{ $status === 'indexing' ? 'motion-safe:animate-spin' : '' }}" />
                                </x-nq::button>
                            @endif
                            @if ($canRemove)
                                @php $label = $t::t("Remove {$name}", "إزالة {$name}"); @endphp
                                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $label }}" title="{{ $label }}" class="text-nq-danger-text"
                                    x-bind:disabled="busyId === id ? '' : null" data-name="{{ $name }}" data-path="{{ $l['path'] }}" x-on:click="askRemove(id, $el.dataset.name, $el.dataset.path)">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                </x-nq::button>
                            @endif
                        </div>
                    </div>
                    <div role="group" aria-label="{{ $t::t('Permissions', 'الصلاحيات') }}: {{ $name }}" class="grid gap-2 sm:grid-cols-3">
                        @foreach ($toggles as $key => [$tLabel, $tHint])
                            @php $offExpr = "off('".$key."') ? '' : null"; @endphp
                            <div class="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2">
                                <label for="{{ $rid }}-{{ $key }}" class="flex min-w-0 flex-col">
                                    <span class="text-body-sm text-foreground">{{ $tLabel }}</span>
                                    <span class="truncate text-caption text-muted-foreground">{{ $tHint }}</span>
                                </label>
                                <x-nq::switch id="{{ $rid }}-{{ $key }}" :checked="$perms[$key]" x-model="p.{{ $key }}"
                                    x-bind:disabled="{!! $offExpr !!}" x-bind:data-disabled="{!! $offExpr !!}" />
                            </div>
                        @endforeach
                    </div>
                </li>
            @endforeach
        </ul>
        <p class="text-caption text-muted-foreground">{{ $count(count($locations)) }}{{ $hasDefault || $canMakeDefault ? ' · '.$t::t('Relative paths resolve against the default folder.', 'تُحسم المسارات النسبية بالنسبة إلى المجلد الافتراضي.') : '' }}</p>
    @endif

    @if ($canAdd)
        <x-nq::dialog x-model="addOpen">
            <x-nq::dialog.content>
                <form novalidate data-slot="desktop-location-add" class="grid gap-4" x-effect="validate()" x-on:submit.prevent="submitAdd()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $t::t('Add a folder', 'إضافة مجلد') }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t::t('Choose a folder on this computer. The desktop app gets access to it and everything inside.', 'اختر مجلدًا على هذا الجهاز. سيحصل تطبيق سطح المكتب على صلاحية الوصول إليه وإلى كل ما بداخله.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field x-model="pathInvalid">
                        <x-nq::field.label>{{ $t::t('Folder path', 'مسار المجلد') }}</x-nq::field.label>
                        <div class="flex gap-2">
                            <x-nq::field.input x-model="path" ltr autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="C:\Users\you\projects\app"
                                class="min-w-0 flex-1 font-mono text-code" x-on:blur="touched = true" />
                            @if ($canBrowse)
                                <x-nq::button type="button" x-bind:aria-busy="browsing ? 'true' : null" x-bind:data-disabled="browsing ? '' : null" x-on:click="browse()">
                                    <x-nq::spinner x-show="browsing" style="display: none" />
                                    <x-lucide-folder-search aria-hidden="true" x-show="!browsing" />
                                    {{ $t::t('Browse', 'استعراض') }}
                                </x-nq::button>
                            @endif
                        </div>
                        <x-nq::field.error><span x-text="problemText"></span></x-nq::field.error>
                    </x-nq::field>
                    <template x-if="warnText">
                        <x-nq::alert tone="warning"><bdi dir="ltr" class="font-mono" x-text="warnText"></bdi></x-nq::alert>
                    </template>
                    <div role="group" aria-label="{{ $t::t('Permissions', 'الصلاحيات') }}" class="grid gap-2">
                        @foreach ($toggles as $key => [$tLabel, $tHint])
                            <div class="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2">
                                <label for="{{ $uid }}-new-{{ $key }}" class="flex min-w-0 flex-col">
                                    <span class="text-body-sm text-foreground">{{ $tLabel }}</span>
                                    <span class="text-caption text-muted-foreground">{{ $tHint }}</span>
                                </label>
                                <x-nq::switch id="{{ $uid }}-new-{{ $key }}" :checked="$key !== 'write'" x-model="perms.{{ $key }}"
                                    x-bind:disabled="{!! $newOff[$key] !!}" x-bind:data-disabled="{!! $newOff[$key] !!}" />
                            </div>
                        @endforeach
                    </div>
                    <template x-if="formError"><x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert></template>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="addOpen = false" x-bind:disabled="pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="pending ? 'true' : null"
                            x-bind:disabled="touched && problem ? '' : null" x-bind:data-disabled="pending || (touched && problem) ? '' : null">
                            <x-nq::spinner x-show="pending" style="display: none" />
                            {{ $t::t('Add folder', 'إضافة المجلد') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canRemove)
        <x-nq::alert-dialog x-model="removeOpen">
            <x-nq::alert-dialog.content>
                <div data-slot="desktop-location-remove" class="contents">
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title><span x-text="removeTitle()"></span></x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description>{{ $t::t('The desktop app loses access to this folder and its search index is deleted. Your files are not touched.', 'يفقد تطبيق سطح المكتب صلاحية الوصول إلى هذا المجلد ويُحذف فهرس البحث الخاص به. ملفاتك لا تتأثر.') }}</x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <bdi dir="ltr" class="block break-all rounded-control border border-border bg-secondary p-2 font-mono text-code" x-text="removePath"></bdi>
                    <template x-if="removeError"><x-nq::alert tone="danger" role="alert"><span x-text="removeError"></span></x-nq::alert></template>
                    <x-nq::alert-dialog.footer>
                        <x-nq::alert-dialog.cancel x-bind:disabled="removing ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                        <x-nq::button type="button" variant="danger" x-bind:aria-busy="removing ? 'true' : null" x-bind:data-disabled="removing ? '' : null" x-on:click="confirmRemove()">
                            <x-nq::spinner x-show="removing" style="display: none" />
                            {{ $t::t('Remove', 'إزالة') }}
                        </x-nq::button>
                    </x-nq::alert-dialog.footer>
                </div>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</section>
