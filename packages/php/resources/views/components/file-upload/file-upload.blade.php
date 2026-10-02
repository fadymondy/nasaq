{{-- <x-nq::file-upload accept="image/*,.pdf" :max-size="5242880" :max-files="4" @files="$event.detail.added.forEach((f) => send(f, $event.detail.controls))" />
     Dropzone plus file list. Nasaq sends nothing: the bubbling "files" event carries { added, controls } (status "pending");
     start the upload and report progress with controls.update(id, { status: 'uploading', progress: 40 }).
     Other events: "retry" ({ item, controls }), "remove" ({ item }), "reject" ({ rejections }). The slot replaces the prompt.
     accept (native syntax), max-size (bytes), max-files, multiple (default true), disabled, name (names the file input).
     items is x-modelable. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['accept' => null, 'maxSize' => null, 'maxFiles' => null, 'multiple' => true, 'disabled' => false, 'name' => null])
@php
    $options = array_filter([
        'accept' => $accept,
        'maxSize' => $maxSize,
        'maxFiles' => $maxFiles,
        'multiple' => $multiple ? null : false,
        'disabled' => $disabled ?: null,
    ], fn ($v) => $v !== null);
    $fileList = \Nasaq\Nasaq::t('Files', 'الملفات');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'file-upload') }}" x-data="nqFileUpload({{ \Illuminate\Support\Js::from((object) $options)->toHtml() }})" x-modelable="items" x-id="['nq-upload']"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <x-nq::file-upload.dropzone :name="$name">{{ $slot }}</x-nq::file-upload.dropzone>
    <ul x-show="rejections.length" x-cloak style="display: none" data-slot="file-upload-errors" role="alert" class="flex flex-col gap-1 text-caption text-nq-danger-text">
        <template x-for="(r, i) in rejections" :key="r.file.name + '-' + i"><li x-text="r.message"></li></template>
    </ul>
    <ul x-show="items.length" x-cloak style="display: none" data-slot="file-list" aria-label="{{ $fileList }}" class="flex flex-col gap-2">
        <template x-for="item in items" :key="item.id">
            <li data-slot="file-list-item" :data-status="item.status" class="flex flex-col gap-2 rounded-control border border-border bg-card p-3 data-[status=error]:border-nq-danger">
                <div class="flex items-center gap-3">
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-control bg-nq-surface-soft text-muted-foreground">
                        <span x-show="item.status === 'error'" aria-hidden="true" class="flex text-nq-danger-text [&_svg]:size-4"><x-lucide-circle-alert /></span>
                        <span x-show="item.status !== 'error' && item.file.type.startsWith('image/')" aria-hidden="true" class="flex [&_svg]:size-4"><x-lucide-image /></span>
                        <span x-show="item.status !== 'error' && !item.file.type.startsWith('image/')" aria-hidden="true" class="flex [&_svg]:size-4"><x-lucide-file /></span>
                    </span>
                    <div class="flex min-w-0 flex-1 flex-col">
                        <bdi data-slot="file-list-name" class="truncate text-label text-foreground" :title="item.file.name" x-text="item.file.name"></bdi>
                        <span class="text-caption text-muted-foreground tabular-nums" x-text="fileSize(item.file.size) + ' · ' + statusText(item)"></span>
                    </div>
                    <x-nq::button x-show="item.status === 'error'" type="button" variant="ghost" size="icon-sm" ::aria-label="$nq.t('Retry ' + item.file.name, 'إعادة محاولة ' + item.file.name)" x-on:click="retry(item)"><x-lucide-rotate-cw aria-hidden="true" /></x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" ::aria-label="$nq.t('Remove ' + item.file.name, 'إزالة ' + item.file.name)" x-on:click="removeItem(item)"><x-lucide-x aria-hidden="true" /></x-nq::button>
                </div>
                <div x-show="item.status === 'uploading' || item.status === 'pending'" data-slot="progress" data-tone="default" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                    :aria-valuenow="item.status === 'pending' ? 0 : (item.progress ?? undefined)" :aria-valuetext="item.progress === null && item.status !== 'pending' ? 'indeterminate progress' : percent(item) + '%'"
                    :aria-label="item.file.name + ' · ' + statusText(item)" :data-indeterminate="item.progress === null && item.status !== 'pending' ? '' : undefined"
                    class="flex w-full flex-col gap-1.5">
                    <div data-slot="progress-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                        <div data-slot="progress-indicator" :style="item.progress === null && item.status !== 'pending' ? 'inset-inline-start:0' : 'inset-inline-start:0;width:' + percent(item) + '%'"
                            :class="item.progress === null && item.status !== 'pending' ? 'w-full motion-safe:animate-pulse' : ''"
                            class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                    </div>
                </div>
                <p x-show="item.status === 'error' && item.error" x-text="item.error" class="text-caption text-nq-danger-text"></p>
            </li>
        </template>
    </ul>
</div>
