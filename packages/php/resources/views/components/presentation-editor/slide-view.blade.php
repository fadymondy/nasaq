{{-- <x-nq::presentation-editor.slide-view expr="slide" editable />
     One 16:9 slide drawn with container-relative units: a thumbnail, the editing canvas or the player stage.
     expr: a JS expression for the slide object in the surrounding nqPresentation scope ("slide", "s", "upNext()", "playerSlide()").
     editable: the text fields become textareas bound with x-model. decorative: aria-hidden (thumbnails). Used inside <x-nq::presentation-editor>. --}}
@props(['expr' => 'slide', 'editable' => false, 'decorative' => false])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $S = $expr;
    $ph = [
        'title' => $T('Slide title', 'عنوان الشريحة'), 'subtitle' => $T('Subtitle', 'عنوان فرعي'), 'author' => $T('Who said it', 'قائل الاقتباس'),
        'body' => $T('One bullet per line', 'نقطة في كل سطر'), 'quote' => $T('The quote', 'الاقتباس'),
        'left' => $T('Left column, one bullet per line', 'العمود الأول، نقطة في كل سطر'), 'right' => $T('Right column, one bullet per line', 'العمود الثاني، نقطة في كل سطر'),
    ];
    $areaClass = 'block w-full min-w-0 resize-none rounded-[0.6cqw] border-0 bg-transparent p-0 text-start text-[length:inherit] leading-[inherit] [field-sizing:content] placeholder:text-current placeholder:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-[0.6cqw] focus-visible:outline-nq-focus';
    // One text block: an auto-growing textarea while editing; a paragraph or bullet list when presenting.
    $text = function (string $field, string $placeholder, string $class, bool $bullets = false) use ($editable, $S, $areaClass) {
        $p = e($placeholder);
        if ($editable) {
            return '<textarea rows="1" dir="auto" x-model="'.$S.'.'.$field.'" placeholder="'.$p.'" aria-label="'.$p.'" class="'.e(\Nasaq\Cn::merge($areaClass, $class)).'"></textarea>';
        }
        if ($bullets) {
            return '<template x-if="lines('.$S.'.'.$field.').length"><ul dir="auto" class="'.e(\Nasaq\Cn::merge('list-disc space-y-[1cqw] ps-[3cqw] text-start marker:opacity-60', $class)).'"><template x-for="(l, i) in lines('.$S.'.'.$field.')" :key="i + l"><li x-text="l"></li></template></ul></template>';
        }
        return '<template x-if="lines('.$S.'.'.$field.').length"><p dir="auto" class="'.e(\Nasaq\Cn::merge('whitespace-pre-line text-start', $class)).'" x-text="'.$S.'.'.$field.'"></p></template>';
    };
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'slide') }}" :data-layout="{{ $S }}.layout" @if ($decorative) aria-hidden="true" @endif
    :class="themeClass({{ $S }})"
    {{ $attributes->except('data-slot')->cn('@container relative aspect-video w-full overflow-hidden') }}>
    <div class="absolute inset-0 p-[6cqw]">
        <template x-if="{{ $S }}.layout === 'title'">
            <div class="flex h-full flex-col justify-center gap-[2cqw]">
                {!! $text('title', $ph['title'], 'text-[6.4cqw] leading-[1.1] font-semibold') !!}
                {!! $text('subtitle', $ph['subtitle'], 'text-[2.8cqw] leading-snug opacity-75') !!}
            </div>
        </template>
        <template x-if="{{ $S }}.layout === 'section'">
            <div class="flex h-full flex-col justify-end gap-[1.5cqw]">
                {!! $text('title', $ph['title'], 'text-[5.6cqw] leading-[1.1] font-semibold') !!}
                {!! $text('subtitle', $ph['subtitle'], 'text-[2.4cqw] leading-snug opacity-75') !!}
            </div>
        </template>
        <template x-if="{{ $S }}.layout === 'content'">
            <div class="flex h-full flex-col gap-[3cqw]">
                {!! $text('title', $ph['title'], 'text-[4.2cqw] leading-[1.15] font-semibold') !!}
                {!! $text('body', $ph['body'], 'text-[2.6cqw] leading-snug', true) !!}
            </div>
        </template>
        <template x-if="{{ $S }}.layout === 'two-column'">
            <div class="flex h-full flex-col gap-[3cqw]">
                {!! $text('title', $ph['title'], 'text-[4.2cqw] leading-[1.15] font-semibold') !!}
                <div class="grid min-h-0 flex-1 grid-cols-2 gap-[4cqw]">
                    {!! $text('body', $ph['left'], 'text-[2.3cqw] leading-snug', true) !!}
                    {!! $text('body2', $ph['right'], 'text-[2.3cqw] leading-snug', true) !!}
                </div>
            </div>
        </template>
        <template x-if="{{ $S }}.layout === 'quote'">
            <div class="flex h-full flex-col justify-center gap-[3cqw] ps-[3cqw]">
                {!! $text('body', $ph['quote'], 'text-[3.8cqw] leading-[1.25] font-medium') !!}
                {!! $text('subtitle', $ph['author'], 'text-[2.2cqw] opacity-70') !!}
            </div>
        </template>
        <template x-if="{{ $S }}.layout === 'image'">
            <div class="flex h-full flex-col gap-[2.5cqw]">
                {!! $text('title', $ph['title'], 'text-[4.2cqw] leading-[1.15] font-semibold') !!}
                <div class="relative min-h-0 flex-1 overflow-hidden rounded-[1cqw] border border-current/15 bg-current/5">
                    <template x-if="safeImage({{ $S }}.image)">
                        <img :src="safeImage({{ $S }}.image)" :alt="{{ $S }}.imageAlt ?? ''" class="size-full object-cover" draggable="false">
                    </template>
                    <template x-if="!safeImage({{ $S }}.image)">
                        <div class="flex size-full flex-col items-center justify-center gap-[1cqw] text-[2cqw] opacity-50">
                            <x-lucide-image-off aria-hidden="true" class="size-[4cqw]" />
                            {{ $T('No image yet', 'لا توجد صورة بعد') }}
                        </div>
                    </template>
                </div>
            </div>
        </template>
    </div>
</div>
