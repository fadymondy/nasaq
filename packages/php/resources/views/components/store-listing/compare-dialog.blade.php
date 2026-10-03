{{-- <x-nq::store-listing.compare-dialog />   Listing-scoped. The compare table in a dialog; the listing opens it from the tray's Compare button (compareOpen).
     add: an Add to cart button per column (nq-compare-add-to-cart). --}}
@include('nasaq::components.store-listing._strings')
@props(['add' => false])
<x-nq::dialog x-model="compareOpen">
    <x-nq::dialog.content data-slot="store-compare-dialog" :close-label="nq_sl_t('close')" class="max-w-5xl">
        <div class="flex flex-col gap-1 pe-8">
            <x-nq::dialog.title>{{ nq_sl_t('compareTitle') }}</x-nq::dialog.title>
            <x-nq::dialog.description>{{ nq_sl_t('compareDescription') }}</x-nq::dialog.description>
        </div>
        <x-nq::store-listing.compare-table :add="$add" />
    </x-nq::dialog.content>
</x-nq::dialog>
