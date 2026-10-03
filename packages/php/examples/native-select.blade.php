<div class="flex flex-col gap-1.5">
    <label for="country" class="text-label text-foreground">Country</label>
    <x-nq::native-select id="country" name="country" value="" required placeholder="Choose a country"
        :options="[['value' => 'eg', 'label' => 'Egypt'], ['value' => 'sa', 'label' => 'Saudi Arabia']]" />
</div>
