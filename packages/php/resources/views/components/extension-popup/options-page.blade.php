{{-- <x-nq::extension-popup.options-page title="Settings" :sections="[['id' => 'general', 'title' => 'General']]" :save="true"> <x-slot:general> rows </x-slot:general> </x-nq::extension-popup.options-page>
     The extension's options page: a centred column of titled sections and a save bar that says what state it is in.
     sections: id, title, description?; each section's body is the slot named after its id. The mark and name above the title is the brand slot.
     save shows the sticky save bar. dirty says whether there is anything to save (it is x-modelable); typing or changing any control inside also marks it dirty.
     Save dispatches a bubbling "nq-save" event with detail { wait(promise) }; a promise resolving to nothing marks it saved, one resolving to { error } shows the message.
     labels: override any string (save, saved, unsaved). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['title', 'description' => null, 'sections' => [], 'save' => false, 'dirty' => false, 'labels' => [], 'brand' => null])
@php
    use Nasaq\Nasaq;

    $t = array_merge([
        'save' => Nasaq::t('Save changes', 'حفظ التغييرات'),
        'saved' => Nasaq::t('Saved', 'تم الحفظ'),
        'unsaved' => Nasaq::t('Unsaved changes', 'تغييرات غير محفوظة'),
    ], (array) $labels);
    $dirty = (bool) $dirty;
@endphp
<div data-slot="extension-options" x-data="nqExtensionOptions(@js(['dirty' => $dirty, 'saved' => $t['saved'], 'unsaved' => $t['unsaved']]))" x-modelable="dirty"
    x-on:input="touch()" x-on:change="touch()" {{ $attributes->cn('mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 text-foreground sm:p-6') }}>
    <header class="flex flex-col gap-1">
        @if ($brand && ! $brand->isEmpty())<div class="mb-2 flex items-center gap-2 text-label font-semibold">{{ $brand }}</div>@endif
        <h1 class="text-h1">{{ $title }}</h1>
        @if ($description)<p class="text-body text-muted-foreground">{{ $description }}</p>@endif
    </header>
    @foreach ($sections as $section)
        <section aria-labelledby="{{ $section['id'] }}-title" class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div class="flex flex-col gap-0.5">
                <h2 id="{{ $section['id'] }}-title" class="text-h3">{{ $section['title'] }}</h2>
                @if (! empty($section['description']))<p class="text-caption text-muted-foreground">{{ $section['description'] }}</p>@endif
            </div>
            {{ $__data[$section['id']] ?? '' }}
        </section>
    @endforeach
    @if ($save)
        <div class="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/90 py-3 backdrop-blur">
            <x-nq::button variant="primary" x-on:click="save()" x-bind:disabled="!dirty || saving" x-bind:aria-busy="saving ? 'true' : undefined">
                <span x-show="saving" x-cloak style="display: none"><x-nq::spinner /></span>
                {{ $t['save'] }}
            </x-nq::button>
            <span role="status" class="text-caption" x-bind:class="error ? 'text-nq-danger-text' : 'text-muted-foreground'" x-text="message()">{{ $dirty ? $t['unsaved'] : $t['saved'] }}</span>
        </div>
    @endif
</div>
