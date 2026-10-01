{{-- Internal: the capture form shared by the dialog and the panel. Use <x-nq::quick-capture>. --}}
@props(['dialog' => true, 'page' => null, 'destinations' => [], 'suggestedTags' => [], 'placeholder' => null, 'showHints' => true])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $clip = ! empty($page);
    $destinations = array_values((array) $destinations);
    $pill = 'outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus';
    $on = 'border-transparent bg-nq-selected text-foreground';
    $off = 'border-border text-muted-foreground hover:bg-nq-hover hover:text-foreground';
    $titleClass = 'flex items-center gap-2 text-h4 font-semibold';
    $descClass = 'text-body-sm text-muted-foreground';
    $heading = $clip ? $t('Save this page', 'احفظ هذه الصفحة') : $t('Quick capture', 'التقاط سريع');
    $sub = $clip ? $t('Add a note, then save the page to your inbox.', 'أضف ملاحظة ثم احفظ الصفحة في صندوقك.') : $t('Jot it down now, sort it later.', 'دوّنها الآن ورتّبها لاحقًا.');
    $hold = $placeholder ?? ($clip ? $t('Add a note (optional)', 'أضف ملاحظة (اختياري)') : $t('What is on your mind? Use #tags to file it.', 'ما الذي يدور في ذهنك؟ استخدم #وسوم لتصنيفها.'));
    $areaLabel = $clip ? $t('Add a note (optional)', 'أضف ملاحظة (اختياري)') : $t('Quick capture', 'التقاط سريع');
