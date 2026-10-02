{{-- <x-nq::icon.ltr>a@b.co</x-nq::icon.ltr>  Isolates left-to-right content (codes, emails, URLs, numbers with units) inside RTL text. --}}
<span data-slot="{{ $attributes->get('data-slot', 'ltr') }}" dir="ltr" {{ $attributes->except('data-slot')->cn('[unicode-bidi:isolate]') }}>{{ $slot }}</span>
