<div class="flex flex-col gap-3">
    <h3 class="flex items-center gap-2">
        Revenue this month <x-nq::interim-badge />
    </h3>
    <h3 class="flex items-center gap-2">
        Orders today <x-nq::interim-badge label="Provisional" />
    </h3>
    <h3 class="flex items-center gap-2">
        Closed period <x-nq::interim-badge :pending="false" label="Final" />
    </h3>
</div>