@endphp
<div x-bind="form" class="flex min-w-0 flex-col gap-4">
    <div class="flex flex-col gap-1">
        @if ($dialog)
            <h2 data-slot="dialog-title" :id="$id('nq-qc', 'title')" class="{{ \Nasaq\Cn::merge('text-h3 text-foreground', $titleClass) }}">
                <x-nq::icon :name="$clip ? 'globe' : 'zap'" class="size-4 text-muted-foreground" />{{ $heading }}
            </h2>
            <p data-slot="dialog-description" :id="$id('nq-qc', 'description')" class="{{ \Nasaq\Cn::merge('text-body-sm text-muted-foreground', $descClass) }}">{{ $sub }}</p>
        @else
            <p class="{{ $titleClass }}"><x-nq::icon :name="$clip ? 'globe' : 'zap'" class="size-4 text-muted-foreground" />{{ $heading }}</p>
            <p class="{{ $descClass }}">{{ $sub }}</p>
        @endif
    </div>

    @if ($clip)
        <div data-slot="quick-capture-page" class="flex min-w-0 flex-col gap-1 rounded-card border border-border bg-nq-surface-2 p-3">
            <span class="eyebrow">{{ $t('Page', 'الصفحة') }}</span>
            @if (! empty($page['title']))<span dir="auto" class="truncate text-body font-medium">{{ $page['title'] }}</span>@endif
            <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ $page['url'] ?? '' }}</bdi>
            @if (! empty($page['selection']))<blockquote dir="auto" class="mt-1 line-clamp-3 border-s-2 border-border ps-3 text-body-sm text-muted-foreground">{{ $page['selection'] }}</blockquote>@endif
        </div>
    @endif

    <div class="flex flex-col gap-1.5">
        <x-nq::field.textarea x-ref="area" x-model="text" autofocus rows="{{ $clip ? 3 : 5 }}" dir="auto" x-on:input="edited()" ::readonly="pending"
            placeholder="{{ $hold }}" aria-label="{{ $areaLabel }}"
            ::aria-invalid="error ? 'true' : null" ::aria-describedby="error ? $id('nq-qc', 'error') : null" class="min-h-0 resize-none" />
        <p x-show="error" x-cloak style="display: none" :id="$id('nq-qc', 'error')" role="alert" x-text="error" class="text-caption text-nq-danger-text"></p>
    </div>

    <div x-show="typedTags.length || offeredTags.length" @if (empty($suggestedTags)) x-cloak style="display: none" @endif class="flex flex-wrap items-center gap-1.5" role="group" aria-label="{{ $t('Tags', 'الوسوم') }}">
        <x-nq::icon name="hash" class="size-3.5 text-muted-foreground" />
        <template x-for="tag in typedTags" :key="'typed-' + tag"><x-nq::badge variant="tag"><bdi x-text="'#' + tag"></bdi></x-nq::badge></template>
        <template x-for="tag in offeredTags" :key="tag">
            <button type="button" :aria-pressed="picked.includes(tag)" x-on:click="toggleTag(tag)"
                :class="picked.includes(tag) ? @js($on) : @js($off)"
                class="inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-caption {{ $pill }}">
                <x-lucide-check x-show="picked.includes(tag)" x-cloak style="display: none" aria-hidden="true" class="size-3" />
                <bdi x-text="'#' + tag"></bdi>
            </button>
        </template>
    </div>

    @if (count($destinations) > 1)
        <div class="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="{{ $t('Save to', 'الحفظ في') }}">
            <span class="text-caption text-muted-foreground">{{ $t('Save to', 'الحفظ في') }}</span>
            @foreach ($destinations as $i => $d)
                <button type="button" role="radio" data-destination="{{ $d['id'] }}" x-on:click="destination = @js($d['id'])"
                    aria-checked="{{ $i === 0 ? 'true' : 'false' }}" :aria-checked="destination === @js($d['id'])"
                    :class="destination === @js($d['id']) ? @js($on) : @js($off)"
                    class="inline-flex h-control-sm items-center gap-1.5 rounded-control border px-2.5 text-body-sm {{ $pill }}">
                    <x-nq::icon name="notebook-pen" class="size-3.5" />{{ $d['label'] ?? $d['id'] }}
                </button>
            @endforeach
        </div>
    @endif

    <p role="status" x-text="saved ?? ''" :class="saved ? '' : 'sr-only'" class="text-caption text-nq-success-text sr-only"></p>

    <div class="flex flex-wrap items-center gap-2 {{ $dialog ? '' : 'justify-between' }}">
        @if ($showHints)
            <p class="me-auto flex flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground" dir="ltr">
                <span class="inline-flex items-center gap-0.5"><x-nq::text.kbd x-text="modKey">Ctrl</x-nq::text.kbd><x-nq::text.kbd>Enter</x-nq::text.kbd></span>
                <span>{{ $t('to save', 'للحفظ') }}</span>
                <span aria-hidden="true">·</span>
                <x-nq::text.kbd>Esc</x-nq::text.kbd>
                <span>{{ $t('to close', 'للإغلاق') }}</span>
                <template x-if="hintKeys.length">
                    <span class="inline-flex items-center gap-1.5"><span aria-hidden="true">·</span>
                        <span class="inline-flex items-center gap-0.5" title="{{ $t('Opens from anywhere with', 'يُفتح من أي مكان بـ') }}">
                            <template x-for="k in hintKeys" :key="k"><x-nq::text.kbd x-text="k"></x-nq::text.kbd></template>
                        </span>
                    </span>
                </template>
            </p>
        @endif
        <div class="flex gap-2 {{ $dialog ? '' : 'ms-auto' }}">
            <x-nq::button variant="ghost" x-on:click="cancel()" ::disabled="pending">{{ $t('Cancel', 'إلغاء') }}</x-nq::button>
            <x-nq::button variant="primary" x-on:click="save()" ::disabled="!canSave" ::aria-busy="pending ? 'true' : null" ::data-disabled="(pending || !canSave) ? '' : null">
                <x-nq::spinner x-show="pending" x-cloak style="display: none" />
                <span x-text="pending ? @js($t('Saving', 'جارٍ الحفظ')) : @js($t('Save', 'حفظ'))">{{ $t('Save', 'حفظ') }}</span>
            </x-nq::button>
        </div>
    </div>
</div>
