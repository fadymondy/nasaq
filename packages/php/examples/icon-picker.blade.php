<div x-data="{ icon: null }" class="flex items-center gap-3">
    <x-nq::icon-picker x-model="icon" />
    <span class="text-body-sm text-muted-foreground" x-text="icon ?? 'No icon chosen'">No icon chosen</span>
</div>
<div class="flex items-center gap-3">
    <x-nq::icon-picker.by-name name="users" class="size-5" />
    <x-nq::icon-picker.by-name name="bx:home" class="text-xl" />
    <x-nq::icon-picker.by-name name="bxl-github" :size="20" />
    <x-nq::icon-picker.by-name name="/img/logo.svg" class="size-5" />
    <x-nq::icon-picker.by-name name="nope">no icon</x-nq::icon-picker.by-name>
</div>
