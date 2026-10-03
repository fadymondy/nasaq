{{-- Internal: the search box, category chips and access filter of <x-nq::api-reference>, bound to its scope (query, categoryValue, accessValue). --}}
@props(['categories' => []])
@php($t = \Nasaq\Nasaq::class)
<div data-slot="api-reference-filters" class="flex flex-col gap-3">
    <div class="relative">
        <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <x-nq::field.input type="search" x-model="query" placeholder="{{ $t::t('Search tools', 'ابحث في الأدوات') }}" aria-label="{{ $t::t('Search tools', 'ابحث في الأدوات') }}" class="ps-8" />
    </div>
    @if (count($categories) > 1)
        <x-nq::chip-group x-model="categoryValue" default-value="all" aria-label="{{ $t::t('Tools', 'الأدوات') }}">
            <x-nq::chip-group.chip value="all">{{ $t::t('All', 'الكل') }}</x-nq::chip-group.chip>
            @foreach ($categories as $c)
                <x-nq::chip-group.chip :value="$c">{{ $c }}</x-nq::chip-group.chip>
            @endforeach
        </x-nq::chip-group>
    @endif
    <x-nq::toggle-group x-model="accessValue" :default-value="['all']" aria-label="{{ $t::t('Access', 'الوصول') }}" class="flex-wrap">
        <x-nq::toggle-group.toggle value="all">{{ $t::t('Any access', 'أي وصول') }}</x-nq::toggle-group.toggle>
        @foreach (["read" => $t::t("Read only", "قراءة فقط"), "write" => $t::t("Changes data", "يغيّر البيانات"), "destructive" => $t::t("Destructive", "مدمّر")] as $level => $levelLabel)
            <x-nq::toggle-group.toggle :value="$level" :data-level="$level" x-bind:disabled="none($el.dataset.level)" x-bind:data-disabled="none($el.dataset.level) ? '' : null">{{ $levelLabel }}</x-nq::toggle-group.toggle>
        @endforeach
    </x-nq::toggle-group>
</div>
