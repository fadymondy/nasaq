<?php

namespace Nasaq\Tests;

use Illuminate\Support\Facades\Blade;
use PHPUnit\Framework\Attributes\DataProvider;

class ComponentsTest extends TestCase
{
    public static function examples(): array
    {
        $out = [];
        foreach (glob(__DIR__.'/../examples/*.blade.php') as $file) {
            $out[basename($file, '.blade.php')] = [$file];
        }

        return $out;
    }

    #[DataProvider('examples')]
    public function test_example_renders_and_matches_the_committed_html(string $file): void
    {
        $html = preg_replace("/\n\s*\n+/", "\n", trim(Blade::render(file_get_contents($file))))."\n";
        $this->assertStringContainsString('data-slot=', $html);
        $rendered = dirname($file).'/rendered/'.basename($file, '.blade.php').'.html';
        $this->assertFileExists($rendered, 'run php scripts/render-examples.php');
        $this->assertSame(file_get_contents($rendered), $html, 'stale: run php scripts/render-examples.php');
    }

    public function test_every_component_has_an_example(): void
    {
        foreach (glob(__DIR__.'/../resources/views/components/*', GLOB_ONLYDIR) as $dir) {
            $this->assertFileExists(__DIR__.'/../examples/'.basename($dir).'.blade.php');
        }
    }

    public function test_button_overrides_and_loading(): void
    {
        $html = Blade::render('<x-nq::button class="h-12" loading>Go</x-nq::button>');
        $this->assertStringContainsString('aria-busy="true"', $html);
        $this->assertStringContainsString('data-slot="spinner"', $html);
        $this->assertDoesNotMatchRegularExpression('/class="[^"]*\bh-control\b/', $html);
        $this->assertMatchesRegularExpression('/class="[^"]*\bh-12\b/', $html);
    }

    public function test_date_time_accepts_iso_strings_with_an_offset(): void
    {
        $this->assertStringContainsString('datetime="2026-03-01T09:30:00+00:00"', Blade::render('<x-nq::numeric.date-time value="2026-03-01T09:30:00Z" />'));
        $this->assertStringContainsString('data-slot="date-time"', Blade::render('<x-nq::numeric.date-time value="2026-03-01T09:30:00+03:00" time-style="short" />'));
    }

    public function test_disabled_is_a_real_boolean(): void
    {
        $on = Blade::render('<x-nq::radio-group><x-nq::radio-group.card value="a" title="A" disabled /></x-nq::radio-group>');
        $this->assertMatchesRegularExpression('/<button[^>]*data-slot="radio-card"[^>]*\sdisabled\b/', preg_replace('/\s+/', ' ', $on));
        $off = Blade::render('<x-nq::radio-group :disabled="false"><x-nq::radio-group.radio value="a" :disabled="false" /></x-nq::radio-group>');
        $this->assertDoesNotMatchRegularExpression('/\sdata-disabled[\s>]/', $off);
    }

    public function test_compact_currency(): void
    {
        $this->assertStringContainsString('$48K', Blade::render('<x-nq::numeric :value="48200" style="currency" compact />'));
        $this->assertStringContainsString('1.2K', Blade::render('<x-nq::numeric :value="1240" compact />'));
        $this->assertStringContainsString('1M', Blade::render('<x-nq::numeric :value="999950" compact />'));
    }

    public function test_parts_take_a_data_slot_override_and_aware_props_are_optional(): void
    {
        $this->assertStringContainsString('data-slot="search-box"', Blade::render('<x-nq::input-group data-slot="search-box"><x-nq::input-group.input /></x-nq::input-group>'));
        $this->assertStringContainsString('name="email"', Blade::render('<x-nq::field.input name="email" />'));
        $this->assertStringContainsString('disabled', Blade::render('<x-nq::toggle-group><x-nq::toggle-group.toggle value="a" disabled>A</x-nq::toggle-group.toggle></x-nq::toggle-group>'));
    }

    public function test_arabic_currency_is_sar(): void
    {
        app()->setLocale('ar');
        $this->assertSame('SAR', \Nasaq\Nasaq::currency());
        app()->setLocale('en');
        $this->assertSame('USD', \Nasaq\Nasaq::currency());
    }
}
