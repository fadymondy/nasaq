<div x-data="{ icon: null }" class="flex items-center gap-3">
    <x-nq::icon-picker x-model="icon" />
    <span class="text-body-sm text-muted-foreground" x-text="icon ?? 'No icon chosen'">No icon chosen</span>
</div>
