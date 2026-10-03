<div class="flex w-full max-w-sm flex-col gap-4">
    <x-nq::inline-edit value="Launch plan" label="title" required :max-length="20" display-class="text-h3" />
    <x-nq::inline-edit value="" label="description" />
    <x-nq::inline-edit value="42" label="quantity" type="number" />
    <x-nq::inline-edit value="Read only" label="note" read-only />
</div>
