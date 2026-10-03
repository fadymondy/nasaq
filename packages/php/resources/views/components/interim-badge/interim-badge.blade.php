{{-- <x-nq::interim-badge />   <x-nq::interim-badge label="Provisional" />   <x-nq::interim-badge :pending="false" />
     Marks content that is partial and still arriving: a streamed answer, a total before every source reported, a draft figure.
     A small outlined badge with a spinner and a word, so it never relies on motion alone. label: default "Interim" / "مبدئي" by locale.
     pending: stop the spinner once nothing more is coming, keeping the badge (default true). Static: no Alpine needed. --}}
@props(['label' => null, 'pending' => true])
<x-nq::badge variant="outline" data-slot="{{ $attributes->get('data-slot', 'interim-badge') }}" :data-pending="$pending ? 'true' : null"
    {{ $attributes->except('data-slot')->cn('border-nq-brand/40 text-foreground') }}>
    @if ($pending)<x-nq::spinner class="size-3" />@endif
    {{ $label ?? \Nasaq\Nasaq::t('Interim', 'مبدئي') }}
</x-nq::badge>
