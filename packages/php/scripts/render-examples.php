<?php

// Renders every examples/<name>.blade.php through a real Laravel app (Orchestra Testbench) into
// examples/rendered/<name>.html. The lab shows that HTML (live, with Alpine) on each component's HTML tab,
// and the MCP serves it for plain-HTML projects.
//
//   php scripts/render-examples.php            all examples
//   php scripts/render-examples.php button     only these

require __DIR__.'/../vendor/autoload.php';

use Illuminate\Support\Facades\Blade;
use Orchestra\Testbench\Foundation\Application;

$app = Application::create(basePath: null, options: ["extra" => ["providers" => [
    \BladeUI\Icons\BladeIconsServiceProvider::class,
    \MallardDuck\LucideIcons\BladeLucideIconsServiceProvider::class,
    \Nasaq\NasaqServiceProvider::class,
]]]);

$root = dirname(__DIR__);
$only = array_slice($argv, 1);
$failed = 0;
foreach (glob($root.'/examples/*.blade.php') as $file) {
    $name = basename($file, '.blade.php');
    if ($only && ! in_array($name, $only, true)) {
        continue;
    }
    try {
        // Fixed clock and ids, so the output only changes when the component does (see TestCase::freeze).
        \Nasaq\Tests\TestCase::freeze();
        $html = Blade::render(file_get_contents($file));
        // Collapse the blank lines Blade leaves behind @php / @if blocks.
        $html = preg_replace("/\n\s*\n+/", "\n", trim($html))."\n";
        file_put_contents($root.'/examples/rendered/'.$name.'.html', $html);
    } catch (Throwable $e) {
        $failed++;
        fwrite(STDERR, "✗ {$name}: ".$e->getMessage()."\n");
    }
}
echo $failed ? "{$failed} failed\n" : "rendered\n";
exit($failed ? 1 : 0);
