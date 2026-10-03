<?php

namespace Nasaq\Filament;

use Filament\Contracts\Plugin;
use Filament\Panel;
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;

/**
 * ->plugin(\Nasaq\Filament\NasaqPlugin::make()) on a panel loads the Nasaq stylesheet and the Alpine behaviours,
 * so <x-nq::*> components work in pages, widgets, infolists and custom form fields.
 *
 * Panels with a custom Tailwind theme can skip the stylesheet (->withoutStyles()) and @source the components instead.
 */
class NasaqPlugin implements Plugin
{
    protected bool $styles = true;

    public static function make(): static
    {
        return app(static::class);
    }

    public function getId(): string
    {
        return 'nasaq';
    }

    public function withoutStyles(): static
    {
        $this->styles = false;

        return $this;
    }

    public function register(Panel $panel): void
    {
        $assets = [Js::make('nasaq-alpine', __DIR__.'/../../resources/dist/nasaq-alpine.js')];
        if ($this->styles) {
            $assets[] = Css::make('nasaq', __DIR__.'/../../resources/dist/nasaq.unlayered.css');
        }
        FilamentAsset::register($assets, 'fadymondy/nasaq-php');
    }

    public function boot(Panel $panel): void {}
}
