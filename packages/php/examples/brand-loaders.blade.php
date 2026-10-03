<div class="flex flex-col items-start gap-6">
    <div class="flex items-center gap-6">
        <x-nq::brand-loaders.braille class="text-h3" />
        <x-nq::brand-loaders.logo :size="40" variant="pulse" />
        <x-nq::brand-loaders.logo :size="40" :value="60" />
    </div>
    <x-nq::brand-loaders.dot-matrix :value="62" />
    <x-nq::brand-loaders class="min-h-0 w-full rounded-card border border-border" name="Nasaq" stage="Loading your workspace" :progress="40" />
    <x-nq::brand-loaders class="min-h-0 w-full rounded-card border border-border" state="failed" name="Nasaq" :error="['message' => 'We could not reach the server.', 'detail' => 'req_8f2a91']" retry />
</div>
