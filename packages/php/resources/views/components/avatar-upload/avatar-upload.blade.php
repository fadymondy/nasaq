{{-- <x-nq::avatar-upload name="Sara Alharbi" :src="$user->avatar_url" :output-size="256"
         @nq-avatar-change="$event.detail.promise = upload($event.detail.file, $event.detail.onProgress)"
         @nq-avatar-remove="$event.detail.promise = removeAvatar()" />
     A profile photo with change, crop and remove. Pick by clicking, dropping or pasting; position it in a square window with drag, arrow keys
     and a zoom slider; the crop is drawn on a canvas and handed to your listener as a File. Nothing is sent by the component. Needs the Alpine runtime (@nasaqScripts).
     name: alt text and the initials when there is no photo. src: the saved photo. accept (default image/png,image/jpeg,image/webp), max-size (bytes, default 5 MB),
     output-size (px, never upscaled, default 256), output-type (image/webp default | image/png | image/jpeg), quality (0..1), shape: circle (default) | square,
     max-zoom (default 4), disabled, layout: row (default) | stacked, removable (default true: shows the remove button).
     "nq-avatar-change" bubbles with { file, onProgress(percent), promise }: set event.detail.promise to a Promise; reject (or resolve to { error }) to keep the editor open and show the message.
     "nq-avatar-remove" bubbles with { promise } the same way. Without listeners a save succeeds on the spot.
     labels: any key of the English strings below (hint / wrongType / tooLarge use {types} and {max}). --}}
