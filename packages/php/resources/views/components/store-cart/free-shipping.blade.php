{{-- <x-nq::store-cart.free-shipping />
     "You are $35 away from free shipping" over a progress bar; turns green and reads "You have free shipping" at the threshold (data-unlocked).
     Inside the cart or mini cart, which needs free-shipping-threshold (minor units). Needs the Alpine runtime (@nasaqScripts). --}}
<div data-slot="{{ $attributes->get('data-slot', 'store-free-shipping') }}" x-bind:data-unlocked="freeUnlocked ? '' : null" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
    <p class="flex items-center gap-2 text-body-sm text-foreground">
        <x-lucide-truck aria-hidden="true" x-bind:class="freeUnlocked ? 'text-nq-success-text' : 'text-muted-foreground'" class="size-4 shrink-0" />
        <span x-text="freeText"></span>
    </p>
    <div role="progressbar" aria-label="{{ \Nasaq\Nasaq::t('Progress to free shipping', 'التقدم نحو الشحن المجاني') }}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
        x-bind:aria-valuenow="freePercent" data-slot="progress" class="flex w-full flex-col gap-1.5">
        <div data-slot="progress-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
            <div data-slot="progress-indicator" style="inset-inline-start: 0; width: 0%" x-bind:style="{ width: freePercent + '%' }" x-bind:class="freeUnlocked ? 'bg-nq-success' : 'bg-primary'"
                class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
        </div>
    </div>
</div>
