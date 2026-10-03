<div class="flex flex-col items-start gap-6">
    <h2 class="text-h2">Ship <x-nq::text-effects.text-flip id="fx-flip" :phrases="['faster', 'safer', 'together']" /></h2>
    <x-nq::text-effects.text-shimmer id="fx-shimmer">Thinking it through</x-nq::text-effects.text-shimmer>
    <x-nq::text-effects.text-reveal id="fx-reveal" text="Words fade and rise into place as you scroll." immediate />
    <x-nq::text-effects.text-reveal id="fx-reveal-scroll" text="Hidden until seen" />
    <p>Mark <x-nq::text-effects.handwritten-mark id="fx-mark" kind="underline">the important part</x-nq::text-effects.handwritten-mark> by hand.</p>
    <p>And <x-nq::text-effects.handwritten-mark id="fx-mark-still" kind="circle" :animate="false">this</x-nq::text-effects.handwritten-mark> too.</p>
    <x-nq::text-effects.handwritten-note id="fx-note" author="Fady">Remember to say thanks.</x-nq::text-effects.handwritten-note>
    <x-nq::text-effects.marquee id="fx-marquee" class="w-full"><span class="px-4">Fast</span><span class="px-4">Bilingual</span><span class="px-4">Accessible</span></x-nq::text-effects.marquee>
</div>
