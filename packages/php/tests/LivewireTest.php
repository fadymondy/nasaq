<?php

namespace Nasaq\Tests;

use Livewire\Livewire;
use Livewire\LivewireServiceProvider;
use Nasaq\Tests\Livewire\FormComponent;

class LivewireTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [...parent::getPackageProviders($app), LivewireServiceProvider::class];
    }

    protected function getEnvironmentSetUp($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
    }

    /** The opening tag of the element carrying data-slot="$slot" that has the given wire:model attribute. */
    private function tagWith(string $html, string $slot, string $needle): ?string
    {
        preg_match_all('/<[a-z0-9-]+\b[^>]*data-slot="'.preg_quote($slot, '/').'"[^>]*>/s', $html, $m);
        foreach ($m[0] as $tag) {
            if (str_contains($tag, $needle)) {
                return $tag;
            }
        }

        return null;
    }

    public static function bindings(): array
    {
        // [data-slot, wire attribute, the element x-modelable / the native control carries it]
        return [
            'input' => ['input', 'wire:model.live="name"', null],
            'textarea' => ['textarea', 'wire:model="bio"', null],
            'checkbox' => ['checkbox', 'wire:model="agree"', 'x-modelable="checked"'],
            'switch' => ['switch', 'wire:model.live="alerts"', 'x-modelable="checked"'],
            'radio-group' => ['radio-group', 'wire:model="contact"', 'x-modelable="value"'],
            'select' => ['select', 'wire:model="type"', 'x-modelable="value"'],
            'dialog' => ['dialog', 'wire:model="open"', 'x-modelable="open"'],
            'date-picker' => ['date-picker', 'wire:model="date"', 'x-modelable="date"'],
            'data-table' => ['data-table', 'wire:model="rows"', 'x-modelable="rows"'],
        ];
    }

    /** @dataProvider bindings */
    #[\PHPUnit\Framework\Attributes\DataProvider('bindings')]
    public function test_wire_model_lands_on_the_right_element_and_survives_rerender(string $slot, string $wire, ?string $modelable): void
    {
        $c = Livewire::test(FormComponent::class);
        $tag = $this->tagWith($c->html(), $slot, $wire);
        $this->assertNotNull($tag, "$slot lost $wire");
        if ($modelable) {
            $this->assertStringContainsString($modelable, $tag, "$slot: wire:model must sit on the x-modelable root");
        }

        $c->set('name', 'Nasaq UI')->set('bio', 'Hello')->set('agree', true)->set('alerts', false)->set('contact', 'sms')->set('type', 'feature')->set('open', true)->set('date', '2026-10-01');
        $after = $this->tagWith($c->html(), $slot, $wire);
        $this->assertNotNull($after, "$slot lost $wire after a re-render");
    }

    public function test_native_select_puts_wire_model_on_the_select_not_the_wrapper(): void
    {
        $html = Livewire::test(FormComponent::class)->html();
        $this->assertMatchesRegularExpression('/<select\b[^>]*wire:model\.live="country"/', $html);
        $this->assertDoesNotMatchRegularExpression('/<div[^>]*data-slot="native-select"[^>]*wire:model/', $html);
    }

    public function test_slider_forwards_wire_model(): void
    {
        $html = Livewire::test(FormComponent::class)->set('volume', 70)->html();
        $this->assertStringContainsString('wire:model.live="volume"', $html);
        $this->assertStringContainsString('x-modelable', $html);
    }

    public function test_the_root_is_not_wire_ignored_so_state_flows_both_ways(): void
    {
        $html = Livewire::test(FormComponent::class)->html();
        $this->assertStringNotContainsString('wire:ignore', $html);
    }

    public function test_server_state_is_rendered_initially_for_a_model_bound_value(): void
    {
        $c = Livewire::test(FormComponent::class)->set('alerts', true);
        $tag = $this->tagWith($c->html(), 'switch', 'wire:model.live="alerts"');
        $this->assertStringContainsString('data-checked', $tag);
    }

    public function test_scripts_directive_registers_on_alpine_init_without_starting_alpine(): void
    {
        $js = file_get_contents(__DIR__.'/../resources/dist/nasaq-alpine.js');
        $this->assertStringContainsString('alpine:init', $js);
        $this->assertStringNotContainsString('Alpine.start()', $js);
        // deferred, so it runs before Livewire's Alpine boots on DOMContentLoaded
        $this->assertStringContainsString('<script defer', \Nasaq\Nasaq::scripts());
    }
}
