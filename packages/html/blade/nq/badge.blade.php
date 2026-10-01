{{-- <x-nq.badge variant="success">Paid</x-nq.badge>   <x-nq.badge tag="teal">New</x-nq.badge>
     variant: secondary | outline | brand | accent | success | warning | danger | info   tag: gray | blue | green | amber | orange | red | pink | violet | teal --}}
@props(['variant' => 'secondary', 'tag' => null])
<span {{ $attributes->merge(['class' => 'nq-badge'])->merge($tag ? ['data-tag' => $tag] : ['data-variant' => $variant]) }}>{{ $slot }}</span>
