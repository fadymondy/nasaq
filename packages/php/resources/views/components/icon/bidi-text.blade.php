{{-- <x-nq::icon.bidi-text>...</x-nq::icon.bidi-text>  A block of user text whose direction follows its own first strong character. --}}
<p data-slot="{{ $attributes->get('data-slot', 'bidi-text') }}" dir="auto" {{ $attributes->except('data-slot')->cn('[unicode-bidi:plaintext] text-start') }}>{{ $slot }}</p>