@props(['name' => '', 'src' => null, 'accept' => 'image/png,image/jpeg,image/webp', 'maxSize' => 5 * 1024 * 1024, 'outputSize' => 256, 'outputType' => 'image/webp', 'quality' => 0.9, 'shape' => 'circle', 'maxZoom' => 4, 'disabled' => false, 'layout' => 'row', 'removable' => true, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $strings = [
        'en' => [
            'upload' => 'Upload photo', 'change' => 'Change photo', 'remove' => 'Remove photo', 'hint' => '{types}, up to {max}. You can also drop or paste an image.', 'dropping' => 'Drop to use this photo',
            'adjust' => 'Adjust your photo', 'viewport' => 'Photo position', 'instructions' => 'Drag the photo to move it. Arrow keys move it, plus and minus zoom.', 'zoom' => 'Zoom', 'zoomIn' => 'Zoom in', 'zoomOut' => 'Zoom out',
            'save' => 'Save photo', 'cancel' => 'Cancel', 'uploading' => 'Uploading', 'images' => 'images', 'wrongType' => 'That file type is not supported. Use {types}.', 'tooLarge' => 'That photo is larger than {max}.',
            'unreadable' => 'That image could not be read. Try another one.', 'saveFailed' => 'The photo could not be saved. Try again.', 'removeFailed' => 'The photo could not be removed. Try again.',
            'saved' => 'Photo updated.', 'removed' => 'Photo removed.', 'units' => 'B,KB,MB,GB,TB',
        ],
        'ar' => [
            'upload' => 'رفع صورة', 'change' => 'تغيير الصورة', 'remove' => 'إزالة الصورة', 'hint' => '{types}، بحجم أقصاه {max}. يمكنك أيضًا إفلات صورة أو لصقها.', 'dropping' => 'أفلت لاستخدام هذه الصورة',
            'adjust' => 'اضبط صورتك', 'viewport' => 'موضع الصورة', 'instructions' => 'اسحب الصورة لتحريكها. مفاتيح الأسهم تحركها، وزرّا الزائد والناقص للتكبير والتصغير.', 'zoom' => 'التكبير', 'zoomIn' => 'تكبير', 'zoomOut' => 'تصغير',
            'save' => 'حفظ الصورة', 'cancel' => 'إلغاء', 'uploading' => 'جارٍ الرفع', 'images' => 'صور', 'wrongType' => 'نوع الملف غير مدعوم. استخدم {types}.', 'tooLarge' => 'حجم الصورة أكبر من {max}.',
            'unreadable' => 'تعذّرت قراءة هذه الصورة. جرّب صورة أخرى.', 'saveFailed' => 'تعذّر حفظ الصورة. حاول مرة أخرى.', 'removeFailed' => 'تعذّرت إزالة الصورة. حاول مرة أخرى.',
            'saved' => 'تم تحديث الصورة.', 'removed' => 'تمت إزالة الصورة.', 'units' => 'ب,ك.ب,م.ب,ج.ب,ت.ب',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $options = array_filter([
        'name' => $name, 'src' => $src, 'accept' => $accept, 'maxSize' => (int) $maxSize, 'outputSize' => (int) $outputSize, 'outputType' => $outputType, 'quality' => (float) $quality,
        'maxZoom' => (float) $maxZoom, 'disabled' => $disabled ? true : null, 'locale' => $locale, 'labels' => $t,
    ], fn ($v) => $v !== null);
    $rounded = $shape === 'square' ? 'rounded-floating' : 'rounded-full';
    $words = preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $first = fn (string $w): string => $w === '' ? '' : (function_exists('grapheme_substr') ? (string) grapheme_substr($w, 0, 1) : mb_substr($w, 0, 1));
    $initials = mb_strtoupper(($words ? $first($words[0]) : '').(count($words) > 1 ? $first($words[count($words) - 1]) : ''));
    $stacked = $layout === 'stacked';
    $avatarSize = $stacked ? 'size-32 text-h1 ring-1 ring-border @3xl:size-56 @3xl:text-display' : 'size-20 text-h3';
@endphp
<div data-slot="avatar-upload" x-data="nqAvatarUpload({!! \Illuminate\Support\Js::from((object) $options) !!})"
    x-bind:data-dragging="dragging ? '' : null" x-bind:data-editing="editing ? '' : null"
    x-on:dragenter="dragEnter($event)" x-on:dragover="dragOver($event)" x-on:dragleave="dragLeave()" x-on:drop="drop($event)" x-on:paste="paste($event)"
    {{ $attributes->cn('flex flex-col gap-3') }}>
    {{-- Editor --}}
    <div role="group" aria-label="{{ $t['adjust'] }}" data-slot="avatar-upload-editor" x-show="editing" style="display: none"
        class="flex flex-col gap-4 rounded-floating border border-border bg-card p-4 {{ $stacked ? '' : 'sm:flex-row' }}">
        <div class="flex flex-col items-center gap-2">
            {{-- The window is always left to right: pan and zoom maths are physical. --}}
            <div dir="ltr" role="group" tabindex="0" aria-label="{{ $t['viewport'] }}" aria-describedby="nq-avatar-help" data-slot="avatar-upload-viewport"
                x-on:pointerdown="pointerDown($event)" x-on:pointermove="pointerMove($event)" x-on:pointerup="endDrag()" x-on:pointercancel="endDrag()" x-on:keydown="cropKey($event)"
                class="relative size-56 max-w-full shrink-0 cursor-grab touch-none select-none overflow-hidden rounded-control bg-nq-surface-soft outline-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                <img x-ref="image" alt="" draggable="false" class="pointer-events-none absolute max-w-none" style="visibility: hidden"
                    x-bind:src="sourceUrl" x-bind:style="imageStyle" x-on:load="onImageLoad()" x-on:error="onImageError()">
                <span aria-hidden="true" class="pointer-events-none absolute inset-0 border border-nq-fg/30 {{ $rounded }}" style="box-shadow: 0 0 0 100vmax color-mix(in oklab, var(--nq-fg) 45%, transparent)"></span>
            </div>
            <p id="nq-avatar-help" class="max-w-56 text-center text-caption text-muted-foreground">{{ $t['instructions'] }}</p>
        </div>
        <div class="flex min-w-0 flex-1 flex-col justify-between gap-4">
            <div class="flex items-center gap-2" x-bind:inert="busy !== '' || ! natural ? '' : null" x-bind:class="busy !== '' || ! natural ? 'opacity-50' : ''">
                <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$t['zoomOut']" x-on:click="setZoom(zoom - 0.25)" x-bind:disabled="zoom <= 1 ? '' : null">
                    <x-nq::icon name="zoom-out" aria-hidden="true" />
                </x-nq::button>
                <x-nq::slider x-model="zoom" :aria-label="$t['zoom']" :min="1" :max="$maxZoom" :step="0.01" :value="1" :format="['style' => 'percent', 'maximumFractionDigits' => 0]" />
                <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$t['zoomIn']" x-on:click="setZoom(zoom + 0.25)" x-bind:disabled="zoom >= maxZoom ? '' : null">
                    <x-nq::icon name="zoom-in" aria-hidden="true" />
                </x-nq::button>
            </div>
            <div class="flex flex-col gap-3">
                <div x-show="uploading" role="progressbar" aria-label="{{ $t['uploading'] }}" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="progress" style="display: none"
                    data-slot="progress" class="flex w-full flex-col gap-1.5">
                    <span class="block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft"><span class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none" x-bind:style="'width: ' + progress + '%'"></span></span>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                    <x-nq::button type="button" variant="ghost" x-on:click="reset()" x-bind:disabled="busy !== '' ? '' : null">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-on:click="save()" x-bind:aria-busy="uploading ? 'true' : null" x-bind:disabled="! natural || busy !== '' ? '' : null">
                        <span x-show="uploading" style="display: none"><x-nq::spinner /></span>
                        {{ $t['save'] }}
                    </x-nq::button>
                </div>
            </div>
        </div>
    </div>

    {{-- Idle --}}
    <div data-slot="avatar-upload-idle" x-show="! editing" class="flex gap-4 {{ $stacked ? 'flex-col items-start gap-3' : 'items-center' }}">
        <button type="button" data-slot="avatar-upload-trigger" aria-describedby="nq-avatar-hint" x-on:click="openPicker()"
            x-bind:aria-label="current ? @js($t['change']) : @js($t['upload'])" x-bind:disabled="locked ? '' : null" @if ($disabled) disabled @endif
            class="group relative shrink-0 outline-none {{ $rounded }} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50">
            <span data-slot="avatar" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground {{ $shape === 'square' ? 'rounded-control' : 'rounded-full' }} {{ $avatarSize }}">
                <img data-slot="avatar-image" alt="{{ $name }}" class="size-full object-cover" x-show="current" x-bind:src="current" @if (! $src) style="display: none" @endif>
                <span data-slot="avatar-fallback" class="flex size-full items-center justify-center" x-show="! current" @if ($src) style="display: none" @endif
                    @if ($name !== '') role="img" aria-label="{{ $name }}" @endif>{{ $initials }}</span>
            </span>
            <span aria-hidden="true" x-bind:class="dragging ? 'border-2 border-dashed border-nq-focus opacity-100' : ''"
                class="absolute inset-0 flex items-center justify-center bg-nq-fg/50 text-nq-bg opacity-0 transition-opacity duration-150 ease-nq group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:hidden {{ $rounded }}">
                <x-nq::icon name="camera" class="size-5" />
            </span>
        </button>
        <div class="flex min-w-0 flex-col gap-2">
            <div class="flex flex-wrap gap-2">
                <x-nq::button type="button" size="sm" x-on:click="openPicker()" x-bind:disabled="locked ? '' : null">
                    <x-nq::icon name="upload" aria-hidden="true" />
                    <span x-text="current ? @js($t['change']) : @js($t['upload'])">{{ $src ? $t['change'] : $t['upload'] }}</span>
                </x-nq::button>
                @if ($removable)
                    <x-nq::button type="button" size="sm" variant="ghost" x-show="current" x-on:click="removePhoto()" x-bind:aria-busy="busy === 'removing' ? 'true' : null"
                        x-bind:disabled="disabled || busy === 'saving' || busy === 'removing' ? '' : null" :style="$src ? null : 'display: none'">
                        <span x-show="busy === 'removing'" style="display: none"><x-nq::spinner /></span>
                        <x-nq::icon name="trash-2" aria-hidden="true" />
                        {{ $t['remove'] }}
                    </x-nq::button>
                @endif
            </div>
            <p id="nq-avatar-hint" class="text-caption text-muted-foreground" x-text="hintText"></p>
        </div>
    </div>

    <p role="alert" data-slot="avatar-upload-error" x-show="error" x-text="error" class="text-caption text-nq-danger-text" style="display: none"></p>
    <span role="status" class="sr-only" x-text="status"></span>
    <input x-ref="input" type="file" class="sr-only" tabindex="-1" aria-hidden="true" accept="{{ $accept }}" x-bind:disabled="locked ? '' : null"
        x-on:click.stop x-on:change="onInput($event)" @if ($disabled) disabled @endif>
</div>
