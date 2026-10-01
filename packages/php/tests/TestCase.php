<?php

namespace Nasaq\Tests;

use Orchestra\Testbench\TestCase as Base;

abstract class TestCase extends Base
{
    /** The moment examples are rendered at (scripts/render-examples.php uses it too). */
    public const NOW = '2026-09-29 09:00:00';

    protected function setUp(): void
    {
        parent::setUp();
        self::freeze();
    }

    /**
     * Make a render repeatable: a fixed clock (relative times, "today") and a counter in place of Str::random
     * (generated ids). Called before every test and before every example in scripts/render-examples.php.
     */
    public static function freeze(): void
    {
        \Illuminate\Support\Carbon::setTestNow(self::NOW);
        $i = 0;
        \Illuminate\Support\Str::createRandomStringsUsing(function (int $length) use (&$i): string {
            return str_pad(base_convert((string) ++$i, 10, 36), $length, '0', STR_PAD_LEFT);
        });
    }

    protected function getPackageProviders($app): array
    {
        return [
            \BladeUI\Icons\BladeIconsServiceProvider::class,
            \MallardDuck\LucideIcons\BladeLucideIconsServiceProvider::class,
            \Nasaq\NasaqServiceProvider::class,
        ];
    }
}
