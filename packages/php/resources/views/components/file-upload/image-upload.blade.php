{{-- <x-nq::file-upload.image-upload src="/avatars/me.png" alt="Profile picture" @change="upload($event.detail.file)" />
     A single image with a thumbnail preview (an object URL), replace and remove. src: an already-saved image shown until a file is chosen.
     accept (default image/*), max-size (bytes), alt, disabled, name. The chosen File is x-modelable ("file"); events "change" ({ file }) and "remove".
     While you upload, set `progress` (0 to 100) on the component data, e.g. $data.progress = 40; leave it undefined to hide the bar.
     The slot replaces the dropzone prompt. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['src' => null, 'accept' => 'image/*', 'maxSize' => null, 'alt' => '', 'disabled' => false, 'name' => null])
@php
    $options = array_filter(['src' => $src, 'accept' => $accept, 'maxSize' => $maxSize, 'disabled' => $disabled ?: null], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'image-upload') }}" x-data="nqImageUpload({{ \Illuminate\Support\Js::from((object) $options)->toHtml() }})" x-modelable="file" x-id="['nq-upload']"
    {{ $attributes->except('data-slot')->cn('flex flex-col items-start gap-2') }}>
    <div x-show="preview()" x-cloak style="display: none" data-slot="image-upload-preview" class="relative size-32 overflow-hidden rounded-floating border border-border bg-nq-surface-soft">
        <img :src="preview()" alt="{{ $alt }}" class="size-full object-cover">
        <div x-show="showProgress()" x-cloak style="display: none" class="absolute inset-x-0 bottom-0 bg-card/80 p-2">
            <div data-slot="progress" data-tone="default" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="progress ?? undefined"
                :aria-label="file ? file.name : @js($alt ?: \Nasaq\Nasaq::t('Uploading', 'جارٍ الرفع'))" class="flex w-full flex-col gap-1.5">
                <div data-slot="progress-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                    <div data-slot="progress-indicator" :style="'inset-inline-start:0;width:' + (progress ?? 0) + '%'" class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                </div>
            </div>
        </div>
        <x-nq::button type="button" size="icon-sm" variant="secondary" ::disabled="disabled" aria-label="{{ \Nasaq\Nasaq::t('Remove image', 'إزالة الصورة') }}" class="absolute end-1 top-1" x-on:click="removeImage()"><x-lucide-x aria-hidden="true" /></x-nq::button>
    </div>
    <x-nq::file-upload.dropzone :name="$name" :compact="true" ::class="preview() ? 'w-32' : 'size-32'">
        @if ($slot->isEmpty())
            <span x-text="preview() ? $nq.t('Replace image', 'استبدال الصورة') : $nq.t('Add an image', 'أضف صورة')">{{ \Nasaq\Nasaq::t('Add an image', 'أضف صورة') }}</span>
        @else
            {{ $slot }}
        @endif
    </x-nq::file-upload.dropzone>
    <p x-show="rejections.length" x-cloak style="display: none" role="alert" class="text-caption text-nq-danger-text" x-text="rejections[0] ? rejections[0].message : ''"></p>
</div>
