<div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
        <x-nq::focus-status state="focus" :seconds="754" />
        <x-nq::focus-status.avatar name="Fady Mondy" state="focus" />
    </div>
    <x-nq::focus-status.do-not-disturb checked until="6:00 PM" class="max-w-md" />
</div>
