<main class="flex flex-col gap-20">
    <x-nq::marketing-sections.app-mockup-hero id="mk-hero" title="Book seats in seconds" description="Plans, seat maps and payments in one place." mockup-label="The seat map" frame-title="app.example.com">
        <x-slot:actions><x-nq::button variant="primary" size="lg">Start free</x-nq::button></x-slot:actions>
        <div class="h-40 bg-nq-surface-soft"></div>
    </x-nq::marketing-sections.app-mockup-hero>
    <x-nq::marketing-sections.how-it-works id="mk-how" title="How it works" :steps="[['title' => 'Create'], ['title' => 'Share'], ['title' => 'Sell']]" />
    <x-nq::marketing-sections.feature-grid id="mk-features" title="Everything you need" :features="[['icon' => 'zap', 'title' => 'Fast', 'description' => 'Pages load at once.'], ['title' => 'Docs', 'href' => '/docs']]" />
    <x-nq::marketing-sections.pricing-packs id="mk-packs" title="Top up" :packs="[['id' => 's', 'name' => 'Starter', 'credits' => 500, 'price' => 9], ['id' => 'p', 'name' => 'Pro', 'credits' => 2500, 'bonus' => 250, 'price' => 39, 'highlighted' => true, 'badge' => 'Best value']]" />
    <x-nq::marketing-sections.session-playback id="mk-session" title="Booking assistant" :auto-play="false" height="14rem"
        :events="[['role' => 'user', 'text' => 'Summarise yesterday bookings.'], ['role' => 'tool', 'title' => 'Read bookings', 'text' => '42 rows'], ['role' => 'assistant', 'text' => 'You had 42 bookings, 6 more than the day before.']]" />
    <x-nq::marketing-sections.cta-banner id="mk-cta" title="Ready to start?" note="No card needed">
        <x-slot:action><x-nq::button variant="primary">Create account</x-nq::button></x-slot:action>
    </x-nq::marketing-sections.cta-banner>
    <x-nq::marketing-sections.grid-background id="mk-grid" pattern="dots" class="p-10"><p class="text-center">A quiet dot grid</p></x-nq::marketing-sections.grid-background>
</main>
