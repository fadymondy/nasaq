<x-nq::branding-provider brand="#0A7C66" name="Acme Clinic" target="#branding-demo">
    <div id="branding-demo" class="flex items-center gap-4">
        <img x-show="logoUrl" x-bind:src="logoUrl" x-bind:alt="name" class="h-6" style="display: none">
        <span x-show="! logoUrl" x-text="name">Acme Clinic</span>
        <x-nq::button variant="primary">Book a visit</x-nq::button>
    </div>
</x-nq::branding-provider>
