<x-nq::appearance-pickers class="max-w-2xl">
    <x-nq::appearance-pickers.theme-gallery
        default-value="paper"
        :themes="[
            ['id' => 'paper', 'label' => 'Paper', 'description' => 'Warm and bright', 'mode' => 'light', 'swatches' => ['#fbf8f3', '#efe9df', '#1f1b16', '#0a7a5a']],
            ['id' => 'ink', 'label' => 'Ink', 'description' => 'Easy on the eyes', 'mode' => 'dark', 'swatches' => ['#14110f', '#1f1b18', '#f1ebe3', '#3ecf9d']],
        ]"
    />
    <x-nq::appearance-pickers.reading-settings :default-value="['fontSize' => 'md', 'width' => 'normal', 'spacing' => 'normal']" />
    <x-nq::appearance-pickers.wallpaper-picker
        default-value="dawn"
        :dim="20"
        upload
        :wallpapers="[
            ['id' => 'dawn', 'label' => 'Dawn', 'background' => 'linear-gradient(135deg, #f6d365, #fda085)', 'group' => 'Gradients'],
            ['id' => 'sea', 'label' => 'Sea', 'background' => 'linear-gradient(135deg, #43cea2, #185a9d)', 'group' => 'Gradients'],
            ['id' => 'city', 'label' => 'City', 'background' => '/wallpapers/city.jpg', 'group' => 'Photos'],
        ]"
    />
</x-nq::appearance-pickers>
