<?php

namespace Nasaq;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Illuminate\View\ComponentAttributeBag;

/**
 * Registers the Blade components as <x-nq::name>, the @nasaqStyles / @nasaqScripts directives and the
 * publishable assets (the precompiled stylesheet and the Alpine behaviours).
 */
class NasaqServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/nasaq.php', 'nasaq');
    }

    public function boot(): void
    {
        Blade::anonymousComponentPath(__DIR__.'/../resources/views/components', 'nq');
        // $attributes->cn([...]) : the component's classes first, the caller's class="" last, conflicts resolved (see Cn).
        ComponentAttributeBag::macro('cn', function (array|string $classes): ComponentAttributeBag {
            /** @var ComponentAttributeBag $this */
            $merged = Cn::merge(Arr::toCssClasses(Arr::wrap($classes)), (string) $this->get('class', ''));

            return (new ComponentAttributeBag(['class' => $merged]))->merge($this->except('class')->getAttributes());
        });
        // $attributes->flag('disabled') : a boolean attribute is on for `disabled`, `disabled="disabled"` and `:disabled="true"`, off for `:disabled="false"`.
        ComponentAttributeBag::macro('flag', function (string $name): bool {
            /** @var ComponentAttributeBag $this */
            $v = $this->get($name, false);

            return $v === true || $v === '' || $v === $name || $v === 1 || $v === '1' || $v === 'true';
        });
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'nasaq');

        Blade::directive('nasaqStyles', fn () => '<?php echo \Nasaq\Nasaq::styles(); ?>');
        Blade::directive('nasaqScripts', fn () => '<?php echo \Nasaq\Nasaq::scripts(); ?>');

        if ($this->app->runningInConsole()) {
            $this->publishes([__DIR__.'/../config/nasaq.php' => config_path('nasaq.php')], 'nasaq-config');
            $this->publishes([__DIR__.'/../resources/dist' => public_path('vendor/nasaq')], ['nasaq-assets', 'laravel-assets']);
            $this->publishes([__DIR__.'/../resources/views/components' => resource_path('views/vendor/nasaq/components')], 'nasaq-views');
        }
    }
}
